import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class ChunkManager {
  constructor(tempDir = './temp/chunks') {
    this.tempDir = tempDir;
    this.sessions = new Map(); // Traccia le sessioni attive
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      console.log(`📁 Directory chunk creata: ${this.tempDir}`);
    } catch (error) {
      console.error('❌ Errore creazione directory chunk:', error);
    }
  }

  // Crea una nuova sessione per gestire i chunk
  createSession(originalFileName) {
    const sessionId = uuidv4();
    const sessionDir = path.join(this.tempDir, sessionId);
    
    this.sessions.set(sessionId, {
      id: sessionId,
      originalFileName,
      sessionDir,
      chunks: [],
      createdAt: new Date(),
      lastAccess: new Date()
    });

    console.log(`🆕 Sessione chunk creata: ${sessionId} per ${originalFileName}`);
    return sessionId;
  }

  // Salva un chunk audio in locale
  async saveChunk(sessionId, chunkIndex, audioBuffer, metadata = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Sessione ${sessionId} non trovata`);
    }

    // Crea directory sessione se non esiste
    await fs.mkdir(session.sessionDir, { recursive: true });

    const chunkFileName = `chunk_${chunkIndex.toString().padStart(3, '0')}.mp3`;
    const chunkPath = path.join(session.sessionDir, chunkFileName);

    // Salva il chunk
    await fs.writeFile(chunkPath, audioBuffer);

    const chunkInfo = {
      index: chunkIndex,
      fileName: chunkFileName,
      filePath: chunkPath,
      size: audioBuffer.length,
      metadata,
      createdAt: new Date()
    };

    session.chunks.push(chunkInfo);
    session.lastAccess = new Date();

    console.log(`💾 Chunk salvato: ${chunkFileName} (${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB)`);
    return chunkInfo;
  }

  // Ottieni un chunk per la trascrizione
  async getChunk(sessionId, chunkIndex) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Sessione ${sessionId} non trovata`);
    }

    const chunk = session.chunks.find(c => c.index === chunkIndex);
    if (!chunk) {
      throw new Error(`Chunk ${chunkIndex} non trovato nella sessione ${sessionId}`);
    }

    session.lastAccess = new Date();
    return chunk;
  }

  // Lista tutti i chunk di una sessione
  getSessionChunks(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Sessione ${sessionId} non trovata`);
    }

    session.lastAccess = new Date();
    return session.chunks.sort((a, b) => a.index - b.index);
  }

  // Pulisci una sessione specifica dopo la trascrizione
  async cleanupSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`⚠️ Sessione ${sessionId} già pulita o non esistente`);
      return;
    }

    try {
      // Rimuovi tutti i file chunk
      for (const chunk of session.chunks) {
        try {
          await fs.unlink(chunk.filePath);
          console.log(`🗑️ Chunk eliminato: ${chunk.fileName}`);
        } catch (error) {
          console.warn(`⚠️ Errore eliminazione chunk ${chunk.fileName}:`, error.message);
        }
      }

      // Rimuovi directory sessione
      try {
        await fs.rmdir(session.sessionDir);
        console.log(`📁 Directory sessione eliminata: ${sessionId}`);
      } catch (error) {
        console.warn(`⚠️ Errore eliminazione directory sessione:`, error.message);
      }

      // Rimuovi dalla memoria
      this.sessions.delete(sessionId);
      console.log(`✅ Sessione ${sessionId} pulita completamente`);

    } catch (error) {
      console.error(`❌ Errore pulizia sessione ${sessionId}:`, error);
    }
  }

  // Pulizia automatica sessioni vecchie (>1 ora)
  async cleanupOldSessions() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const sessionsToClean = [];

    for (const [sessionId, session] of this.sessions) {
      if (session.lastAccess < oneHourAgo) {
        sessionsToClean.push(sessionId);
      }
    }

    console.log(`🧹 Pulizia automatica: ${sessionsToClean.length} sessioni vecchie`);

    for (const sessionId of sessionsToClean) {
      await this.cleanupSession(sessionId);
    }
  }

  // Statistiche chunk manager
  getStats() {
    const activeSessions = this.sessions.size;
    const totalChunks = Array.from(this.sessions.values())
      .reduce((sum, session) => sum + session.chunks.length, 0);
    
    const totalSize = Array.from(this.sessions.values())
      .reduce((sum, session) => 
        sum + session.chunks.reduce((chunkSum, chunk) => chunkSum + chunk.size, 0), 0
      );

    return {
      activeSessions,
      totalChunks,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      oldestSession: this.sessions.size > 0 ? 
        Math.min(...Array.from(this.sessions.values()).map(s => s.createdAt.getTime())) : null
    };
  }
}

export default ChunkManager;