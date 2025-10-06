import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import ChunkManager from '../services/chunkManager.js';
import AudioProcessor from '../services/audioProcessor.js';
import WhisperService from '../services/whisperService.js';

const router = express.Router();
const chunkManager = new ChunkManager();
const audioProcessor = new AudioProcessor();
const whisperService = new WhisperService(process.env.OPENAI_API_KEY);

// Configurazione multer per upload
const upload = multer({
  storage: multer.memoryStorage(), // Mantieni in memoria per elaborazione
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// Pulizia automatica ogni 30 minuti
setInterval(() => {
  chunkManager.cleanupOldSessions();
}, 30 * 60 * 1000);

// Endpoint per creare chunk da file audio
router.post('/create-chunks', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file audio caricato' });
    }

    const { chunkDurationMinutes = 10 } = req.body;
    
    console.log(`🎯 Creazione chunk per: ${req.file.originalname}`);
    console.log(`📊 Dimensione file: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`);

    // Crea sessione per gestire i chunk
    const sessionId = chunkManager.createSession(req.file.originalname);

    // Salva file temporaneo per elaborazione
    const tempDir = './temp';
    await fs.mkdir(tempDir, { recursive: true });
    const tempFilePath = path.join(tempDir, `temp_${sessionId}.${req.file.originalname.split('.').pop()}`);
    await fs.writeFile(tempFilePath, req.file.buffer);

    try {
      // Analizza file audio
      const audioInfo = await audioProcessor.getAudioInfo(tempFilePath);
      console.log(`📈 Info audio:`, audioInfo);

      // Determina se serve chunking
      const fileSizeMB = req.file.size / (1024 * 1024);
      const needsChunking = fileSizeMB > 24; // Limite Whisper

      if (!needsChunking) {
        // File piccolo - salva come chunk singolo
        const chunkInfo = await chunkManager.saveChunk(
          sessionId, 
          0, 
          req.file.buffer,
          {
            startTime: 0,
            endTime: audioInfo.duration,
            duration: audioInfo.duration,
            originalSize: req.file.size
          }
        );

        // Pulisci file temporaneo
        await fs.unlink(tempFilePath);

        return res.json({
          success: true,
          sessionId,
          needsChunking: false,
          chunks: [chunkInfo],
          audioInfo,
          message: 'File piccolo - nessun chunking necessario'
        });
      }

      // File grande - crea chunk multipli
      console.log(`✂️ File grande rilevato - creazione chunk...`);
      
      const splitResult = await audioProcessor.splitAudio(
        tempFilePath, 
        chunkDurationMinutes, 
        24
      );

      // Salva ogni chunk nel chunk manager
      const savedChunks = [];
      for (let i = 0; i < splitResult.segments.length; i++) {
        const segment = splitResult.segments[i];
        
        // Leggi il file chunk creato da audioProcessor
        const chunkBuffer = await fs.readFile(segment.path);
        
        // Salva nel chunk manager
        const chunkInfo = await chunkManager.saveChunk(
          sessionId,
          i,
          chunkBuffer,
          {
            startTime: segment.startTime,
            endTime: segment.endTime,
            duration: segment.duration,
            originalPath: segment.path
          }
        );

        savedChunks.push(chunkInfo);

        // Pulisci il file temporaneo di audioProcessor
        try {
          await fs.unlink(segment.path);
        } catch (error) {
          console.warn(`⚠️ Errore pulizia chunk temporaneo:`, error.message);
        }
      }

      // Pulisci file temporaneo originale
      await fs.unlink(tempFilePath);

      // Pulisci sessione audioProcessor
      await audioProcessor.cleanup(splitResult.sessionId);

      console.log(`✅ Chunk creati: ${savedChunks.length} parti`);

      res.json({
        success: true,
        sessionId,
        needsChunking: true,
        chunks: savedChunks,
        audioInfo,
        totalChunks: savedChunks.length,
        message: `File diviso in ${savedChunks.length} chunk`
      });

    } catch (processingError) {
      // Pulisci in caso di errore
      await fs.unlink(tempFilePath).catch(() => {});
      await chunkManager.cleanupSession(sessionId);
      throw processingError;
    }

  } catch (error) {
    console.error('❌ Errore creazione chunk:', error);
    res.status(500).json({ 
      error: 'Errore durante la creazione dei chunk',
      details: error.message 
    });
  }
});

