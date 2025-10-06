interface AudioChunk {
  index: number;
  blob: Blob;
  startTime: number;
  endTime: number;
  duration: number;
  size: number;
}

interface ChunkingProgress {
  phase: 'analyzing' | 'chunking' | 'transcribing' | 'combining';
  currentChunk: number;
  totalChunks: number;
  percentage: number;
  message: string;
}

class AudioChunker {
  private audioContext: AudioContext | null = null;
  private memoryUsage: number = 0;
  private maxMemoryMB: number = 200; // Limite sicuro in MB

  constructor() {
    // Inizializza AudioContext solo quando necessario
    this.detectMemoryLimits();
  }

  // Rileva limiti memoria del browser
  private detectMemoryLimits() {
    // Stima conservativa basata su user agent
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    
    if (isMobile) {
      this.maxMemoryMB = 50; // Molto conservativo per mobile
    } else if (isLowEnd) {
      this.maxMemoryMB = 100; // Conservativo per PC low-end
    } else {
      this.maxMemoryMB = 200; // Standard per PC moderni
    }
    
    console.log(`🧠 Limite memoria impostato: ${this.maxMemoryMB}MB`);
  }

  // Controlla se abbiamo abbastanza memoria
  checkMemoryAvailable(fileSizeMB: number, estimatedChunksMB: number): {
    canProcess: boolean;
    reason?: string;
    suggestion?: string;
  } {
    const totalNeededMB = fileSizeMB + estimatedChunksMB;
    
    if (totalNeededMB > this.maxMemoryMB) {
      return {
        canProcess: false,
        reason: `Memoria insufficiente: serve ${totalNeededMB.toFixed(1)}MB, disponibili ~${this.maxMemoryMB}MB`,
        suggestion: 'Usa il backend server per file così grandi, oppure riduci la qualità del file'
      };
    }
    
    if (totalNeededMB > this.maxMemoryMB * 0.8) {
      return {
        canProcess: true,
        reason: `Attenzione: usando ${totalNeededMB.toFixed(1)}MB di ${this.maxMemoryMB}MB disponibili`,
        suggestion: 'Il browser potrebbe rallentare. Considera il backend per prestazioni migliori.'
      };
    }
    
    return { canProcess: true };
  }

  // Aggiorna contatore memoria usata
  private updateMemoryUsage(sizeMB: number, operation: 'add' | 'remove') {
    if (operation === 'add') {
      this.memoryUsage += sizeMB;
    } else {
      this.memoryUsage = Math.max(0, this.memoryUsage - sizeMB);
    }
    console.log(`💾 Memoria usata: ${this.memoryUsage.toFixed(1)}MB / ${this.maxMemoryMB}MB`);
  }

  private async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Analizza il file audio per determinare durata e caratteristiche
  async analyzeAudioFile(file: File): Promise<{
    duration: number;
    sampleRate: number;
    channels: number;
    needsChunking: boolean;
    estimatedChunks: number;
    memoryCheck: {
      canProcess: boolean;
      reason?: string;
      suggestion?: string;
    };
    estimatedMemoryUsageMB: number;
  }> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        const fileSizeMB = file.size / (1024 * 1024);
        const needsChunking = fileSizeMB > 24; // Limite Whisper 25MB
        
        // Calcola chunk necessari basati sulla dimensione del file
        let estimatedChunks = 1;
        if (needsChunking) {
          // Calcola quanti chunk servono per stare sotto i 24MB
          const chunksBySize = Math.ceil(fileSizeMB / 24);
          
          // Verifica anche la durata (max 10 minuti per chunk)
          const chunksByDuration = Math.ceil(duration / (10 * 60));
          
          // Usa il maggiore tra i due per essere sicuri
          estimatedChunks = Math.max(chunksBySize, chunksByDuration);
        }

        // Stima memoria necessaria (WAV non compresso è ~10x più grande)
        const estimatedMemoryUsageMB = fileSizeMB + (fileSizeMB * 10);
        
        // Controlla disponibilità memoria
        const memoryCheck = this.checkMemoryAvailable(fileSizeMB, estimatedMemoryUsageMB);

        URL.revokeObjectURL(url);
        
