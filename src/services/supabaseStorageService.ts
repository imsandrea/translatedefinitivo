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
    onProgress: (progress: UploadProgress) => void,
    forceChunking: boolean = false
  ): Promise<{ jobId: string; chunks: string[] }> {
    try {
      const jobId = `job_${Date.now()}`;
      const fileSizeMB = file.size / (1024 * 1024);

      if (fileSizeMB <= 24 && !forceChunking) {
        onProgress({
          stage: 'uploading',
          progress: 20,
          message: 'File piccolo, caricamento diretto...',
        });

        const fileExtension = file.name.split('.').pop() || 'mp3';
        const chunkPath = `${jobId}/chunk_000.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(chunkPath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Errore upload: ${uploadError.message}`);
        }

        onProgress({
          stage: 'completed',
          progress: 100,
          message: 'File caricato con successo!',
          totalChunks: 1,
        });

        return {
          jobId,
          chunks: [chunkPath],
        };
      }

      onProgress({
        stage: 'chunking',
        progress: 10,
        message: 'File grande, dividendo in parti...',
      });

      const analysis = await audioChunker.analyzeAudioFile(file);
      const totalChunks = analysis.estimatedChunks;
      const chunkSizeBytes = Math.floor(file.size / totalChunks);
      const fileExtension = file.name.split('.').pop() || 'mp3';

      onProgress({
        stage: 'uploading',
        progress: 20,
        message: `Caricamento di ${totalChunks} parti...`,
        totalChunks,
      });

      const chunkPaths: string[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const startByte = i * chunkSizeBytes;
        const endByte = i === totalChunks - 1 ? file.size : (i + 1) * chunkSizeBytes;
        const chunkBlob = file.slice(startByte, endByte, file.type);

        const chunkPath = `${jobId}/chunk_${i.toString().padStart(3, '0')}.${fileExtension}`;

        const { error: uploadError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .upload(chunkPath, chunkBlob, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Errore upload chunk ${i}: ${uploadError.message}`);
        }

        chunkPaths.push(chunkPath);

        onProgress({
          stage: 'uploading',
          progress: 20 + ((i + 1) / totalChunks) * 80,
          message: `Caricato chunk ${i + 1}/${totalChunks}`,
          currentChunk: i + 1,
          totalChunks,
        });
      }

      onProgress({
        stage: 'completed',
        progress: 100,
        message: `${totalChunks} chunk caricati con successo!`,
        totalChunks,
      });

      return {
        jobId,
        chunks: chunkPaths,
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
