import { CheckCircle, XCircle, Loader2, Upload, Scissors, FileAudio } from 'lucide-react';
import type { UploadProgress } from '../services/supabaseStorageService';

interface TranscriptionProgressModalProps {
  isOpen: boolean;
  progress: UploadProgress;
  onClose: () => void;
}

export function TranscriptionProgressModal({
  isOpen,
  progress,
  onClose,
}: TranscriptionProgressModalProps) {
  if (!isOpen) return null;

  const getStageIcon = () => {
    switch (progress.stage) {
      case 'uploading':
        return <Upload className="w-6 h-6 text-blue-500" />;
      case 'chunking':
        return <Scissors className="w-6 h-6 text-purple-500" />;
      case 'transcribing':
        return <FileAudio className="w-6 h-6 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Loader2 className="w-6 h-6 animate-spin text-gray-500" />;
    }
  };

  const getStageLabel = () => {
    switch (progress.stage) {
      case 'uploading':
        return 'Caricamento';
      case 'chunking':
        return 'Divisione File';
      case 'transcribing':
        return 'Trascrizione';
      case 'completed':
        return 'Completato';
      case 'error':
        return 'Errore';
      default:
        return 'Elaborazione';
    }
  };

  const canClose = progress.stage === 'completed' || progress.stage === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            {getStageIcon()}
            <h2 className="text-xl font-semibold text-gray-900">{getStageLabel()}</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {progress.message}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {progress.progress}%
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
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
            </div>

            {progress.totalChunks && progress.currentChunk !== undefined && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Progresso Chunk</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {progress.currentChunk}/{progress.totalChunks}
                  </span>
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: progress.totalChunks }).map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded ${
                        index < (progress.currentChunk || 0)
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {progress.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{progress.error}</p>
              </div>
            )}

            {progress.stage === 'transcribing' && (
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Elaborazione con OpenAI Whisper...</span>
              </div>
            )}
          </div>

          {canClose && (
            <div className="mt-6">
              <button
                onClick={onClose}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  progress.stage === 'error'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {progress.stage === 'error' ? 'Chiudi' : 'Continua'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
