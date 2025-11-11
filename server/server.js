import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurazione ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IMPORTANTE: Carica variabili ambiente PRIMA di tutto
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve file statici per upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Import dinamico dei routes DOPO che dotenv ha caricato le variabili
const loadRoutes = async () => {
  const transcriptionRoutes = await import('./routes/transcription.js');
  const chunkedTranscriptionRoutes = await import('./routes/chunkedTranscription.js');
  const smartTranscriptionRoutes = await import('./routes/smartTranscription.js');
  const uploadAndChunkRoutes = await import('./routes/uploadAndChunk.js');
  const supabaseChunkingRoutes = await import('./routes/supabaseChunking.js');

  // Routes
  app.use('/api/transcription', transcriptionRoutes.default);
  app.use('/api/chunked', chunkedTranscriptionRoutes.default);
  app.use('/api/smart', smartTranscriptionRoutes.default);
  app.use('/api/supabase', supabaseChunkingRoutes.default);
  app.use('/api/upload', uploadAndChunkRoutes.default);

  // Error handling middleware
  app.use((error, req, res, next) => {
    console.error('Errore server:', error);

    res.status(500).json({
      error: 'Errore interno del server',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint non trovato' });
  });

  // Avvio server
  app.listen(PORT, () => {
    console.log(`🚀 Server AudioScribe avviato su porta ${PORT}`);
    console.log(`📁 Directory upload: ${process.env.UPLOAD_DIR || './uploads'}`);
    console.log(`🔑 OpenAI configurato: ${process.env.OPENAI_API_KEY ? '✅' : '❌'}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  });
};

loadRoutes().catch(error => {
  console.error('Errore caricamento routes:', error);
  process.exit(1);
});

export default app;