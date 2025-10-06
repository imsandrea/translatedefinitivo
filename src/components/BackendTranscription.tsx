import React, { useState } from 'react';
import { Server, Upload, Zap, AlertCircle, CheckCircle, Clock, HardDrive, Video, Music } from 'lucide-react';
import { backendService, AudioAnalysis, VideoAnalysis, TranscriptionResult } from '../services/backendService';
import { videoProcessor } from '../services/videoProcessor';

interface BackendTranscriptionProps {
  audioFile: File | null;
  onTranscriptionResult: (text: string) => void;
}

export const BackendTranscription: React.FC<BackendTranscriptionProps> = ({
  audioFile,
  onTranscriptionResult
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [analysis, setAnalysis] = useState<AudioAnalysis | VideoAnalysis | null>(null);
  const [isVideoFile, setIsVideoFile] = useState(false);
  const [progress, setProgress] = useState({ percentage: 0, message: '' });
  const [error, setError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<boolean | null>(null);

  // Verifica stato server
  React.useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    const isOnline = await backendService.healthCheck();
    setServerStatus(isOnline);
  };

  const analyzeFile = async () => {
    if (!audioFile) return;

    setIsAnalyzing(true);
    setError(null);
    
    const isVideo = videoProcessor.isVideoFile(audioFile);
    setIsVideoFile(isVideo);

    try {
      const result = isVideo 
        ? await backendService.analyzeVideo(audioFile)
        : await backendService.analyzeAudio(audioFile);
      setAnalysis(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startTranscription = async () => {
    if (!analysis) return;

    setIsTranscribing(true);
    setError(null);
    setProgress({ percentage: 0, message: 'Inizializzazione...' });

    try {
      const options = {
        language: 'it',
        response_format: 'verbose_json',
        temperature: 0
      };

      const result = isVideoFile
        ? await backendService.transcribeVideo(
            analysis.fileId,
            options,
            (progressUpdate) => {
              setProgress(progressUpdate);
            }
          )
        : await backendService.transcribeAudio(
            analysis.fileId,
            options,
            (progressUpdate) => {
              setProgress(progressUpdate);
            }
          );

      onTranscriptionResult(result.transcription.fullText);

      // Pulizia file dal server dopo trascrizione
      setTimeout(() => {
        backendService.cleanupFile(analysis.fileId).catch(console.error);
      }, 5000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTranscribing(false);
      setProgress({ percentage: 0, message: '' });
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Trascrizione Backend</h3>
          <p className="text-sm text-gray-600">
            Elaborazione server con supporto file grandi e video
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Server className="w-5 h-5 text-green-500" />
          <span className="text-sm font-medium text-green-600">Server Online</span>
        </div>
      </div>

      {/* File Analysis */}
      {!analysis && audioFile && (
        <div className="mb-6">
          <button
            onClick={analyzeFile}
            disabled={isAnalyzing}
            className={`w-full ${
              videoProcessor.isVideoFile(audioFile) 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2`}
          >
            {videoProcessor.isVideoFile(audioFile) ? (
              <Video className="w-5 h-5" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            <span>
              {isAnalyzing 
                ? 'Analizzando file...' 
                : videoProcessor.isVideoFile(audioFile)
                  ? 'Analizza File Video'
                  : 'Analizza File Audio'
              }
            </span>
          </button>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="mb-6 space-y-4">
          <div className={`${
            isVideoFile ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
          } border rounded-lg p-4`}>
            <div className="flex items-center space-x-2 mb-3">
              <CheckCircle className={`w-5 h-5 ${isVideoFile ? 'text-green-600' : 'text-blue-600'}`} />
              <h4 className={`font-medium ${isVideoFile ? 'text-green-800' : 'text-blue-800'}`}>
                Analisi {isVideoFile ? 'Video' : 'Audio'} Completata
              </h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">File:</span>
                <p className="font-medium">{analysis.originalName}</p>
              </div>
              <div>
                <span className="text-gray-600">Dimensione:</span>
                <p className="font-medium">{analysis.fileSizeMB} MB</p>
              </div>
              <div>
                <span className="text-gray-600">Durata:</span>
                <p className="font-medium">
                  {Math.floor((isVideoFile ? (analysis as VideoAnalysis).videoInfo.duration : (analysis as AudioAnalysis).audioInfo.duration) / 60)}:
                  {Math.floor((isVideoFile ? (analysis as VideoAnalysis).videoInfo.duration : (analysis as AudioAnalysis).audioInfo.duration) % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Formato:</span>
                <p className="font-medium">
                  {isVideoFile ? (analysis as VideoAnalysis).videoInfo.format : (analysis as AudioAnalysis).audioInfo.format}
                </p>
              </div>
              {isVideoFile && (
                <>
                  <div>
                    <span className="text-gray-600">Risoluzione:</span>
                    <p className="font-medium">
                      {(analysis as VideoAnalysis).videoInfo.width}x{(analysis as VideoAnalysis).videoInfo.height}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Audio stimato:</span>
                    <p className="font-medium">{(analysis as VideoAnalysis).estimatedAudioSizeMB} MB</p>
                  </div>
                </>
              )}
            </div>

            {(isVideoFile ? (analysis as VideoAnalysis).needsSegmentation : (analysis as AudioAnalysis).needsSplitting) && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    {isVideoFile ? 'Video grande' : 'File grande'} - sarà diviso in {analysis.estimatedSegments} segmenti
                  </span>
                </div>
              </div>
            )}

            {isVideoFile && !(analysis as VideoAnalysis).videoInfo.hasAudio && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    ⚠️ Il video non contiene traccia audio
                  </span>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Costo stimato: ~${analysis.estimatedCost}
                </span>
              </div>
            </div>
          </div>

          {/* Transcription Button */}
          <button
            onClick={startTranscription}
            disabled={isTranscribing || (isVideoFile && !(analysis as VideoAnalysis).videoInfo.hasAudio)}
            className={`w-full ${
              isVideoFile ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
            } disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2`}
          >
            {isVideoFile ? (
              <div className="flex items-center space-x-2">
                <Video className="w-5 h-5" />
                <Music className="w-4 h-4" />
              </div>
            ) : (
              <Zap className="w-5 h-5" />
            )}
            <span>
              {isTranscribing 
                ? (isVideoFile ? 'Elaborazione video in corso...' : 'Trascrizione in corso...') 
                : (isVideoFile ? 'Estrai Audio e Trascrivi' : 'Avvia Trascrizione Completa')
              }
            </span>
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {isTranscribing && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>{progress.message}</span>
            <span>{progress.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
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
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Supporta file audio e video fino a 100MB</p>
        <p>• Estrazione automatica audio da video con FFmpeg</p>
        <p>• File grandi vengono automaticamente divisi in segmenti</p>
        <p>• Elaborazione server con FFmpeg per ottimizzazione audio</p>
        <p>• Pulizia automatica file temporanei</p>
      </div>
    </div>
  );
};