interface SmartTranscriptionOptions {
  language?: string;
  chunkDurationMinutes?: number;
  temperature?: number;
  prompt?: string;
}

interface SmartTranscriptionProgress {
  phase: 'uploading' | 'processing' | 'transcribing' | 'completed';
  percentage: number;
  message: string;
  currentSegment?: number;
  totalSegments?: number;
}

interface SmartTranscriptionResult {
  success: boolean;
  type: 'video_complete' | 'video_segmented' | 'audio_complete' | 'audio_segmented';
  transcription: string;
  segments?: any[];
  detailedSegments?: any[];
  stats?: {
    totalSegments?: number;
    successfulSegments?: number;
    failedSegments?: number;
    totalWords?: number;
    duration?: number;
    words?: number;
    characters?: number;
  };
  language?: string;
  duration?: number;
}

class SmartTranscriptionService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
  }

  async transcribeFile(
    file: File,
    options: SmartTranscriptionOptions = {},
    onProgress?: (progress: SmartTranscriptionProgress) => void
  ): Promise<SmartTranscriptionResult> {

    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', options.language || 'it');
    formData.append('chunkDurationMinutes', String(options.chunkDurationMinutes || 10));
    formData.append('temperature', String(options.temperature || 0));
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }

    onProgress?.({
      phase: 'uploading',
      percentage: 0,
      message: 'Caricamento file al server...'
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/smart/transcribe`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Errore server: ${response.status}`);
      }

      onProgress?.({
        phase: 'transcribing',
        percentage: 50,
        message: 'Trascrizione in corso sul server...'
      });

      const result: SmartTranscriptionResult = await response.json();

      onProgress?.({
        phase: 'completed',
        percentage: 100,
        message: 'Trascrizione completata!'
      });

      return result;

    } catch (error: any) {
      console.error('Errore SmartTranscriptionService:', error);
      throw new Error(`Trascrizione fallita: ${error.message}`);
    }
  }

  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Server non raggiungibile:', error);
      return false;
    }
  }

  getServerUrl(): string {
    return this.baseUrl;
  }

  setServerUrl(url: string): void {
    this.baseUrl = url;
  }
}

export const smartTranscriptionService = new SmartTranscriptionService();
export type { SmartTranscriptionOptions, SmartTranscriptionProgress, SmartTranscriptionResult };
