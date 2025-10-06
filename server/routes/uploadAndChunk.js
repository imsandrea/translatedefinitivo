import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import VideoProcessor from '../services/videoProcessor.js';
import ChunkManager from '../services/chunkManager.js';
import AudioProcessor from '../services/audioProcessor.js';
import WhisperService from '../services/whisperService.js';

const router = express.Router();
const videoProcessor = new VideoProcessor();
const chunkManager = new ChunkManager();
const audioProcessor = new AudioProcessor();
const whisperService = new WhisperService(process.env.OPENAI_API_KEY);

// Configurazione multer per upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB max
  }
});

// Endpoint COMPLETO: Upload + Estrazione Audio + Chunking + Trascrizione + Pulizia
router.post('/process-file', upload.single('file'), async (req, res) => {
  let sessionId = null;
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const {
      chunkDurationMinutes = 10,
      language = 'it',
      transcribeNow = false
    } = req.body;

    console.log(`\n🚀 ===== INIZIO ELABORAZIONE FILE =====`);
    console.log(`📁 File: ${req.file.originalname}`);
    console.log(`📊 Dimensione: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`🎯 Trascrizione immediata: ${transcribeNow}`);

    // 1. Salva file temporaneo
    const tempDir = './temp';
    await fs.mkdir(tempDir, { recursive: true });
    const fileExt = path.extname(req.file.originalname);
    tempFilePath = path.join(tempDir, `upload_${Date.now()}${fileExt}`);
    await fs.writeFile(tempFilePath, req.file.buffer);
    console.log(`💾 File salvato: ${tempFilePath}`);

    // 2. Verifica se è video - se sì, estrai audio
    let audioFilePath = tempFilePath;
    let isVideo = false;

    if (videoProcessor.isVideoFile(req.file.originalname)) {
      isVideo = true;
      console.log(`\n🎬 ===== ESTRAZIONE AUDIO DA VIDEO =====`);

      const videoInfo = await videoProcessor.getVideoInfo(tempFilePath);
      console.log(`📹 Info video:`, {
        duration: videoInfo.duration,
        hasAudio: videoInfo.hasAudio,
        format: videoInfo.format
      });

      if (!videoInfo.hasAudio) {
        throw new Error('Il video non contiene traccia audio');
      }

      // Estrai audio dal video
      const audioResult = await videoProcessor.extractAudio(tempFilePath, {
        format: 'mp3',
        quality: '128k',
        channels: 1,
        sampleRate: 16000
      });

      audioFilePath = audioResult.audioPath;
      console.log(`✅ Audio estratto: ${audioFilePath}`);
      console.log(`📊 Dimensione audio: ${(audioResult.size / 1024 / 1024).toFixed(2)}MB`);
    }

    // 3. Crea sessione per chunking
    sessionId = chunkManager.createSession(req.file.originalname);
    console.log(`\n📦 ===== CREAZIONE CHUNK =====`);
    console.log(`🆔 Session ID: ${sessionId}`);

    // 4. Analizza audio
    const audioInfo = await audioProcessor.getAudioInfo(audioFilePath);
    console.log(`🎵 Info audio:`, {
      duration: audioInfo.duration,
      size: audioInfo.size,
      format: audioInfo.format
    });

    // 5. Determina se serve chunking
    const audioStats = await fs.stat(audioFilePath);
    const fileSizeMB = audioStats.size / (1024 * 1024);
    const needsChunking = fileSizeMB > 24; // Limite Whisper

    let chunks = [];

    if (!needsChunking) {
      console.log(`✅ File piccolo - Nessun chunking necessario`);

      // Salva come chunk singolo
      const audioBuffer = await fs.readFile(audioFilePath);
      const chunkInfo = await chunkManager.saveChunk(
        sessionId,
        0,
        audioBuffer,
        {
          startTime: 0,
          endTime: audioInfo.duration,
          duration: audioInfo.duration,
          originalSize: audioStats.size
        }
      );

      chunks = [chunkInfo];

    } else {
      console.log(`✂️ File grande rilevato - Creazione chunk...`);

      // Crea chunk multipli
      const splitResult = await audioProcessor.splitAudio(
        audioFilePath,
        chunkDurationMinutes,
        24
      );

      console.log(`📊 Chunk creati: ${splitResult.segments.length}`);

      // Salva ogni chunk
      for (let i = 0; i < splitResult.segments.length; i++) {
        const segment = splitResult.segments[i];
        const chunkBuffer = await fs.readFile(segment.path);

        const chunkInfo = await chunkManager.saveChunk(
          sessionId,
          i,
          chunkBuffer,
          {
            startTime: segment.startTime,
            endTime: segment.endTime,
            duration: segment.duration
          }
        );

        chunks.push(chunkInfo);

        // Pulisci file temporaneo del chunk
        await fs.unlink(segment.path).catch(() => {});
      }

      // Pulisci sessione audioProcessor
      await audioProcessor.cleanup(splitResult.sessionId);
    }

    // 6. Pulisci file temporanei upload
    console.log(`\n🧹 ===== PULIZIA FILE TEMPORANEI =====`);

    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
      console.log(`🗑️ File originale eliminato`);
    }

    if (isVideo && audioFilePath !== tempFilePath) {
      await fs.unlink(audioFilePath).catch(() => {});
      console.log(`🗑️ Audio estratto eliminato`);
    }

    console.log(`\n✅ ===== ELABORAZIONE COMPLETATA =====`);
    console.log(`📦 Chunk salvati: ${chunks.length}`);
    console.log(`🆔 Session ID: ${sessionId}`);

    // 7. Trascrivi immediatamente se richiesto
    let transcription = null;

    if (transcribeNow === 'true' || transcribeNow === true) {
      console.log(`\n🎤 ===== INIZIO TRASCRIZIONE =====`);

      const transcriptionResults = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        console.log(`🎯 Trascrivendo chunk ${i + 1}/${chunks.length}...`);

        try {
          const result = await whisperService.transcribeFile(chunk.filePath, {
            language: language,
            response_format: 'verbose_json',
            temperature: 0
          });

          transcriptionResults.push({
            chunkIndex: chunk.index,
            startTime: chunk.metadata.startTime,
            endTime: chunk.metadata.endTime,
            duration: chunk.metadata.duration,
            text: result.text,
            segments: result.segments || [],
            language: result.language,
            success: true
          });

          console.log(`✅ Chunk ${i + 1} completato: ${result.text.length} caratteri`);

        } catch (chunkError) {
          console.error(`❌ Errore chunk ${i + 1}:`, chunkError);
          transcriptionResults.push({
            chunkIndex: chunk.index,
            text: '',
            error: chunkError.message,
            success: false
          });
        }
      }

      // Combina risultati
      transcription = whisperService.combineResults(transcriptionResults);

      console.log(`\n✅ ===== TRASCRIZIONE COMPLETATA =====`);
      console.log(`📝 Caratteri totali: ${transcription.fullText.length}`);

      // 8. Pulisci automaticamente dopo trascrizione
      console.log(`\n🧹 ===== PULIZIA SESSIONE =====`);
      await chunkManager.cleanupSession(sessionId);
      console.log(`✅ Sessione pulita automaticamente`);
    }

    // Risposta finale
    res.json({
      success: true,
      sessionId,
      isVideo,
      needsChunking,
      chunks: chunks.map(c => ({
        index: c.index,
        duration: c.metadata.duration,
        startTime: c.metadata.startTime,
        endTime: c.metadata.endTime,
        sizeMB: (c.size / 1024 / 1024).toFixed(2)
      })),
      audioInfo: {
        duration: audioInfo.duration,
        format: audioInfo.format
      },
      transcription,
      message: transcribeNow
        ? 'File elaborato, trascritto e pulito automaticamente'
        : 'File elaborato e chunk creati con successo'
    });

  } catch (error) {
    console.error('\n❌ ===== ERRORE ELABORAZIONE =====');
    console.error(error);

    // Pulizia in caso di errore
    if (tempFilePath) {
      await fs.unlink(tempFilePath).catch(() => {});
    }

    if (sessionId) {
      await chunkManager.cleanupSession(sessionId).catch(() => {});
    }

    res.status(500).json({
      error: 'Errore durante elaborazione file',
      details: error.message
    });
  }
});

// Endpoint per trascrizione sessione esistente
router.post('/transcribe-session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { language = 'it' } = req.body;

    console.log(`\n🎤 ===== TRASCRIZIONE SESSIONE =====`);
    console.log(`🆔 Session ID: ${sessionId}`);

    const chunks = chunkManager.getSessionChunks(sessionId);
    console.log(`📊 Chunk da trascrivere: ${chunks.length}`);

    const transcriptionResults = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🎯 Trascrivendo chunk ${i + 1}/${chunks.length}...`);

      try {
        const result = await whisperService.transcribeFile(chunk.filePath, {
          language: language,
          response_format: 'verbose_json',
          temperature: 0
        });

        transcriptionResults.push({
          chunkIndex: chunk.index,
          startTime: chunk.metadata.startTime,
          endTime: chunk.metadata.endTime,
          duration: chunk.metadata.duration,
          text: result.text,
          segments: result.segments || [],
          language: result.language,
          success: true
        });

        console.log(`✅ Chunk ${i + 1} completato`);

      } catch (chunkError) {
        console.error(`❌ Errore chunk ${i + 1}:`, chunkError);
        transcriptionResults.push({
          chunkIndex: chunk.index,
          text: '',
          error: chunkError.message,
          success: false
        });
      }
    }

    // Combina risultati
    const transcription = whisperService.combineResults(transcriptionResults);

    console.log(`\n✅ ===== TRASCRIZIONE COMPLETATA =====`);

    // Pulisci automaticamente
    console.log(`\n🧹 ===== PULIZIA SESSIONE =====`);
    await chunkManager.cleanupSession(sessionId);
    console.log(`✅ Sessione pulita automaticamente`);

    res.json({
      success: true,
      sessionId,
      transcription,
      chunksProcessed: chunks.length,
      message: 'Trascrizione completata e sessione pulita'
    });

  } catch (error) {
    console.error('\n❌ ===== ERRORE TRASCRIZIONE =====');
    console.error(error);

    res.status(500).json({
      error: 'Errore durante trascrizione',
      details: error.message
    });
  }
});

export default router;
