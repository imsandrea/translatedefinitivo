import { createClient } from '@supabase/supabase-js';
import { audioChunker, type AudioChunk } from './audioChunker';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
      const jobId = `job_${Date.now()}`;

      onProgress({
        stage: 'chunking',
        progress: 10,
        message: 'Analizzando e dividendo il file audio...',
      });

      const chunks = await audioChunker.chunkAudioFile(file, 5, (chunkProgress) => {
        onProgress({
          stage: 'chunking',
          progress: 10 + (chunkProgress.percentage * 0.4),
          message: chunkProgress.message,
          currentChunk: chunkProgress.currentChunk,
          totalChunks: chunkProgress.totalChunks,
        });
      });

      onProgress({
        stage: 'uploading',
        progress: 50,
        message: `Caricamento di ${chunks.length} chunk su Supabase Storage...`,
        totalChunks: chunks.length,
      });

      const chunkPaths: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkPath = `${jobId}/chunk_${i.toString().padStart(3, '0')}.wav`;

        const { error: uploadError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(chunkPath, chunk.blob, {
            contentType: 'audio/wav',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Errore upload chunk ${i}: ${uploadError.message}`);
        }

        chunkPaths.push(chunkPath);

        onProgress({
          stage: 'uploading',
          progress: 50 + ((i + 1) / chunks.length) * 50,
          message: `Caricato chunk ${i + 1}/${chunks.length}`,
          currentChunk: i + 1,
          totalChunks: chunks.length,
        });
      }

      onProgress({
        stage: 'completed',
        progress: 100,
        message: `${chunks.length} chunk caricati con successo!`,
        totalChunks: chunks.length,
      });

      return {
        jobId,
        chunks: chunkPaths,
      };
    } catch (error: any) {
      onProgress({
        stage: 'error',
        progress: 0,
        message: 'Errore durante il chunking e caricamento',
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
