import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

class AudioProcessor {
  constructor(tempDir = './temp') {
    this.tempDir = tempDir;
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Errore creazione directory temp:', error);
    }
  }

  // Ottieni informazioni sul file audio
  async getAudioInfo(filePath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(new Error(`Errore analisi audio: ${err.message}`));
          return;
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        if (!audioStream) {
          reject(new Error('Nessun stream audio trovato nel file'));
          return;
        }

        resolve({
          duration: parseFloat(metadata.format.duration),
          size: parseInt(metadata.format.size),
          format: metadata.format.format_name,
          bitrate: parseInt(metadata.format.bit_rate),
          sampleRate: audioStream.sample_rate,
          channels: audioStream.channels,
          codec: audioStream.codec_name
        });
      });
    });
  }

  // Dividi audio in segmenti
  async splitAudio(inputPath, segmentDurationMinutes = 10, maxSizeMB = 24) {
    const audioInfo = await this.getAudioInfo(inputPath);
    const totalDuration = audioInfo.duration;
    const segmentDuration = segmentDurationMinutes * 60; // converti in secondi
    
    const segments = [];
    const sessionId = uuidv4();
    const inputExt = path.extname(inputPath);
    
    // Calcola numero di segmenti necessari
    const numSegments = Math.ceil(totalDuration / segmentDuration);
    
    console.log(`Dividendo audio in ${numSegments} segmenti di ${segmentDurationMinutes} minuti`);

    for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration;
      const endTime = Math.min((i + 1) * segmentDuration, totalDuration);
      const segmentPath = path.join(this.tempDir, `${sessionId}_segment_${i}${inputExt}`);

      await this.extractSegment(inputPath, segmentPath, startTime, endTime - startTime);
      
      // Verifica dimensione del segmento
      const stats = await fs.stat(segmentPath);
      const sizeMB = stats.size / (1024 * 1024);
      
      if (sizeMB > maxSizeMB) {
        console.warn(`Segmento ${i} troppo grande (${sizeMB.toFixed(1)}MB), potrebbe essere necessario ridurre la durata`);
      }

      segments.push({
        index: i,
        path: segmentPath,
        startTime,
        endTime,
        duration: endTime - startTime,
        sizeMB: sizeMB.toFixed(2)
      });
    }

    return {
      sessionId,
      segments,
      totalDuration,
      originalInfo: audioInfo
    };
  }

  // Estrai un segmento specifico
  async extractSegment(inputPath, outputPath, startTime, duration) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .audioCodec('libmp3lame') // Converti sempre in MP3 per compatibilità
        .audioBitrate('128k') // Bitrate ottimizzato per Whisper
        .audioChannels(1) // Mono per ridurre dimensioni
        .output(outputPath)
        .on('end', () => {
          console.log(`Segmento creato: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`Errore creazione segmento: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  // Converti audio in formato ottimizzato per Whisper
  async optimizeForWhisper(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .audioChannels(1)
        .audioFrequency(16000) // 16kHz è ottimale per speech recognition
        .output(outputPath)
        .on('end', () => {
          console.log(`Audio ottimizzato: ${outputPath}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`Errore ottimizzazione: ${err.message}`);
          reject(err);
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

  // Unisci trascrizioni di segmenti
  mergeTranscriptions(segments, transcriptions) {
    return segments.map((segment, index) => ({
      segmentIndex: segment.index,
      startTime: segment.startTime,
      endTime: segment.endTime,
      text: transcriptions[index] || '',
      duration: segment.duration
    })).sort((a, b) => a.segmentIndex - b.segmentIndex);
  }
}

export default AudioProcessor;