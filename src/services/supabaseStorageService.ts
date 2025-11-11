import { createClient } from '@supabase/supabase-js';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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
  private readonly CHUNK_DURATION_SECONDS = 300;
  private ffmpeg: FFmpeg | null = null;

  private async loadFFmpeg(onProgress: (progress: UploadProgress) => void): Promise<FFmpeg> {
    if (this.ffmpeg) return this.ffmpeg;

    onProgress({
      stage: 'uploading',
      progress: 0,
      message: 'Caricamento FFmpeg...',
    });

    this.ffmpeg = new FFmpeg();

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return this.ffmpeg;
  }

  async uploadAndChunkAudio(
    file: File,
    onProgress: (progress: UploadProgress) => void
  ): Promise<{ jobId: string; chunks: string[] }> {
    try {
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const ffmpeg = await this.loadFFmpeg(onProgress);

      onProgress({
        stage: 'uploading',
        progress: 30,
        message: 'Preparazione file audio...',
      });

      const inputFileName = 'input.' + (file.name.split('.').pop() || 'mp3');
      await ffmpeg.writeFile(inputFileName, await fetchFile(file));

      onProgress({
        stage: 'chunking',
        progress: 0,
        message: 'Analisi durata audio...',
      });

      const duration = await this.getAudioDuration(ffmpeg, inputFileName);
      const totalChunks = Math.ceil(duration / this.CHUNK_DURATION_SECONDS);

      onProgress({
        stage: 'chunking',
        progress: 0,
        message: `Divisione in ${totalChunks} chunk...`,
        totalChunks,
      });

      const chunkPaths: string[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const startTime = i * this.CHUNK_DURATION_SECONDS;
        const outputFileName = `chunk-${i}.mp3`;

        await ffmpeg.exec([
          '-i', inputFileName,
          '-ss', startTime.toString(),
          '-t', this.CHUNK_DURATION_SECONDS.toString(),
          '-acodec', 'libmp3lame',
          '-b:a', '128k',
          outputFileName
        ]);

        const data = await ffmpeg.readFile(outputFileName);
        const chunkBlob = new Blob([data], { type: 'audio/mpeg' });

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
          message: `Chunk ${i + 1}/${totalChunks} processato`,
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

  private async getAudioDuration(ffmpeg: FFmpeg, fileName: string): Promise<number> {
    return new Promise((resolve) => {
      let duration = 0;

      ffmpeg.on('log', ({ message }) => {
        const match = message.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.\d+/);
        if (match) {
          const hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const seconds = parseInt(match[3]);
          duration = hours * 3600 + minutes * 60 + seconds;
        }
      });

      ffmpeg.exec(['-i', fileName]).then(() => {
        resolve(duration || 300);
      }).catch(() => {
        resolve(300);
      });
    });
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