        resolve({
          duration,
          sampleRate: 44100, // Stima standard
          channels: 2, // Stima standard
          needsChunking,
          estimatedChunks,
          memoryCheck,
          estimatedMemoryUsageMB
        });
      });

      audio.addEventListener('error', () => {
        URL.revokeObjectURL(url);
        reject(new Error('Impossibile analizzare il file audio'));
      });

      audio.src = url;
    });
  }

  // Chunking audio REALE usando Web Audio API
  async chunkAudioFileReal(
    file: File,
    chunkDurationMinutes: number = 10,
    onProgress?: (progress: ChunkingProgress) => void
  ): Promise<AudioChunk[]> {
    
    console.log('🎯 Iniziando chunking audio REALE:', file.name);
    
    onProgress?.({
      phase: 'analyzing',
      currentChunk: 0,
      totalChunks: 0,
      percentage: 5,
      message: 'Decodificando file audio...'
    });

    try {
      const audioContext = await this.getAudioContext();
      console.log('✅ AudioContext creato');
      
      const arrayBuffer = await file.arrayBuffer();
      console.log('✅ File caricato in memoria:', (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB');
      
      onProgress?.({
        phase: 'analyzing',
        currentChunk: 0,
        totalChunks: 0,
        percentage: 15,
        message: 'Analizzando contenuto audio...'
      });

      console.log('🔄 Decodificando audio buffer...');
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      console.log('✅ Audio decodificato:', {
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      });
      
      const duration = audioBuffer.duration;
      const sampleRate = audioBuffer.sampleRate;
      const channels = audioBuffer.numberOfChannels;
      

      // Calcola chunk necessari
      const fileSizeMB = file.size / (1024 * 1024);
      const chunksBySize = Math.ceil(fileSizeMB / 24);
      const chunksByDuration = Math.ceil(duration / (chunkDurationMinutes * 60));
      const totalChunks = Math.max(chunksBySize, chunksByDuration);
      
      const chunkDurationSeconds = duration / totalChunks;
      
      console.log(`📊 Piano chunking:`, {
        totalChunks,
        chunkDurationSeconds: chunkDurationSeconds.toFixed(1),
        chunksBySize,
        chunksByDuration
      });

      onProgress?.({
        phase: 'chunking',
        currentChunk: 0,
        totalChunks,
        percentage: 20,
        message: `Dividendo in ${totalChunks} parti audio reali...`
      });

      const chunks: AudioChunk[] = [];

      for (let i = 0; i < totalChunks; i++) {
        console.log(`🔄 Creando chunk ${i + 1}/${totalChunks}...`);
        
        const startTime = i * chunkDurationSeconds;
        const endTime = Math.min((i + 1) * chunkDurationSeconds, duration);
        const chunkDuration = endTime - startTime;
        
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.floor(endTime * sampleRate);
        const chunkLength = endSample - startSample;

        console.log(`📐 Chunk ${i + 1} parametri:`, {
          startTime: startTime.toFixed(1),
          endTime: endTime.toFixed(1),
          chunkLength,
          startSample,
          endSample
        });
        // Crea nuovo AudioBuffer per questo chunk
        const chunkBuffer = audioContext.createBuffer(channels, chunkLength, sampleRate);
        
        // Copia i dati audio per ogni canale
        for (let channel = 0; channel < channels; channel++) {
          const originalData = audioBuffer.getChannelData(channel);
          const chunkData = chunkBuffer.getChannelData(channel);
          
          for (let sample = 0; sample < chunkLength; sample++) {
            chunkData[sample] = originalData[startSample + sample];
          }
        }

        console.log(`🔄 Convertendo chunk ${i + 1} in WAV...`);
        // Converti AudioBuffer in WAV Blob
        const wavBlob = this.audioBufferToWav(chunkBuffer);
        console.log(`✅ Chunk ${i + 1} creato:`, (wavBlob.size / 1024 / 1024).toFixed(2), 'MB');
        
        chunks.push({
          index: i,
          blob: wavBlob,
          startTime,
          endTime,
          duration: chunkDuration,
          size: wavBlob.size
        });

        onProgress?.({
          phase: 'chunking',
          currentChunk: i + 1,
          totalChunks,
          percentage: 20 + (60 * (i + 1) / totalChunks),
          message: `Creato chunk audio ${i + 1}/${totalChunks} (${chunkDuration.toFixed(1)}s)`
        });

      }

      // Log riassuntivo
      const totalChunkSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
      console.log(`🎉 Chunking completato:`, {
        chunksCreated: chunks.length,
        totalChunkSizeMB: (totalChunkSize / 1024 / 1024).toFixed(2),
        originalSizeMB: (file.size / 1024 / 1024).toFixed(2),
        ratio: ((totalChunkSize / file.size) * 100).toFixed(1) + '%'
      });

      return chunks;

    } catch (error: any) {
      console.error('❌ Errore chunking audio reale:', error);
      console.error('📋 Stack trace:', error.stack);
      
      // Fallback al chunking semplice
      console.warn('⚠️ Fallback al chunking semplice...');
      return this.chunkAudioFileSimple(file, chunkDurationMinutes, onProgress);
    }
  }

  // Fallback: chunking semplice per dimensione (meno preciso ma funziona sempre)
  async chunkAudioFileSimple(
    file: File, 
    chunkDurationMinutes: number = 10,
    onProgress?: (progress: ChunkingProgress) => void
  ): Promise<AudioChunk[]> {
    
    console.log('🔄 Avviando chunking semplice (fallback):', file.name);
    
    const analysis = await this.analyzeAudioFile(file);
    console.log('📊 Analisi file:', analysis);
    
    if (!analysis.needsChunking) {
      console.log('✅ File piccolo, nessun chunking necessario');
      return [{
        index: 0,
        blob: file,
        startTime: 0,
        endTime: analysis.duration,
        duration: analysis.duration,
        size: file.size
      }];
    }

    onProgress?.({
      phase: 'chunking',
      currentChunk: 0,
      totalChunks: analysis.estimatedChunks,
      percentage: 20,
      message: `Dividendo in ${analysis.estimatedChunks} parti (fallback)...`
    });

    const chunks: AudioChunk[] = [];
    const fileSizeMB = file.size / (1024 * 1024);
    const chunksBySize = Math.ceil(fileSizeMB / 24);
    const chunksByDuration = Math.ceil(analysis.duration / (chunkDurationMinutes * 60));
    const totalChunks = Math.max(chunksBySize, chunksByDuration);
    
    const chunkDurationSeconds = analysis.duration / totalChunks;
    const chunkSizeBytes = Math.floor(file.size / totalChunks);

    console.log(`📐 Parametri chunking semplice:`, {
      totalChunks,
      chunkDurationSeconds: chunkDurationSeconds.toFixed(1),
      chunkSizeBytes: (chunkSizeBytes / 1024 / 1024).toFixed(2) + 'MB'
    });
    for (let i = 0; i < totalChunks; i++) {
      console.log(`✂️ Creando chunk semplice ${i + 1}/${totalChunks}...`);
      
      const startTime = i * chunkDurationSeconds;
      const endTime = Math.min((i + 1) * chunkDurationSeconds, analysis.duration);
      const duration = endTime - startTime;
      
      const startByte = i * chunkSizeBytes;
      const endByte = i === totalChunks - 1 ? file.size : (i + 1) * chunkSizeBytes;
      
      const chunkBlob = file.slice(startByte, endByte);
      console.log(`✅ Chunk semplice ${i + 1} creato:`, (chunkBlob.size / 1024 / 1024).toFixed(2), 'MB');

      chunks.push({
        index: i,
        blob: chunkBlob,
        startTime,
        endTime,
        duration,
        size: chunkBlob.size
      });

      onProgress?.({
        phase: 'chunking',
        currentChunk: i + 1,
        totalChunks,
        percentage: 20 + (60 * (i + 1) / totalChunks),
        message: `Creato chunk ${i + 1}/${totalChunks} (fallback)`
      });
    }

    console.log(`🎉 Chunking semplice completato: ${chunks.length} parti`);
    return chunks;
  }

  // Metodo principale che prova prima il chunking reale, poi fallback
  async chunkAudioFile(
    file: File, 
    chunkDurationMinutes: number = 10,
    onProgress?: (progress: ChunkingProgress) => void
  ): Promise<AudioChunk[]> {
    
    console.log('🚀 AudioScribe - INIZIO CHUNKING AUDIO:', file.name);
    console.log('🚀 AudioScribe - 📊 File info:', {
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(2) + 'MB',
      type: file.type
    });
    
    const analysis = await this.analyzeAudioFile(file);
    console.log('🚀 AudioScribe - 📈 Analisi completata:', analysis);
    
    if (!analysis.needsChunking) {
      console.log('🚀 AudioScribe - ✅ File piccolo, nessun chunking necessario');
      return [{
        index: 0,
        blob: file,
        startTime: 0,
        endTime: analysis.duration,
        duration: analysis.duration,
        size: file.size
      }];
    }

    console.log('🚀 AudioScribe - ⚠️ File grande rilevato, tentando chunking audio reale...');
    
    try {
      // Prova chunking audio reale
      console.log('🚀 AudioScribe - 🎯 Tentativo chunking REALE con FFmpeg.js...');
      return await this.chunkAudioFileReal(file, chunkDurationMinutes, onProgress);
    } catch (error) {
      console.warn('🚀 AudioScribe - ⚠️ Chunking reale fallito, usando fallback:', error);
      // Fallback al chunking semplice
      return await this.chunkAudioFileSimple(file, chunkDurationMinutes, onProgress);
    }
  }

  // Converte AudioBuffer in WAV Blob
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM format
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  // Combina i risultati delle trascrizioni
  combineTranscriptions(transcriptions: string[]): string {
    const validTranscriptions = transcriptions
      .filter(text => text && text.trim())
      .map(text => text.trim());
    
    return validTranscriptions.join(' ');
  }

  // Pulisci risorse
  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const audioChunker = new AudioChunker();
export type { AudioChunk, ChunkingProgress };