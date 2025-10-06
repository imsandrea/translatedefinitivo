import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import VideoProcessor from '../services/videoProcessor.js';
import AudioProcessor from '../services/audioProcessor.js';
import WhisperService from '../services/whisperService.js';

const router = express.Router();
const videoProcessor = new VideoProcessor();
const audioProcessor = new AudioProcessor();
const whisperService = new WhisperService(process.env.OPENAI_API_KEY);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024
  }
});

router.post('/transcribe', upload.single('file'), async (req, res) => {
  let tempFilePath = null;
  let audioFilePath = null;
  let segmentPaths = [];

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const {
      language = 'it',
      chunkDurationMinutes = 10,
      temperature = 0,
      prompt = ''
    } = req.body;

    console.log(`🚀 [SERVER] Inizio trascrizione smart: ${req.file.originalname}`);
    console.log(`📊 [SERVER] Dimensione file: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`);

    const tempDir = './temp';
    await fs.mkdir(tempDir, { recursive: true });

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    tempFilePath = path.join(tempDir, `upload_${Date.now()}${fileExt}`);
    await fs.writeFile(tempFilePath, req.file.buffer);

    const isVideo = videoProcessor.isVideoFile(req.file.originalname);

    if (isVideo) {
      console.log('🎬 [SERVER] File video rilevato - estrazione audio...');

      const videoInfo = await videoProcessor.getVideoInfo(tempFilePath);
      console.log(`�� [SERVER] Info video:`, {
        duration: videoInfo.duration,
        hasAudio: videoInfo.hasAudio
      });

      if (!videoInfo.hasAudio) {
        throw new Error('Il video non contiene traccia audio');
      }

      const fileSizeMB = req.file.size / (1024 * 1024);
      const estimatedAudioMB = (videoInfo.audioBitrate || 128000) * videoInfo.duration / 8 / 1024 / 1024;

      console.log(`📊 [SERVER] Audio stimato: ${estimatedAudioMB.toFixed(2)}MB`);

      if (estimatedAudioMB > 24 || videoInfo.duration > (chunkDurationMinutes * 60)) {
        console.log(`✂️ [SERVER] Video grande - estrazione con segmentazione...`);

        const result = await videoProcessor.extractAudioWithSegmentation(
          tempFilePath,
          chunkDurationMinutes,
          24
        );

        segmentPaths = result.segments.map(s => s.path);
        console.log(`✅ [SERVER] Estratti ${result.segments.length} segmenti audio dal video`);

        const transcriptionResults = [];

        for (let i = 0; i < result.segments.length; i++) {
          const segment = result.segments[i];

          console.log(`🎯 [SERVER] Trascrivendo segmento ${i + 1}/${result.segments.length}...`);

          try {
            const transcription = await whisperService.transcribeFile(segment.path, {
              language,
              response_format: 'verbose_json',
              temperature,
              prompt
            });

            transcriptionResults.push({
              segmentIndex: i,
              startTime: segment.startTime,
              endTime: segment.endTime,
              duration: segment.duration,
              text: transcription.text,
              segments: transcription.segments || [],
              language: transcription.language,
              success: true
            });

            console.log(`✅ [SERVER] Segmento ${i + 1} completato: ${transcription.text.length} caratteri`);

          } catch (error) {
            console.error(`❌ [SERVER] Errore segmento ${i + 1}:`, error.message);
            transcriptionResults.push({
              segmentIndex: i,
              startTime: segment.startTime,
              endTime: segment.endTime,
              duration: segment.duration,
              text: '',
              error: error.message,
              success: false
            });
          }
        }

        const combinedResult = whisperService.combineResults(transcriptionResults);

        await cleanup(tempFilePath, null, segmentPaths);

        return res.json({
          success: true,
          type: 'video_segmented',
          transcription: combinedResult.fullText,
          detailedSegments: combinedResult.segments,
          stats: {
            totalSegments: combinedResult.totalSegments,
            successfulSegments: combinedResult.successfulSegments,
            failedSegments: combinedResult.failedSegments,
            totalWords: combinedResult.totalWords,
            duration: combinedResult.estimatedDuration
          },
          originalVideoInfo: result.originalVideoInfo
        });

      } else {
        console.log(`🎵 [SERVER] Video piccolo - estrazione audio completa...`);

        const audioResult = await videoProcessor.extractAudio(tempFilePath, {
          format: 'mp3',
          quality: '128k',
          channels: 1,
          sampleRate: 16000
        });

        audioFilePath = audioResult.audioPath;
        console.log(`✅ [SERVER] Audio estratto: ${(audioResult.size / 1024 / 1024).toFixed(2)}MB`);

        console.log(`🎯 [SERVER] Trascrivendo audio completo...`);
        const transcription = await whisperService.transcribeFile(audioFilePath, {
          language,
          response_format: 'verbose_json',
          temperature,
          prompt
        });

        await cleanup(tempFilePath, audioFilePath, []);

        return res.json({
          success: true,
          type: 'video_complete',
          transcription: transcription.text,
          segments: transcription.segments || [],
          language: transcription.language,
          duration: transcription.duration,
          stats: {
            words: transcription.text.split(' ').length,
            characters: transcription.text.length
          }
        });
      }

    } else {
      console.log('🎵 [SERVER] File audio rilevato - analisi...');

      const audioInfo = await audioProcessor.getAudioInfo(tempFilePath);
      console.log(`📈 [SERVER] Info audio:`, audioInfo);

      const fileSizeMB = req.file.size / (1024 * 1024);

      if (fileSizeMB > 24 || audioInfo.duration > (chunkDurationMinutes * 60)) {
        console.log(`✂️ [SERVER] Audio grande - creazione segmenti...`);

        const result = await audioProcessor.splitAudio(
          tempFilePath,
          chunkDurationMinutes,
          24
        );

        segmentPaths = result.segments.map(s => s.path);
        console.log(`✅ [SERVER] Creati ${result.segments.length} segmenti audio`);

        const transcriptionResults = [];

        for (let i = 0; i < result.segments.length; i++) {
          const segment = result.segments[i];

          console.log(`🎯 [SERVER] Trascrivendo segmento ${i + 1}/${result.segments.length}...`);

          try {
            const transcription = await whisperService.transcribeFile(segment.path, {
              language,
              response_format: 'verbose_json',
              temperature,
              prompt
            });

            transcriptionResults.push({
              segmentIndex: i,
              startTime: segment.startTime,
              endTime: segment.endTime,
              duration: segment.duration,
              text: transcription.text,
              segments: transcription.segments || [],
              language: transcription.language,
              success: true
            });

            console.log(`✅ [SERVER] Segmento ${i + 1} completato: ${transcription.text.length} caratteri`);

          } catch (error) {
            console.error(`❌ [SERVER] Errore segmento ${i + 1}:`, error.message);
            transcriptionResults.push({
              segmentIndex: i,
              startTime: segment.startTime,
              endTime: segment.endTime,
              duration: segment.duration,
              text: '',
              error: error.message,
              success: false
            });
          }
        }

        const combinedResult = whisperService.combineResults(transcriptionResults);

        await cleanup(tempFilePath, null, segmentPaths);
        await audioProcessor.cleanup(result.sessionId);

        return res.json({
          success: true,
          type: 'audio_segmented',
          transcription: combinedResult.fullText,
          detailedSegments: combinedResult.segments,
          stats: {
            totalSegments: combinedResult.totalSegments,
            successfulSegments: combinedResult.successfulSegments,
            failedSegments: combinedResult.failedSegments,
            totalWords: combinedResult.totalWords,
            duration: combinedResult.estimatedDuration
          }
        });

      } else {
        console.log(`🎯 [SERVER] Audio piccolo - trascrizione diretta...`);

        const transcription = await whisperService.transcribeFile(tempFilePath, {
          language,
          response_format: 'verbose_json',
          temperature,
          prompt
        });

        await cleanup(tempFilePath, null, []);

        return res.json({
          success: true,
          type: 'audio_complete',
          transcription: transcription.text,
          segments: transcription.segments || [],
          language: transcription.language,
          duration: transcription.duration,
          stats: {
            words: transcription.text.split(' ').length,
            characters: transcription.text.length
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ [SERVER] Errore trascrizione smart:', error);

    await cleanup(tempFilePath, audioFilePath, segmentPaths);

    res.status(500).json({
      error: 'Errore durante la trascrizione',
      details: error.message
    });
  }
});

async function cleanup(tempFile, audioFile, segmentFiles) {
  const filesToClean = [tempFile, audioFile, ...segmentFiles].filter(Boolean);

  for (const file of filesToClean) {
    try {
      await fs.unlink(file);
      console.log(`🗑️ [SERVER] File eliminato: ${path.basename(file)}`);
    } catch (error) {
      console.warn(`⚠️ [SERVER] Errore eliminazione ${path.basename(file)}:`, error.message);
    }
  }
}

export default router;
