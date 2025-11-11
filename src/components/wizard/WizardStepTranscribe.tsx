import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { chunkedTranscriptionService } from '../../services/chunkedTranscriptionService';
import type { UploadProgress } from '../../services/supabaseStorageService';

interface AudioSession {
  file: File;
  language: string;
  audioType: string;
  forceChunking?: boolean;
}

interface WizardStepTranscribeProps {
  session: AudioSession;
  onTranscriptionComplete: (transcription: string) => void;
  onBack: () => void;
}

export function WizardStepTranscribe({
  session,
  onTranscriptionComplete,
  onBack,
}: WizardStepTranscribeProps) {
  const [progress, setProgress] = useState<UploadProgress>({
    stage: 'uploading',
    progress: 0,
    message: 'Inizializzazione...',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startTranscription();
  }, []);

  const startTranscription = async () => {
    const openaiApiKey = localStorage.getItem('openai_api_key');
    if (!openaiApiKey) {
      setError('API Key OpenAI non configurata. Vai in Impostazioni per configurarla.');
      return;
    }

    try {
      const transcription = await chunkedTranscriptionService.transcribeFile(
        session.file,
        session.language,
        openaiApiKey,
        (progressUpdate) => {
          setProgress(progressUpdate);
        },
        session.forceChunking || false
      );

      onTranscriptionComplete(transcription);
    } catch (err: any) {
      console.error('Errore trascrizione:', err);
      setError(err.message);
      setProgress({
        stage: 'error',
        progress: 0,
        message: 'Errore durante la trascrizione',
        error: err.message,
      });
    }
  };

  const getStageLabel = () => {
    switch (progress.stage) {
      case 'uploading':
        return 'Caricamento file su server sicuro...';
      case 'chunking':
        return 'Preparazione chunk per l\'elaborazione...';
      case 'transcribing':
        return 'Trascrizione in corso con OpenAI Whisper...';
      case 'completed':
        return 'Trascrizione completata con successo!';
      case 'error':
        return 'Si è verificato un errore';
      default:
        return 'Elaborazione in corso...';
    }
  };

  const getStageIcon = () => {
    if (progress.stage === 'completed') {
      return <CheckCircle className="w-16 h-16 text-green-500" />;
    }
    if (progress.stage === 'error') {
      return <XCircle className="w-16 h-16 text-red-500" />;
    }
    return <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />;
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Trascrizione in corso
        </h2>
        <p className="text-gray-600">
          Questo processo può richiedere alcuni minuti
        </p>
      </div>

      <div className="flex flex-col items-center space-y-6">
        <div className="flex justify-center">
          {getStageIcon()}
        </div>

        <div className="w-full max-w-md">
          <div className="mb-4">
            <p className="text-center font-medium text-gray-900 mb-2">
              {getStageLabel()}
            </p>
            <p className="text-center text-sm text-gray-600">
              {progress.message}
            </p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress.stage === 'error'
                  ? 'bg-red-500'
                  : progress.stage === 'completed'
                  ? 'bg-green-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${progress.progress}%` }}
            />
          </div>

          <div className="mt-2 text-center">
            <span className="text-2xl font-bold text-gray-900">
              {progress.progress}%
            </span>
          </div>
        </div>

        {progress.totalChunks && progress.currentChunk !== undefined && (
          <div className="w-full max-w-md bg-gray-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">
                Progresso Chunk
              </span>
              <span className="text-sm font-bold text-gray-900">
                {progress.currentChunk}/{progress.totalChunks}
              </span>
            </div>
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: progress.totalChunks }).map((_, index) => (
                <div
                  key={index}
                  className={`h-3 rounded transition-all ${
                    index < (progress.currentChunk || 0)
                      ? 'bg-green-500 shadow-sm'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="w-full max-w-md bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-800 mb-2">
              Errore:
            </p>
            <p className="text-sm text-red-700">
              {error}
            </p>
            <button
              onClick={onBack}
              className="mt-4 w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              Torna Indietro
            </button>
          </div>
        )}

        {progress.stage === 'transcribing' && (
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">
              La trascrizione sta avvenendo su server cloud sicuri
            </p>
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Server attivo</span>
            </div>
          </div>
        )}
      </div>

      {progress.stage === 'completed' && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">
              Trascrizione pronta! Procedi all'editor
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
