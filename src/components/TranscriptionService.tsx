import React, { useState } from 'react';
import { Mic, MicOff, Zap, AlertCircle } from 'lucide-react';
import { WhisperTranscription } from './WhisperTranscription';

interface TranscriptionServiceProps {
  audioFile: File | null;
  onTranscriptionResult: (text: string) => void;
  currentTime: number;
}

export const TranscriptionService: React.FC<TranscriptionServiceProps> = ({
  audioFile,
  onTranscriptionResult,
  currentTime
}) => {
  // Stato per debug
  const [debugInfo, setDebugInfo] = useState<string>('');

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-6">Trascrizione Audio</h3>

      {/* Debug Info */}
      {debugInfo && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">{debugInfo}</p>
        </div>
      )}

      {/* File Status */}
      {audioFile && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-green-800">
              File caricato: {audioFile.name}
            </span>
          </div>
          <p className="text-xs text-green-600 mt-1">
            Dimensione: {(audioFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}

      {/* OpenAI Whisper - Sempre attivo */}
      <WhisperTranscription
        audioFile={audioFile}
        onTranscriptionResult={onTranscriptionResult}
      />
    </div>
  );
};