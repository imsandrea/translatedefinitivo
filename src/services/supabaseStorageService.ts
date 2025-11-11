import { createClient } from '@supabase/supabase-js';

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
  private readonly CHUNK_SIZE_MB = 5;

  async uploadAndChunkAudio(
    file: File,
    onProgress: (progress: UploadProgress) => void
  ): Promise<{ jobId: string; chunks: string[] }> {
    try {
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${jobId}/${file.name}`;

      onProgress({
        stage: 'uploading',
        progress: 0,
        message: `Caricamento file: ${file.name}...`,
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      onProgress({
        stage: 'uploading',
        progress: 100,
        message: 'File caricato con successo!',
      });

      const chunkSizeBytes = this.CHUNK_SIZE_MB * 1024 * 1024;
      const totalChunks = Math.ceil(file.size / chunkSizeBytes);

      onProgress({
        stage: 'chunking',
        progress: 0,
        message: `Divisione in ${totalChunks} chunk...`,
        totalChunks,
      });

      const chunkPaths: string[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSizeBytes;
        const end = Math.min(start + chunkSizeBytes, file.size);
        const chunkBlob = file.slice(start, end);

        const chunkFileName = `${jobId}/chunk-${i}.mp3`;

        const { error: chunkError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(chunkFileName, chunkBlob, {
            cacheControl: '3600',
            upsert: false,
          });

        if (chunkError) {
          throw new Error(`Chunk ${i} upload failed: ${chunkError.message}`);
        }

        chunkPaths.push(chunkFileName);

        const progress = Math.round(((i + 1) / totalChunks) * 100);
        onProgress({
          stage: 'chunking',
          progress,
          message: `Chunk ${i + 1}/${totalChunks} caricato`,
          currentChunk: i + 1,
          totalChunks,
        });
      }

      return { jobId, chunks: chunkPaths };
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
