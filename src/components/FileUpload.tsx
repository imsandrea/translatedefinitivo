import React, { useRef } from 'react';
import { Upload, FileAudio, X, Video, Music } from 'lucide-react';
import { videoProcessor } from '../services/videoProcessor';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  onVideoProcessing?: (isProcessing: boolean) => void;
  onAudioExtracted?: (audioFile: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  selectedFile, 
  onVideoProcessing,
  onAudioExtracted 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingVideo, setIsProcessingVideo] = React.useState(false);
  const [videoPreview, setVideoPreview] = React.useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      await processFile(file);
    } else {
      onFileSelect(null);
      setVideoPreview(null);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (isAudioFile(file) || isVideoFile(file))) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (isVideoFile(file)) {
      // È un video - estrai audio
      setIsProcessingVideo(true);
      onVideoProcessing?.(true);
      
      try {
        // Genera anteprima video
        const preview = await videoProcessor.generateVideoPreview(file);
        setVideoPreview(preview);
        
        // Estrai audio REALE con FFmpeg.js e analizza durata reale
        const audioFile = await videoProcessor.extractAudioBrowser(file, (progress) => {
          console.log(`Estrazione audio: ${progress.percentage}% - ${progress.message}`);
        });
        
        // Ora abbiamo l'audio reale estratto con durata corretta
        console.log(`✅ Audio estratto: ${audioFile.name}, dimensione: ${(audioFile.size / 1024 / 1024).toFixed(2)}MB`);
        onFileSelect(audioFile);
        onAudioExtracted?.(audioFile);
        
      } catch (error: any) {
        console.error('Errore elaborazione video:', error);
        
        // Fallback con FFmpeg.js se disponibile
        try {
          console.log('Tentativo fallback con FFmpeg.js...');
          const audioFile = await videoProcessor.extractAudioBrowser(file, (progress) => {
            console.log(`Fallback estrazione: ${progress.percentage}% - ${progress.message}`);
          });
          
          onFileSelect(audioFile);
          onAudioExtracted?.(audioFile);
          
        } catch (fallbackError: any) {
          console.error('Anche il fallback è fallito:', fallbackError);
          // Ultimo fallback: usa il file video originale per il backend
          console.log('Ultimo fallback: usando file video originale per elaborazione backend');
          onFileSelect(file);
        }
      } finally {
        setIsProcessingVideo(false);
        onVideoProcessing?.(false);
      }
    } else if (isAudioFile(file)) {
      // È un file audio normale
      onFileSelect(file);
      setVideoPreview(null);
    }
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const isAudioFile = (file: File) => {
    return file.type.startsWith('audio/') || 
           /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
  };

  const isVideoFile = (file: File) => {
    return videoProcessor.isVideoFile(file);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    onFileSelect(null);
    setVideoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="mb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.avi,.mov,.mkv,.webm,.flv,.wmv,.m4v,.3gp,.ogv"
        onChange={handleFileChange}
        className="hidden"
      />

      {!selectedFile && !isProcessingVideo ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={openFileDialog}
          className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-8 text-center cursor-pointer hover:bg-blue-100 transition-colors"
        >
          <div className="flex justify-center space-x-4 mb-4">
            <FileAudio className="w-12 h-12 text-blue-500" />
            <Video className="w-12 h-12 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-blue-700 mb-2">
            Carica file audio o video
          </h3>
          <p className="text-blue-600 mb-2">
            Clicca qui o trascina un file audio/video
          </p>
          <div className="text-sm text-blue-500 space-y-1">
            <p><strong>Audio:</strong> MP3, WAV, M4A, AAC, OGG, FLAC</p>
            <p><strong>Video:</strong> MP4, AVI, MOV, MKV, WEBM, FLV, WMV</p>
          </div>
        </div>
      ) : isProcessingVideo ? (
        <div className="bg-green-50 border border-green-300 rounded-lg p-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <Video className="w-12 h-12 text-green-600" />
            <Music className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-700 mb-2">
            Elaborazione Video in Corso
          </h3>
          <p className="text-green-600 mb-2">
            Estraendo audio dal video...
          </p>
          <p className="text-sm text-green-500">
            Questo processo può richiedere alcuni minuti
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center space-x-3">
                {isVideoFile(selectedFile) ? (
                  <Video className="w-8 h-8 text-green-600" />
                ) : (
                  <FileAudio className="w-8 h-8 text-blue-600" />
                )}
                <div>
                  <h4 className="font-semibold text-gray-800">{selectedFile.name}</h4>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type || 'File multimediale'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={openFileDialog}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Cambia file
              </button>
              <button
                onClick={clearFile}
                className="text-red-600 hover:text-red-800 p-1 transition-colors"
                title="Rimuovi file"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Video Preview */}
          {videoPreview && (
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Anteprima Video:</h5>
              <img 
                src={videoPreview} 
                alt="Video preview" 
                className="w-32 h-24 object-cover rounded border"
              />
              <p className="text-xs text-green-600 mt-2">
                ✅ Audio estratto automaticamente dal video
              </p>
            </div>
          )}
          
          {/* Info aggiuntiva per video */}
          {isVideoFile(selectedFile) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
              <div className="flex items-center space-x-2 mb-2">
                <Video className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {selectedFile.type === 'audio/mp3' ? 'Audio Estratto da Video' : 'File Video Rilevato'}
                </span>
              </div>
              <div className="text-xs text-green-700 space-y-1">
                {selectedFile.type === 'audio/mp3' ? (
                  <>
                    <p>• ✅ Audio estratto con successo usando FFmpeg.js</p>
                    <p>• Formato: MP3 mono 16kHz (ottimizzato per Whisper)</p>
                    <p>• Pronto per trascrizione AI di alta qualità</p>
                  </>
                ) : (
                  <>
                    <p>• Audio sarà estratto automaticamente</p>
                    <p>• Dimensione audio stimata: ~{formatFileSize(videoProcessor.estimateAudioSize(selectedFile))}</p>
                    <p>• Il video originale non viene modificato</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};