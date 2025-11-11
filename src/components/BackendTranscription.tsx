import React, { useState } from 'react';
import { Server, Upload, Zap, AlertCircle, CheckCircle, Clock, HardDrive, Video, Music, Rocket, Cloud } from 'lucide-react';
import { edgeFunctionService } from '../services/edgeFunctionService';
import { chunkedTranscriptionService } from '../services/chunkedTranscriptionService';
import { TranscriptionProgressModal } from './TranscriptionProgressModal';
import type { UploadProgress } from '../services/supabaseStorageService';

interface BackendTranscriptionProps {
  audioFile: File | null;
  onTranscriptionResult: (text: string) => void;
  onShowEditor?: () => void;
}

export const BackendTranscription: React.FC<BackendTranscriptionProps> = ({
  audioFile,
  onTranscriptionResult,
  onShowEditor
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<boolean | null>(null);
  const [language, setLanguage] = useState('it');
  const [conversationType, setConversationType] = useState<'meeting' | 'interview' | 'lecture' | 'other'>('meeting');
  const [transcriptionCompleted, setTranscriptionCompleted] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    stage: 'uploading',
    progress: 0,
    message: 'Inizializzazione...',
  });

  React.useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    const isOnline = await edgeFunctionService.checkHealth();
    setServerStatus(isOnline);
  };

  const startSmartTranscription = async () => {
    console.log('🔘 Pulsante cliccato! audioFile:', audioFile ? `${audioFile.name} (${audioFile.size})` : 'NULL');

    if (!audioFile) {
      console.log('❌ Nessun file caricato');
      return;
    }

    const fileSizeMB = (audioFile.size / 1024 / 1024).toFixed(2);
    console.log(`\n🎬 ========== INIZIO TRASCRIZIONE ==========`);
    console.log(`📊 File: ${audioFile.name}`);
    console.log(`📦 Dimensione: ${fileSizeMB} MB`);
    console.log(`🌍 Lingua: ${language}`);

    setIsTranscribing(true);
    setError(null);
    setProgress(5);

    try {
      const smallFileLimit = 25 * 1024 * 1024;

      if (audioFile.size <= smallFileLimit) {
        console.log(`\n✅ File piccolo (≤25MB) - Trascrizione diretta`);
        setProgress(10);

        const result = await edgeFunctionService.transcribeAudio(audioFile, {
          language,
        });

        console.log(`✅ Trascrizione completata!`);
        setProgress(90);

        if (result.success && result.text) {
          onTranscriptionResult(result.text);
          setTranscriptionCompleted(true);
        }

        setProgress(100);
        setTimeout(() => {
          setIsTranscribing(false);
          setProgress(0);
        }, 2000);

      } else {
        console.log(`\n⚡ File grande (>25MB) - Chunking con retry`);
        console.log(`📤 FASE 1/3: Upload file su Supabase Storage...`);
        setProgress(10);

        const uploadResult = await edgeFunctionService.uploadForChunking(audioFile, language);
        console.log(`✅ Upload completato!`);
        console.log(`   Job ID: ${uploadResult.jobId}`);
        console.log(`   Totale chunk: ${uploadResult.totalChunks}`);

        setProgress(20);

        console.log(`\n🔄 FASE 2/3: Elaborazione chunk con retry automatico...`);

        for (let i = 0; i < uploadResult.totalChunks; i++) {
          console.log(`📦 Elaborazione chunk ${i + 1}/${uploadResult.totalChunks}...`);

          await edgeFunctionService.processChunk(uploadResult.jobId, i);

          const percentComplete = ((i + 1) / uploadResult.totalChunks) * 70;
          setProgress(20 + Math.round(percentComplete));

          console.log(`   ✅ Chunk ${i + 1} completato`);
        }

        console.log(`\n📊 FASE 3/3: Recupero risultato finale...`);
        const finalStatus = await edgeFunctionService.getJobStatus(uploadResult.jobId);

        if (finalStatus.job.status === 'completed' && finalStatus.job.transcription_text) {
          console.log(`\n🎉 TRASCRIZIONE COMPLETATA!`);
          console.log(`📝 Lunghezza testo: ${finalStatus.job.transcription_text.length} caratteri`);
          setProgress(100);

          onTranscriptionResult(finalStatus.job.transcription_text);
          setTranscriptionCompleted(true);

          setTimeout(() => {
            setIsTranscribing(false);
            setProgress(0);
          }, 2000);
        } else {
          throw new Error(finalStatus.job.error_message || 'Trascrizione non completata');
        }
      }

    } catch (err: any) {
      console.error(`\n❌ ========== ERRORE ==========`);
      console.error(`Tipo: ${err.name}`);
      console.error(`Messaggio: ${err.message}`);
      console.error(`Stack:`, err.stack);
      setError(err.message);
      setIsTranscribing(false);
      setProgress(0);
    }
  };

  const startStorageTranscription = async () => {
    if (!audioFile) {
      return;
    }

    const openaiApiKey = localStorage.getItem('openai_api_key');
    if (!openaiApiKey) {
      setError('API Key OpenAI non configurata');
      return;
    }

    setShowProgressModal(true);
    setIsTranscribing(true);
    setError(null);

    try {
      const transcription = await chunkedTranscriptionService.transcribeFile(
        audioFile,
        language,
        openaiApiKey,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      onTranscriptionResult(transcription);
      setTranscriptionCompleted(true);

      setTimeout(() => {
        setShowProgressModal(false);
        setIsTranscribing(false);
      }, 2000);
    } catch (err: any) {
      console.error('Errore trascrizione storage:', err);
      setUploadProgress({
        stage: 'error',
        progress: 0,
        message: 'Errore durante la trascrizione',
        error: err.message,
      });
      setError(err.message);
      setIsTranscribing(false);
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

  console.log('[BackendTranscription] Render - audioFile:', audioFile ? audioFile.name : 'NULL', 'serverStatus:', serverStatus);

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
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lingua Audio
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={isTranscribing}
        >
          <option value="it">🇮🇹 Italiano</option>
          <option value="en">🇺🇸 Inglese</option>
          <option value="es">🇪🇸 Spagnolo</option>
          <option value="fr">🇫🇷 Francese</option>
          <option value="de">🇩🇪 Tedesco</option>
          <option value="pt">🇵🇹 Portoghese</option>
        </select>
      </div>

      {/* Conversation Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo di Conversazione
        </label>
        <select
          value={conversationType}
          onChange={(e) => setConversationType(e.target.value as any)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          disabled={isTranscribing}
        >
          <option value="meeting">💼 Meeting / Riunione</option>
          <option value="interview">🎤 Intervista</option>
          <option value="lecture">🎓 Lezione / Conferenza</option>
          <option value="other">💬 Conversazione Generale</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Questa opzione aiuta a identificare i diversi interlocutori nella trascrizione
        </p>
      </div>

      {/* Transcription Buttons */}
      {audioFile && (
        <div className="space-y-3">
          <button
            onClick={startStorageTranscription}
            disabled={isTranscribing}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-4 px-4 rounded-lg transition-all flex items-center justify-center space-x-3 shadow-lg font-semibold"
          >
            <Upload className="w-6 h-6" />
            <span className="text-lg">
              {isTranscribing
                ? 'Trascrizione in corso...'
                : 'Trascrizione con Storage (Consigliato)'
              }
            </span>
          </button>

          <button
            onClick={startSmartTranscription}
            disabled={isTranscribing}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-4 px-4 rounded-lg transition-all flex items-center justify-center space-x-3 shadow-lg font-semibold"
          >
            <Cloud className="w-6 h-6" />
            <span className="text-lg">
              {isTranscribing
                ? 'Trascrizione Cloud in corso...'
                : 'Trascrizione Cloud (Database)'
              }
            </span>
          </button>
        </div>
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

      {/* Success and Editor Button */}
      {transcriptionCompleted && onShowEditor && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h4 className="font-semibold text-gray-800">Trascrizione Completata!</h4>
          </div>
          <p className="text-sm text-gray-700 mb-4">
            La trascrizione è stata completata con successo. Clicca il bottone sotto per visualizzare e modificare il testo con evidenziazione degli interlocutori.
          </p>
          <button
            onClick={onShowEditor}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-4 rounded-lg transition-all flex items-center justify-center space-x-2 shadow-lg font-semibold"
          >
            <span>Apri Editor Trascrizione</span>
          </button>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          Trascrizione Cloud
        </h4>
        <div className="text-sm text-gray-700 space-y-1.5">
          <p>✅ <strong>Serverless</strong> - nessun server da gestire</p>
          <p>✅ <strong>Sempre disponibile</strong> - infrastruttura Supabase</p>
          <p>✅ <strong>Zero configurazione</strong> - funziona subito</p>
          <p>✅ <strong>Sicuro</strong> - API key protette lato server</p>
          <p>✅ <strong>File grandi supportati</strong> - chunking automatico</p>
        </div>

        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">
            <strong>✨ Supporto file grandi!</strong><br/>
            File fino a 25MB: trascrizione diretta<br/>
            File oltre 25MB: chunking automatico lato server
          </p>
        </div>
      </div>

      <TranscriptionProgressModal
        isOpen={showProgressModal}
        progress={uploadProgress}
        onClose={() => {
          setShowProgressModal(false);
          if (uploadProgress.stage === 'completed') {
            onShowEditor?.();
          }
        }}
      />
    </div>
  );
};