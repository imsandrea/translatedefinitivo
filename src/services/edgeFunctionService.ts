interface TranscriptionResult {
  success: boolean;
  text: string;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  duration?: number;
  language?: string;
}

class EdgeFunctionService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    this.supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  }

  async transcribeAudio(
    audioFile: File,
    options: {
      language?: string;
      prompt?: string;
    } = {}
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', audioFile);

    if (options.language) {
      formData.append('language', options.language);
    }

    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }

    const response = await fetch(
      `${this.supabaseUrl}/functions/v1/audio-transcription`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore durante la trascrizione');
    }

    return response.json();
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/audio-transcription`,
        {
          method: 'OPTIONS',
          headers: {
            'Authorization': `Bearer ${this.supabaseKey}`,
          },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const edgeFunctionService = new EdgeFunctionService();
export type { TranscriptionResult };
