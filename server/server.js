import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import transcriptionRoutes from './routes/transcription.js';
import chunkedTranscriptionRoutes from './routes/chunkedTranscription.js';

// Configurazione ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carica variabili ambiente
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

// Routes
app.use('/api/transcription', transcriptionRoutes);
app.use('/api/chunked', chunkedTranscriptionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Errore server:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File troppo grande' });
    }
  }
  
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

export default app;