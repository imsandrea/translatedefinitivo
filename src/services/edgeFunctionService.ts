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

interface ChunkedJobResult {
  success: boolean;
  jobId: string;
  totalChunks: number;
}

interface JobStatus {
  success: boolean;
  job: {
    id: string;
    status: string;
    completed_chunks: number;
    total_chunks: number;
    transcription_text?: string;
    error_message?: string;
  };
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

  async uploadForChunking(
    audioFile: File,
    language: string = 'it'
  ): Promise<ChunkedJobResult> {
    console.log(`[EdgeService] uploadForChunking - File: ${audioFile.name}, Size: ${audioFile.size}`);

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('language', language);

    const url = `${this.supabaseUrl}/functions/v1/audio-chunked-transcription?action=upload`;
    console.log(`[EdgeService] POST ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.supabaseKey}`,
      },
      body: formData,
    });

    console.log(`[EdgeService] Response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.json();
      console.error(`[EdgeService] Error:`, error);
      throw new Error(error.error || 'Errore durante upload');
    }

    const result = await response.json();
    console.log(`[EdgeService] Upload result:`, result);
    return result;
  }

  async pollJobStatus(
    jobId: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<string> {
    console.log(`[EdgeService] Starting polling for job: ${jobId}`);

    while (true) {
      const status = await this.getJobStatus(jobId);
      const job = status.job;

      console.log(`[EdgeService] Job status: ${job.status}, Progress: ${job.completed_chunks}/${job.total_chunks}`);

      if (onProgress) {
        onProgress(job.completed_chunks, job.total_chunks);
      }

      if (job.status === 'completed') {
        console.log(`[EdgeService] Job completed successfully`);
        return job.transcription_text || '';
      }

      if (job.status === 'failed') {
        throw new Error(job.error_message || 'Trascrizione fallita');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(
      `${this.supabaseUrl}/functions/v1/audio-chunked-transcription?action=status&jobId=${jobId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore durante verifica stato');
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
export type { TranscriptionResult, ChunkedJobResult, JobStatus };
