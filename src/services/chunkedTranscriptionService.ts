import { supabaseStorageService, type UploadProgress } from './supabaseStorageService';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export class ChunkedTranscriptionService {
  async transcribeFile(
    file: File,
    language: string,
    _openaiApiKey: string,
    onProgress: (progress: UploadProgress) => void,
    forceChunking: boolean = false
  ): Promise<string> {
    const { jobId, chunks } = await supabaseStorageService.uploadAndChunkAudio(
      file,
      onProgress,
      forceChunking
    );

    try {
      const transcriptions: string[] = [];

      onProgress({
        stage: 'transcribing',
        progress: 0,
        message: 'Inizio trascrizione chunk...',
        currentChunk: 0,
        totalChunks: chunks.length,
      });

      for (let i = 0; i < chunks.length; i++) {
        const chunkPath = chunks[i];

        const response = await fetch(
          `${supabaseUrl}/functions/v1/process-audio-chunks`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chunkPath,
              language,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `Chunk ${i + 1} transcription failed: ${errorData.error || 'Unknown error'}`
          );
        }

        const data = await response.json();
        transcriptions.push(data.transcription);

        const progress = Math.round(((i + 1) / chunks.length) * 100);
        onProgress({
          stage: 'transcribing',
          progress,
          message: `Trascrizione chunk ${i + 1}/${chunks.length}`,
          currentChunk: i + 1,
          totalChunks: chunks.length,
        });
      }

      onProgress({
        stage: 'completed',
        progress: 100,
        message: 'Trascrizione completata!',
      });

      await supabaseStorageService.deleteJob(jobId);

      return transcriptions.join('\n\n');
    } catch (error: any) {
      await supabaseStorageService.deleteJob(jobId);
      throw error;
    }
  }
}

export const chunkedTranscriptionService = new ChunkedTranscriptionService();
