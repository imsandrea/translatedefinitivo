interface ProcessingProgress {
  phase: 'uploading' | 'extracting' | 'chunking' | 'transcribing' | 'complete';
  percentage: number;
  message: string;
  currentChunk?: number;
  totalChunks?: number;
}

interface ChunkInfo {
  index: number;
  duration: number;
  startTime: number;
  endTime: number;
  sizeMB: string;
}

interface ProcessingResult {
  success: boolean;
  sessionId: string;
  isVideo: boolean;
  needsChunking: boolean;
  chunks: ChunkInfo[];
  audioInfo: {
    duration: number;
    format: string;
  };
  transcription?: {
    fullText: string;
    segments: any[];
    totalDuration: number;
  };
  message: string;
}

class ServerProcessingService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  }

  async processFile(
    file: File,
    options: {
      transcribeNow?: boolean;
      language?: string;
      chunkDurationMinutes?: number;
    } = {},
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {

    const {
      transcribeNow = true,
      language = 'it',
      chunkDurationMinutes = 10
    } = options;

    try {
      // Fase 1: Upload
      onProgress?.({
        phase: 'uploading',
        percentage: 10,
        message: 'Caricamento file sul server...'
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('transcribeNow', transcribeNow.toString());
      formData.append('language', language);
      formData.append('chunkDurationMinutes', chunkDurationMinutes.toString());

      console.log('🚀 Invio file al server per elaborazione completa...');
      console.log('📁 File:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      console.log('🎯 Trascrizione immediata:', transcribeNow);

      // Fase 2-4: Il server gestisce estrazione, chunking, trascrizione
      onProgress?.({
        phase: 'extracting',
        percentage: 30,
        message: 'Il server sta elaborando il file...'
      });

      const response = await fetch(`${this.baseUrl}/api/upload/process-file`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Errore server: ${response.status}`);
      }

      const result: ProcessingResult = await response.json();

      console.log('✅ Elaborazione server completata:', result);

      // Fase finale
      onProgress?.({
        phase: 'complete',
        percentage: 100,
        message: result.message
      });

      return result;

    } catch (error: any) {
      console.error('❌ Errore elaborazione server:', error);
      throw new Error(`Errore elaborazione: ${error.message}`);
    }
  }

  async transcribeSession(
    sessionId: string,
    language: string = 'it',
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {

    try {
      onProgress?.({
        phase: 'transcribing',
        percentage: 10,
        message: 'Avvio trascrizione sessione...'
      });

      console.log('🎤 Richiesta trascrizione sessione:', sessionId);

      const response = await fetch(
        `${this.baseUrl}/api/upload/transcribe-session/${sessionId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ language })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Errore server: ${response.status}`);
      }

      const result: ProcessingResult = await response.json();

      console.log('✅ Trascrizione sessione completata:', result);

      onProgress?.({
        phase: 'complete',
        percentage: 100,
        message: 'Trascrizione completata'
      });

      return result;

    } catch (error: any) {
      console.error('❌ Errore trascrizione sessione:', error);
      throw new Error(`Errore trascrizione: ${error.message}`);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const serverProcessingService = new ServerProcessingService();
export type { ProcessingProgress, ProcessingResult, ChunkInfo };
