interface AudioAnalysis {
  fileId: string;
  originalName: string;
  audioInfo: {
    duration: number;
    size: number;
    format: string;
    bitrate: number;
    sampleRate: number;
    channels: number;
    codec: string;
  };
  fileSizeMB: string;
  needsSplitting: boolean;
  estimatedSegments: number;
  estimatedCost: string;
}

interface VideoAnalysis {
  fileId: string;
  originalName: string;
  videoInfo: {
    duration: number;
    size: number;
    format: string;
    bitrate: number;
    videoCodec: string;
    width: number;
    height: number;
    fps: number;
    hasAudio: boolean;
    audioCodec?: string;
    audioSampleRate?: number;
    audioChannels?: number;
  };
  fileSizeMB: string;
  estimatedAudioSizeMB: string;
  needsSegmentation: boolean;
  estimatedSegments: number;
  estimatedCost: string;
}

interface AudioExtractionResult {
  success: boolean;
  extraction: {
    sessionId: string;
    method: 'direct' | 'segmented';
    segments: Array<{
      index: number;
      path: string;
      filename: string;
      startTime: number;
      endTime: number;
      duration: number;
      size: number;
    }>;
  };
  videoInfo: any;
  processingTime: number;
}

interface TranscriptionResult {
  success: boolean;
  transcription: {
    fullText: string;
    segments: Array<{
      index: number;
      startTime: number;
      endTime: number;
      text: string;
      duration: number;
      error?: string;
    }>;
    method: 'direct' | 'segmented';
    totalSegments: number;
    successfulSegments: number;
    failedSegments: number;
    sessionId?: string;
  };
  audioInfo: any;
  processingTime: number;
}

interface TranscriptionOptions {
  language?: string;
  response_format?: string;
  temperature?: number;
  prompt?: string;
}

class BackendService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
  }

  // Analizza file video
  async analyzeVideo(videoFile: File): Promise<VideoAnalysis> {
    const formData = new FormData();
    formData.append('video', videoFile);

    const response = await fetch(`${this.baseUrl}/transcription/analyze-video`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore analisi video');
    }

    return response.json();
  }

  // Estrai audio da video
  async extractAudioFromVideo(
    fileId: string,
    options: any = {},
    onProgress?: (progress: { percentage: number; message: string }) => void
  ): Promise<AudioExtractionResult> {
    
    if (onProgress) {
      onProgress({ percentage: 10, message: 'Avvio estrazione audio...' });
    }

    const response = await fetch(`${this.baseUrl}/transcription/extract-audio/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ options })
    });

    if (onProgress) {
      onProgress({ percentage: 90, message: 'Finalizzazione estrazione...' });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore estrazione audio');
    }

    const result = await response.json();
    
    if (onProgress) {
      onProgress({ percentage: 100, message: 'Estrazione completata!' });
    }

    return result;
  }

  // Trascrivi video (estrazione + trascrizione)
  async transcribeVideo(
    fileId: string,
    options: TranscriptionOptions = {},
    onProgress?: (progress: { percentage: number; message: string }) => void
  ): Promise<TranscriptionResult> {
    
    if (onProgress) {
      onProgress({ percentage: 5, message: 'Avvio elaborazione video...' });
    }

    const response = await fetch(`${this.baseUrl}/transcription/transcribe-video/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ options })
    });

    if (onProgress) {
      onProgress({ percentage: 95, message: 'Finalizzazione trascrizione...' });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore trascrizione video');
    }

    const result = await response.json();
    
    if (onProgress) {
      onProgress({ percentage: 100, message: 'Trascrizione video completata!' });
    }

    return result;
  }

  // Genera thumbnail video
  async generateVideoThumbnail(
    fileId: string,
    options: { timeOffset?: string; width?: number; height?: number } = {}
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/transcription/video-thumbnail/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore generazione thumbnail');
    }

    return response.blob();
  }

  // Analizza file audio
  async analyzeAudio(audioFile: File): Promise<AudioAnalysis> {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const response = await fetch(`${this.baseUrl}/transcription/analyze`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore analisi file');
    }

    return response.json();
  }

  // Trascrivi file audio
  async transcribeAudio(
    fileId: string, 
    options: TranscriptionOptions = {},
    onProgress?: (progress: { percentage: number; message: string }) => void
  ): Promise<TranscriptionResult> {
    
    // Simula progresso per file grandi
    if (onProgress) {
      onProgress({ percentage: 10, message: 'Avvio trascrizione...' });
    }

    const response = await fetch(`${this.baseUrl}/transcription/transcribe/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ options })
    });

    if (onProgress) {
      onProgress({ percentage: 90, message: 'Finalizzazione...' });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore trascrizione');
    }

    const result = await response.json();
    
    if (onProgress) {
      onProgress({ percentage: 100, message: 'Completato!' });
    }

    return result;
  }

  // Genera sottotitoli
  async generateSubtitles(
    fileId: string, 
    segments: any[], 
    format: 'srt' | 'vtt' = 'srt'
  ): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/transcription/subtitles/${fileId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ format, segments })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore generazione sottotitoli');
    }

    return response.blob();
  }

  // Pulisci file dal server
  async cleanupFile(fileId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/transcription/cleanup/${fileId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore pulizia file');
    }
  }

  // Verifica stato server
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const backendService = new BackendService();
export type { AudioAnalysis, VideoAnalysis, AudioExtractionResult, TranscriptionResult, TranscriptionOptions };