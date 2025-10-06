import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import AudioProcessor from '../services/audioProcessor.js';
import VideoProcessor from '../services/videoProcessor.js';
import WhisperService from '../services/whisperService.js';

const router = express.Router();

// Configurazione multer per upload file
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(mp3|wav|m4a|aac|ogg|flac|mp4|webm)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Formato file non supportato'));
    }
  }
});

// Inizializza servizi
const audioProcessor = new AudioProcessor();
const videoProcessor = new VideoProcessor();
const whisperService = new WhisperService(process.env.OPENAI_API_KEY);

// Endpoint per analizzare file video
router.post('/analyze-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    // Verifica che sia un video
    if (!videoProcessor.isVideoFile(req.file.originalname)) {
      return res.status(400).json({ error: 'Il file non è un video supportato' });
    }

    const videoInfo = await videoProcessor.getVideoInfo(req.file.path);
    
    if (!videoInfo.hasAudio) {
      return res.status(400).json({ error: 'Il video non contiene traccia audio' });
    }

    // Calcola se necessita segmentazione
    const fileSizeMB = videoInfo.size / (1024 * 1024);
    const estimatedAudioSizeMB = fileSizeMB * 0.12; // Stima audio ~12% del video
    const needsSegmentation = estimatedAudioSizeMB > 24;
    const estimatedSegments = needsSegmentation ? Math.ceil(videoInfo.duration / (10 * 60)) : 1;

    res.json({
      fileId: req.file.filename,
      originalName: req.file.originalname,
      videoInfo,
      fileSizeMB: fileSizeMB.toFixed(2),
      estimatedAudioSizeMB: estimatedAudioSizeMB.toFixed(2),
      needsSegmentation,
      estimatedSegments,
      estimatedCost: (videoInfo.duration / 60 * 0.006).toFixed(3)
    });

  } catch (error) {
    console.error('Errore analisi video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint per estrarre audio da video
router.post('/extract-audio/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const options = req.body.options || {};
    
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', fileId);
    
    // Verifica esistenza file
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File non trovato' });
    }

    // Verifica che sia un video
    if (!videoProcessor.isVideoFile(fileId)) {
      return res.status(400).json({ error: 'Il file non è un video' });
    }

    console.log('Estraendo audio dal video...');
    
    // Analizza video per determinare strategia di estrazione
    const videoInfo = await videoProcessor.getVideoInfo(filePath);
    const estimatedAudioSizeMB = (videoInfo.size / 1024 / 1024) * 0.12;

    let extractionResult;

    if (estimatedAudioSizeMB <= 24) {
      // Estrazione diretta
      console.log('Estrazione audio diretta...');
      extractionResult = await videoProcessor.extractAudio(filePath, {
        format: 'mp3',
        quality: '128k',
        channels: 1,
        sampleRate: 16000
      });
      
      extractionResult.method = 'direct';
      extractionResult.segments = [{
        index: 0,
        path: extractionResult.audioPath,
        filename: extractionResult.filename,
        startTime: 0,
        endTime: videoInfo.duration,
        duration: videoInfo.duration,
        size: extractionResult.size
      }];

    } else {
      // Estrazione con segmentazione
      console.log('Estrazione audio con segmentazione...');
      extractionResult = await videoProcessor.extractAudioWithSegmentation(filePath, 10, 24);
    }

    res.json({
      success: true,
      extraction: extractionResult,
      videoInfo,
      processingTime: Date.now()
    });

  } catch (error) {
    console.error('Errore estrazione audio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint per trascrizione completa da video
router.post('/transcribe-video/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const options = req.body.options || {};
    
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', fileId);
    
    // Verifica esistenza file
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File non trovato' });
    }

    // 1. Estrai audio
    console.log('Fase 1: Estrazione audio dal video...');
    const videoInfo = await videoProcessor.getVideoInfo(filePath);
    const estimatedAudioSizeMB = (videoInfo.size / 1024 / 1024) * 0.12;

    let extractionResult;
    if (estimatedAudioSizeMB <= 24) {
      extractionResult = await videoProcessor.extractAudio(filePath, {
        format: 'mp3',
        quality: '128k',
        channels: 1,
        sampleRate: 16000
      });
      extractionResult.segments = [{
        index: 0,
        path: extractionResult.audioPath,
        startTime: 0,
        endTime: videoInfo.duration,
        duration: videoInfo.duration
      }];
    } else {
      extractionResult = await videoProcessor.extractAudioWithSegmentation(filePath, 10, 24);
    }

    // 2. Trascrivi audio estratto
    console.log('Fase 2: Trascrizione audio estratto...');
    let transcriptionResult;

    if (extractionResult.segments.length === 1) {
      // File singolo
      const result = await whisperService.transcribeFile(extractionResult.segments[0].path, options);
      transcriptionResult = {
        fullText: result.text,
        segments: [{
          index: 0,
          startTime: 0,
          endTime: videoInfo.duration,
          text: result.text,
          duration: videoInfo.duration
        }],
        method: 'direct',
        totalSegments: 1,
        successfulSegments: 1,
        failedSegments: 0
      };
    } else {
      // Segmenti multipli
      const transcriptionResults = await whisperService.transcribeSegments(
        extractionResult.segments,
        options,
        (progress) => {
          console.log(`Progresso trascrizione: ${progress.percentage}%`);
        }
      );

      transcriptionResult = whisperService.combineResults(transcriptionResults);
      transcriptionResult.method = 'segmented';
    }

    // 3. Pulizia file temporanei
    await videoProcessor.cleanup(extractionResult.sessionId);

    res.json({
      success: true,
      transcription: transcriptionResult,
      videoInfo,
      extractionInfo: {
        method: extractionResult.method || 'segmented',
        segments: extractionResult.segments.length,
        totalAudioDuration: videoInfo.duration
      },
      processingTime: Date.now()
    });

  } catch (error) {
    console.error('Errore trascrizione video:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint per generare thumbnail video
router.post('/video-thumbnail/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { timeOffset = '50%', width = 320, height = 240 } = req.body;
    
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', fileId);
    
    const result = await videoProcessor.generateThumbnail(filePath, {
      timeOffset,
      width,
      height
    });

    // Invia il file thumbnail
    res.sendFile(path.resolve(result.thumbnailPath));

  } catch (error) {
    console.error('Errore generazione thumbnail:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint per analizzare file audio
router.post('/analyze', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    const audioInfo = await audioProcessor.getAudioInfo(req.file.path);
    
    // Calcola se il file necessita di essere diviso
    const fileSizeMB = audioInfo.size / (1024 * 1024);
    const needsSplitting = fileSizeMB > 24; // Limite Whisper
    const estimatedSegments = needsSplitting ? Math.ceil(audioInfo.duration / (10 * 60)) : 1;

    res.json({
      fileId: req.file.filename,
      originalName: req.file.originalname,
      audioInfo,
      fileSizeMB: fileSizeMB.toFixed(2),
      needsSplitting,
      estimatedSegments,
      estimatedCost: (audioInfo.duration / 60 * 0.006).toFixed(3)
    });

  } catch (error) {
    console.error('Errore analisi file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint per trascrizione completa
router.post('/transcribe/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const options = req.body.options || {};
    
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', fileId);
    
    // Verifica esistenza file
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File non trovato' });
    }

    // Analizza file per determinare se dividere
    const audioInfo = await audioProcessor.getAudioInfo(filePath);
    const fileSizeMB = audioInfo.size / (1024 * 1024);

    let transcriptionResult;

    if (fileSizeMB <= 24) {
      // File piccolo - trascrizione diretta
      console.log('Trascrizione diretta del file...');
      const result = await whisperService.transcribeFile(filePath, options);
      
      transcriptionResult = {
        fullText: result.text,
        segments: [{
          index: 0,
          startTime: 0,
          endTime: audioInfo.duration,
          text: result.text,
          duration: audioInfo.duration
        }],
        method: 'direct',
        totalSegments: 1,
        successfulSegments: 1,
        failedSegments: 0
      };

    } else {
      // File grande - divisione e trascrizione segmenti
      console.log('File grande - divisione in segmenti...');
      
      const splitResult = await audioProcessor.splitAudio(filePath, 10, 24);
      
      // Trascrivi tutti i segmenti
      const transcriptionResults = await whisperService.transcribeSegments(
        splitResult.segments,
        options,
        (progress) => {
          // In un'app reale, useresti WebSocket per aggiornamenti real-time
          console.log(`Progresso: ${progress.percentage}%`);
        }
      );

      // Combina risultati
      transcriptionResult = whisperService.combineResults(transcriptionResults);
      transcriptionResult.method = 'segmented';
      transcriptionResult.sessionId = splitResult.sessionId;

      // Pulizia file temporanei
      await audioProcessor.cleanup(splitResult.sessionId);
    }

    res.json({
      success: true,
      transcription: transcriptionResult,
      audioInfo,
      processingTime: Date.now()
    });

  } catch (error) {
    console.error('Errore trascrizione:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint per generare sottotitoli
router.post('/subtitles/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const { format = 'srt', segments } = req.body;

    if (!segments || !Array.isArray(segments)) {
      return res.status(400).json({ error: 'Segmenti trascrizione richiesti' });
    }

    let subtitleContent;
    let contentType;
    let fileExtension;

    switch (format.toLowerCase()) {
      case 'srt':
        subtitleContent = whisperService.generateSRT(segments);
        contentType = 'text/plain';
        fileExtension = 'srt';
        break;
      
      default:
        return res.status(400).json({ error: 'Formato sottotitoli non supportato' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="trascrizione_${fileId}.${fileExtension}"`);
    res.send(subtitleContent);

  } catch (error) {
    console.error('Errore generazione sottotitoli:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint per pulizia file
router.delete('/cleanup/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = path.join(process.env.UPLOAD_DIR || './uploads', fileId);
    
    await fs.unlink(filePath);
    
    // Pulizia aggiuntiva per file video (thumbnails, audio estratti, etc.)
    try {
      await videoProcessor.cleanup(fileId.split('.')[0]);
    } catch (cleanupError) {
      console.warn('Errore pulizia file video temporanei:', cleanupError.message);
    }
    
    res.json({ success: true, message: 'File eliminato' });
  } catch (error) {
    console.error('Errore eliminazione file:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;