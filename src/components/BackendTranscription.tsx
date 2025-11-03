import React, { useState } from 'react';
import { Server, Upload, Zap, AlertCircle, CheckCircle, Clock, HardDrive, Video, Music, Rocket, Cloud } from 'lucide-react';
import { edgeFunctionService } from '../services/edgeFunctionService';

interface BackendTranscriptionProps {
  audioFile: File | null;
  onTranscriptionResult: (text: string) => void;
}

export const BackendTranscription: React.FC<BackendTranscriptionProps> = ({
  audioFile,
  onTranscriptionResult
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<boolean | null>(null);
  const [language, setLanguage] = useState('it');

  React.useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    const isOnline = await edgeFunctionService.checkHealth();
    setServerStatus(isOnline);
  };

  const startSmartTranscription = async () => {
    if (!audioFile) return;

    const maxSize = 25 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      setError('File troppo grande. Massimo 25MB. Usa la modalità "Browser (Chunking)" per file più grandi.');
      return;
    }

    setIsTranscribing(true);
    setError(null);
    setProgress(10);

    try {
      console.log('🚀 Invio file a Supabase Edge Function...');

      setProgress(30);

      const result = await edgeFunctionService.transcribeAudio(audioFile, {
        language,
      });

      console.log('✅ Trascrizione completata:', result);

      setProgress(90);

      if (result.success && result.text) {
        onTranscriptionResult(result.text);
      }

      setProgress(100);

    } catch (err: any) {
      console.error('❌ Errore trascrizione:', err);
      setError(err.message);
    } finally {
      setIsTranscribing(false);
      setTimeout(() => setProgress(0), 3000);
    }
  };

  if (serverStatus === false) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Servizio Cloud in Attesa
          </h3>
          <p className="text-gray-600 mb-4">
            Il servizio di trascrizione cloud Supabase non è ancora pronto.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-blue-800 mb-2">
              La Edge Function Supabase potrebbe impiegare alcuni secondi per attivarsi al primo avvio.
            </p>
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

  const isVideo = audioFile ? audioFile.type.startsWith('video/') : false;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            <Cloud className="w-6 h-6 inline-block mr-2 text-blue-600" />
            Trascrizione Cloud
          </h3>
          <p className="text-sm text-gray-600">
            Elaborazione serverless con Supabase Edge Functions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <span className="text-sm font-medium text-green-600">Online</span>
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
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-4 px-4 rounded-lg transition-all flex items-center justify-center space-x-3 shadow-lg font-semibold"
        >
          <Cloud className="w-6 h-6" />
          <span className="text-lg">
            {isTranscribing
              ? 'Trascrizione Cloud in corso...'
              : 'Avvia Trascrizione Cloud'
            }
          </span>
        </button>
      )}

      {progress > 0 && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
            <span className="font-medium">Elaborazione in corso...</span>
            <span className="font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-600 to-cyan-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
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
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          Vantaggi Trascrizione Cloud
        </h4>
        <div className="text-sm text-gray-700 space-y-1.5">
          <p>✅ <strong>Serverless</strong> - nessun server da gestire</p>
          <p>✅ <strong>Sempre disponibile</strong> - infrastruttura Supabase</p>
          <p>✅ <strong>Zero configurazione</strong> - funziona subito</p>
          <p>✅ <strong>Sicuro</strong> - API key protette lato server</p>
          <p>✅ <strong>Scalabile</strong> - gestisce carichi elevati automaticamente</p>
          <p>⚠️ <strong>Limite: 25MB</strong> - per file più grandi usa il chunking browser</p>
        </div>
      </div>
    </div>
  );
};