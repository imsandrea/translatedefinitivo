import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase credentials not found in environment');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UploadProgress {
  stage: 'uploading' | 'chunking' | 'transcribing' | 'completed' | 'error';
  progress: number;
  message: string;
  currentChunk?: number;
  totalChunks?: number;
  error?: string;
}

export class SupabaseStorageService {
  private readonly BUCKET_NAME = 'audio-files';

  async uploadAndChunkAudio(
    file: File,
    onProgress: (progress: UploadProgress) => void
  ): Promise<{ jobId: string; chunks: string[] }> {
    try {
      onProgress({
        stage: 'uploading',
        progress: 0,
        message: `Caricamento file: ${file.name}...`,
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('chunkDurationMinutes', '5');

      const response = await fetch(`${backendUrl}/api/supabase/upload-and-chunk`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      onProgress({
        stage: 'completed',
        progress: 100,
        message: `${data.totalChunks} chunk creati con successo!`,
        totalChunks: data.totalChunks,
      });

      return {
        jobId: data.jobId,
        chunks: data.chunks,
      };
    } catch (error: any) {
      onProgress({
        stage: 'error',
        progress: 0,
        message: 'Errore durante il caricamento',
        error: error.message,
      });
      throw error;
    }
  }

  async getChunkUrl(chunkPath: string): Promise<string> {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(chunkPath);

    return data.publicUrl;
  }

  async deleteJob(jobId: string): Promise<void> {
    const { data: files, error: listError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .list(jobId);

    if (listError || !files) {
      console.error('Error listing files:', listError);
      return;
    }

    const filePaths = files.map((file) => `${jobId}/${file.name}`);

    const { error: deleteError } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove(filePaths);

    if (deleteError) {
      console.error('Error deleting files:', deleteError);
    }
  }
}

export const supabaseStorageService = new SupabaseStorageService();