// Endpoint per trascrivere chunk specifico
router.post('/transcribe-chunk/:sessionId/:chunkIndex', async (req, res) => {
  try {
    const { sessionId, chunkIndex } = req.params;
    const { options = {} } = req.body;

    console.log(`🎯 Trascrizione chunk ${chunkIndex} della sessione ${sessionId}`);

    // Ottieni chunk
    const chunk = await chunkManager.getChunk(sessionId, parseInt(chunkIndex));
    
    // Trascrivi usando Whisper
    const result = await whisperService.transcribeFile(chunk.filePath, {
      language: options.language || 'it',
      response_format: options.response_format || 'verbose_json',
      temperature: options.temperature || 0,
      prompt: options.prompt
    });

    console.log(`✅ Chunk ${chunkIndex} trascritto: ${result.text.length} caratteri`);

    res.json({
      success: true,
      chunkIndex: parseInt(chunkIndex),
      transcription: result,
      metadata: chunk.metadata,
      message: `Chunk ${chunkIndex} trascritto con successo`
    });

  } catch (error) {
    console.error(`❌ Errore trascrizione chunk:`, error);
    res.status(500).json({ 
      error: 'Errore durante la trascrizione del chunk',
      details: error.message 
    });
  }
});

// Endpoint per trascrizione completa con gestione automatica
router.post('/transcribe-complete/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { options = {} } = req.body;

    console.log(`🚀 Trascrizione completa sessione ${sessionId}`);

    // Ottieni tutti i chunk della sessione
    const chunks = chunkManager.getSessionChunks(sessionId);
    console.log(`📊 Chunk da trascrivere: ${chunks.length}`);

    const transcriptionResults = [];
    
    // Trascrivi ogni chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      console.log(`🎯 Trascrivendo chunk ${i + 1}/${chunks.length}...`);

      try {
        const result = await whisperService.transcribeFile(chunk.filePath, {
          language: options.language || 'it',
          response_format: options.response_format || 'verbose_json',
          temperature: options.temperature || 0,
          prompt: options.prompt
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
          startTime: chunk.metadata.startTime,
          endTime: chunk.metadata.endTime,
          duration: chunk.metadata.duration,
          text: '',
          error: chunkError.message,
          success: false
        });
      }
    }

    // Combina risultati
    const combinedResult = whisperService.combineResults(transcriptionResults);

    // PULIZIA AUTOMATICA DOPO TRASCRIZIONE COMPLETATA
    console.log(`🧹 Pulizia automatica sessione ${sessionId}...`);
    await chunkManager.cleanupSession(sessionId);
    console.log(`✅ Sessione ${sessionId} pulita automaticamente`);

    res.json({
      success: true,
      sessionId,
      transcription: combinedResult,
      chunksProcessed: chunks.length,
      successfulChunks: transcriptionResults.filter(r => r.success).length,
      failedChunks: transcriptionResults.filter(r => !r.success).length,
      message: 'Trascrizione completata e chunk puliti automaticamente'
    });

  } catch (error) {
    console.error('❌ Errore trascrizione completa:', error);
    
    // Pulizia in caso di errore
    try {
      await chunkManager.cleanupSession(sessionId);
      console.log(`🧹 Sessione ${sessionId} pulita dopo errore`);
    } catch (cleanupError) {
      console.error('❌ Errore pulizia dopo errore:', cleanupError);
    }

    res.status(500).json({ 
      error: 'Errore durante la trascrizione completa',
      details: error.message 
    });
  }
});

// Endpoint per statistiche chunk manager
router.get('/stats', (req, res) => {
  const stats = chunkManager.getStats();
  res.json({
    success: true,
    stats,
    message: 'Statistiche chunk manager'
  });
});

// Endpoint per pulizia manuale sessione
router.delete('/cleanup/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await chunkManager.cleanupSession(sessionId);
    
    res.json({
      success: true,
      message: `Sessione ${sessionId} pulita manualmente`
    });
  } catch (error) {
    res.status(500).json({
      error: 'Errore durante la pulizia',
      details: error.message
    });
  }
});

export default router;