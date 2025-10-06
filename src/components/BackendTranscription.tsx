import React, { useState } from 'react';
import { Server, Upload, Zap, AlertCircle, CheckCircle, Clock, HardDrive, Video, Music, Rocket } from 'lucide-react';
import { smartTranscriptionService, SmartTranscriptionProgress } from '../services/smartTranscriptionService';
import { videoProcessor } from '../services/videoProcessor';

interface BackendTranscriptionProps {
  audioFile: File | null;
  onTranscriptionResult: (text: string) => void;
}

export const BackendTranscription: React.FC<BackendTranscriptionProps> = ({
  audioFile,
  onTranscriptionResult
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState<SmartTranscriptionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<boolean | null>(null);
  const [language, setLanguage] = useState('it');

  React.useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    const isOnline = await smartTranscriptionService.checkServerHealth();
    setServerStatus(isOnline);
  };

  const startSmartTranscription = async () => {
    if (!audioFile) return;

    setIsTranscribing(true);
    setError(null);
    setProgress({
      phase: 'uploading',
      percentage: 0,
      message: 'Preparazione...'
    });

    try {
      console.log('🚀 [FRONTEND] Invio file al server per trascrizione smart...');

      const result = await smartTranscriptionService.transcribeFile(
        audioFile,
        {
          language,
          chunkDurationMinutes: 10,
          temperature: 0
        },
        (progressUpdate) => {
          setProgress(progressUpdate);
          console.log(`📊 [FRONTEND] Progresso: ${progressUpdate.message} (${progressUpdate.percentage}%)`);
        }
      );

      console.log('✅ [FRONTEND] Trascrizione completata:', result);

      onTranscriptionResult(result.transcription);

      setProgress({
        phase: 'completed',
        percentage: 100,
        message: 'Completato!'
      });

    } catch (err: any) {
      console.error('❌ [FRONTEND] Errore trascrizione:', err);
      setError(err.message);
    } finally {
      setIsTranscribing(false);
      setTimeout(() => setProgress(null), 3000);
    }
  };

  // Server offline
  if (serverStatus === false) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Server Backend Non Disponibile
          </h3>
          <p className="text-gray-600 mb-4">
            Il server per l'elaborazione audio/video non è raggiungibile.
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
            <h4 className="font-medium text-red-800 mb-2">Per avviare il backend:</h4>
            <ol className="text-sm text-red-700 space-y-1">
              <li className="flex items-start space-x-2">
                <span className="font-bold text-red-800">1.</span>
                <div>
                  <p className="font-medium">Installa FFmpeg (OBBLIGATORIO):</p>
                  <div className="mt-1 space-y-1">
                    <p><strong>Windows:</strong> Scarica da ffmpeg.org e aggiungi al PATH</p>
                    <p><strong>macOS:</strong> <code className="bg-red-100 px-1 rounded">brew install ffmpeg</code></p>
                    <p><strong>Linux:</strong> <code className="bg-red-100 px-1 rounded">sudo apt install ffmpeg</code></p>
                  </div>
                </div>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-red-800">2.</span>
                <div>
                  <p>Apri terminale in <code className="bg-red-100 px-1 rounded">server/</code></p>
                  <p><code className="bg-red-100 px-1 rounded">cd server && npm install</code></p>
                </div>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-red-800">3.</span>
                <div>
                  <p>Configura <code className="bg-red-100 px-1 rounded">.env</code> con la tua API Key OpenAI</p>
                </div>
              </li>
              <li className="flex items-start space-x-2">
                <span className="font-bold text-red-800">4.</span>
                <div>
                  <p>Avvia server: <code className="bg-red-100 px-1 rounded">npm run dev</code></p>
                </div>
              </li>
            </ol>
            
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ FFmpeg è essenziale</strong> per elaborare video e audio grandi!
              </p>
            </div>
          </div>

          <button
            onClick={checkServerStatus}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Riprova Connessione
          </button>
        </div>
      </div>
    );
  }

  const isVideo = audioFile ? videoProcessor.isVideoFile(audioFile) : false;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            <Rocket className="w-6 h-6 inline-block mr-2 text-blue-600" />
            Trascrizione Smart Server
          </h3>
          <p className="text-sm text-gray-600">
            Elaborazione automatica: video → audio → chunk → whisper
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Server className="w-5 h-5 text-green-500" />
          <span className="text-sm font-medium text-green-600">Server Online</span>
        </div>
      </div>

      {audioFile && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            {isVideo ? (
              <Video className="w-8 h-8 text-green-600" />
            ) : (
              <Music className="w-8 h-8 text-blue-600" />
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-800">{audioFile.name}</p>
              <p className="text-sm text-gray-600">
                {(audioFile.size / 1024 / 1024).toFixed(2)} MB • {isVideo ? 'Video' : 'Audio'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Language Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lingua Audio
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="it">🇮🇹 Italiano</option>
          <option value="en">🇺🇸 Inglese</option>
          <option value="es">🇪🇸 Spagnolo</option>
          <option value="fr">🇫🇷 Francese</option>
          <option value="de">🇩🇪 Tedesco</option>
        </select>
      </div>

      {/* Smart Transcription Button */}
      {audioFile && (
        <button
          onClick={startSmartTranscription}
          disabled={isTranscribing}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-4 px-4 rounded-lg transition-all flex items-center justify-center space-x-3 shadow-lg font-semibold"
        >
          <Rocket className="w-6 h-6" />
          <span className="text-lg">
            {isTranscribing
              ? 'Elaborazione in corso sul server...'
              : 'Avvia Trascrizione Smart Server'
            }
          </span>
        </button>
      )}

      {/* Progress Bar */}
      {progress && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
            <span className="font-medium">{progress.message}</span>
            <span className="font-bold text-blue-600">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          {progress.currentSegment && progress.totalSegments && (
            <div className="mt-2 text-xs text-gray-600">
              Segmento {progress.currentSegment} di {progress.totalSegments}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          Vantaggi Trascrizione Smart Server
        </h4>
        <div className="text-sm text-gray-700 space-y-1.5">
          <p>✅ <strong>Zero carico sul browser</strong> - tutto il lavoro pesante sul server</p>
          <p>✅ <strong>Video supportati</strong> - estrazione automatica audio con FFmpeg</p>
          <p>✅ <strong>File grandi OK</strong> - chunking automatico lato server</p>
          <p>✅ <strong>Molto più veloce</strong> - FFmpeg nativo vs browser</p>
          <p>✅ <strong>Pulizia automatica</strong> - file temporanei eliminati dopo trascrizione</p>
          <p>✅ <strong>Limite: 500MB</strong> - audio o video</p>
        </div>
      </div>
    </div>
  );
};