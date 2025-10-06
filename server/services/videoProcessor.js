import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

class VideoProcessor {
  constructor(tempDir = './temp') {
    this.tempDir = tempDir;
    this.supportedVideoFormats = [
      'mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv', 'm4v', '3gp', 'ogv', 'mts', 'mxf'
    ];
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Errore creazione directory temp:', error);
    }
  }

  // Verifica se il file è un video
  isVideoFile(filename) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return this.supportedVideoFormats.includes(ext);
  }

  // Ottieni informazioni dettagliate sul video
  async getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Errore analisi video: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

        if (!videoStream) {
          reject(new Error('Nessun stream video trovato nel file'));
          return;
        }

        resolve({
          duration: parseFloat(metadata.format.duration),
          size: parseInt(metadata.format.size),
          format: metadata.format.format_name,
          bitrate: parseInt(metadata.format.bit_rate),
          
          // Info video
          videoCodec: videoStream.codec_name,
          width: videoStream.width,
          height: videoStream.height,
          fps: eval(videoStream.r_frame_rate) || 30,
          videoBitrate: parseInt(videoStream.bit_rate) || 0,
          
          // Info audio
          hasAudio: !!audioStream,
          audioCodec: audioStream?.codec_name,
          audioSampleRate: audioStream?.sample_rate,
          audioChannels: audioStream?.channels,
          audioBitrate: parseInt(audioStream?.bit_rate) || 0,
          
          // Metadati
          title: metadata.format.tags?.title,
          artist: metadata.format.tags?.artist,
          album: metadata.format.tags?.album,
          year: metadata.format.tags?.date
        });
      });
    });
  }

  // Estrai audio dal video
  async extractAudio(inputPath, options = {}) {
    const sessionId = uuidv4();
    const outputFilename = `extracted_audio_${sessionId}.mp3`;
    const outputPath = path.join(this.tempDir, outputFilename);

    const {
      format = 'mp3',
      quality = '128k',
      channels = 1, // Mono per ottimizzare per speech recognition
      sampleRate = 16000, // Ottimale per Whisper
      startTime = null,
      duration = null
    } = options;

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .noVideo() // Rimuovi stream video
        .audioCodec('libmp3lame')
        .audioBitrate(quality)
        .audioChannels(channels)
        .audioFrequency(sampleRate)
        .output(outputPath);

      // Aggiungi filtri temporali se specificati
      if (startTime !== null) {
        command = command.seekInput(startTime);
      }
      
      if (duration !== null) {
        command = command.duration(duration);
      }

      command
        .on('start', (commandLine) => {
          console.log('Comando FFmpeg:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`Estrazione audio: ${progress.percent?.toFixed(1) || 0}%`);
        })
        .on('end', async () => {
          try {
            const stats = await fs.stat(outputPath);
            console.log(`Audio estratto: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
            
            resolve({
              sessionId,
              audioPath: outputPath,
              filename: outputFilename,
              size: stats.size,
              format: format,
              sampleRate: sampleRate,
              channels: channels,
              bitrate: quality
            });
          } catch (error) {
            reject(new Error(`Errore verifica file estratto: ${error.message}`));
          }
        })
        .on('error', (err) => {
          console.error(`Errore estrazione audio: ${err.message}`);
          reject(new Error(`Estrazione audio fallita: ${err.message}`));
        })
        .run();
    });
  }

  // Estrai audio con segmentazione automatica per file grandi
  async extractAudioWithSegmentation(inputPath, segmentDurationMinutes = 10, maxSizeMB = 24) {
    const videoInfo = await this.getVideoInfo(inputPath);
    
    if (!videoInfo.hasAudio) {
      throw new Error('Il video non contiene traccia audio');
    }

    const totalDuration = videoInfo.duration;
    const segmentDuration = segmentDurationMinutes * 60;
    const numSegments = Math.ceil(totalDuration / segmentDuration);
    
    console.log(`Estraendo audio in ${numSegments} segmenti di ${segmentDurationMinutes} minuti`);

    const sessionId = uuidv4();
    const segments = [];

    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration;
      const endTime = Math.min((i + 1) * segmentDuration, totalDuration);
      const segmentDurationActual = endTime - startTime;

      console.log(`Estraendo segmento ${i + 1}/${numSegments}: ${startTime}s - ${endTime}s`);

      const result = await this.extractAudio(inputPath, {
        startTime: startTime,
        duration: segmentDurationActual,
        format: 'mp3',
        quality: '128k',
        channels: 1,
        sampleRate: 16000
      });

      // Rinomina il file per includere info segmento
      const segmentFilename = `${sessionId}_segment_${i}.mp3`;
      const segmentPath = path.join(this.tempDir, segmentFilename);
      await fs.rename(result.audioPath, segmentPath);

      segments.push({
        index: i,
        path: segmentPath,
        filename: segmentFilename,
        startTime: startTime,
        endTime: endTime,
        duration: segmentDurationActual,
        size: result.size,
        sizeMB: (result.size / 1024 / 1024).toFixed(2)
      });
    }

    return {
      sessionId,
      segments,
      totalDuration,
      originalVideoInfo: videoInfo,
      extractionMethod: 'segmented'
    };
  }

  // Genera thumbnail dal video
  async generateThumbnail(inputPath, options = {}) {
    const {
      timeOffset = '50%', // Posizione temporale (secondi o percentuale)
      width = 320,
      height = 240,
      format = 'jpg'
    } = options;

    const sessionId = uuidv4();
    const thumbnailFilename = `thumbnail_${sessionId}.${format}`;
    const thumbnailPath = path.join(this.tempDir, thumbnailFilename);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .screenshots({
          timestamps: [timeOffset],
          filename: thumbnailFilename,
          folder: this.tempDir,
          size: `${width}x${height}`
        })
        .on('end', () => {
          console.log(`Thumbnail generato: ${thumbnailPath}`);
          resolve({
            sessionId,
            thumbnailPath,
            filename: thumbnailFilename,
            width,
            height
          });
        })
        .on('error', (err) => {
          console.error(`Errore generazione thumbnail: ${err.message}`);
          reject(new Error(`Generazione thumbnail fallita: ${err.message}`));
        });
    });
  }

  // Converti video in formato ottimizzato
  async optimizeVideo(inputPath, options = {}) {
    const {
      maxWidth = 1280,
      maxHeight = 720,
      videoBitrate = '1000k',
      audioBitrate = '128k',
      format = 'mp4'
    } = options;

    const sessionId = uuidv4();
    const outputFilename = `optimized_${sessionId}.${format}`;
    const outputPath = path.join(this.tempDir, outputFilename);

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(videoBitrate)
        .audioBitrate(audioBitrate)
        .size(`${maxWidth}x${maxHeight}`)
        .autopad()
        .output(outputPath)
        .on('progress', (progress) => {
          console.log(`Ottimizzazione video: ${progress.percent?.toFixed(1) || 0}%`);
        })
        .on('end', async () => {
          try {
            const stats = await fs.stat(outputPath);
            console.log(`Video ottimizzato: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
            
            resolve({
              sessionId,
              videoPath: outputPath,
              filename: outputFilename,
              size: stats.size
            });
          } catch (error) {
            reject(new Error(`Errore verifica video ottimizzato: ${error.message}`));
          }
        })
        .on('error', (err) => {
          console.error(`Errore ottimizzazione video: ${err.message}`);
          reject(new Error(`Ottimizzazione video fallita: ${err.message}`));
        })
        .run();
    });
  }

  // Pulisci file temporanei
  async cleanup(sessionId) {
    try {
      const files = await fs.readdir(this.tempDir);
      const sessionFiles = files.filter(file => file.includes(sessionId));
      
      for (const file of sessionFiles) {
        await fs.unlink(path.join(this.tempDir, file));
        console.log(`File temporaneo eliminato: ${file}`);
      }
    } catch (error) {
      console.error('Errore pulizia file temporanei:', error);
    }
  }

  // Ottieni formati supportati
  getSupportedFormats() {
    return {
      video: [...this.supportedVideoFormats],
      audio: ['mp3', 'wav', 'aac', 'ogg', 'flac']
    };
  }
}

export default VideoProcessor;