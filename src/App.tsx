import React, { useState } from 'react';
import { FileText, Headphones, Settings, Server, Cloud } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { AudioPlayer } from './components/AudioPlayer';
import { TranscriptionEditor } from './components/TranscriptionEditor';
import { TranscriptionService } from './components/TranscriptionService';
import { BackendTranscription } from './components/BackendTranscription';
import { DeploymentGuide } from './components/DeploymentGuide';

function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'transcribe' | 'services' | 'backend' | 'deploy'>('backend');

  const handleVideoProcessing = (processing: boolean) => {
    setIsProcessingVideo(processing);
  };

  const handleAudioExtracted = (audioFile: File) => {
    console.log('Audio estratto:', audioFile.name);
  };

  const handleFileChange = (file: File | null) => {
    console.log('[App] handleFileChange:', file ? file.name : 'NULL');
    // Azzera tutto quando cambia il file
    setAudioFile(file);
    setTranscription('');
    setCurrentTime(0);
    setDuration(0);
    // Non cambiare tab se l'utente è già su backend
    if (activeTab !== 'backend') {
      setActiveTab('services');
    }
  };

  const handleTranscriptionChange = (text: string) => {
    setTranscription(text);
  };

  const handleTranscriptionResult = (newText: string) => {
    if (newText && newText.trim()) {
      // Sostituisci sempre il testo invece di aggiungerlo
      setTranscription(newText);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  AudioScribe
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">v1.1.0</span>
                </h1>
                <p className="text-sm text-gray-600">Trascrizione e traduzione professionale</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right text-sm text-gray-600">
                {audioFile && (
                  <>
                    <div className="font-medium">
                      {audioFile.name}
                    </div>
                    <div>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</div>
                  </>
                )}
                {isProcessingVideo && (
                  <div className="text-green-600 font-medium">
                    Elaborando video...
                  </div>
                )}
                
                <button
                  onClick={() => setActiveTab('backend')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'backend'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  data-tab="backend"
                >
                  <div className="flex items-center space-x-2">
                    <Server className="w-4 h-4" />
                    <span>Cloud</span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('deploy')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'deploy'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  data-tab="deploy"
                >
                  <div className="flex items-center space-x-2">
                    <Cloud className="w-4 h-4" />
                    <span>Deploy</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* File Upload */}
        <FileUpload
          onFileSelect={handleFileChange}
          selectedFile={audioFile}
          onVideoProcessing={handleVideoProcessing}
          onAudioExtracted={handleAudioExtracted}
        />

        {/* Main Content */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isProcessingVideo ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Audio Player */}
          <div className="lg:col-span-1">
            <AudioPlayer
              audioFile={audioFile}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
            />
          </div>

          {/* Tabs and Content */}
          <div className="lg:col-span-2">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-sm mb-4">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('backend')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'backend'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    data-tab="backend"
                  >
                    <div className="flex items-center space-x-2">
                      <Server className="w-4 h-4" />
                      <span>Trascrizione Cloud</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('transcribe')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'transcribe'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    data-tab="transcribe"
                  >
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4" />
                      <span>Editor</span>
                    </div>
                  </button>
                </nav>
              </div>
            </div>

            {/* Tab Content */}
            <div className="h-full">
              {activeTab === 'transcribe' && (
                <TranscriptionEditor
                  transcription={transcription}
                  onTranscriptionChange={handleTranscriptionChange}
                  audioFile={audioFile}
                />
              )}
              
              {activeTab === 'services' && (
                <TranscriptionService
                  audioFile={audioFile}
                  onTranscriptionResult={handleTranscriptionResult}
                  currentTime={currentTime}
                />
              )}
              
              {activeTab === 'backend' && (
                <>
                  {console.log('[App] Rendering BackendTranscription with audioFile:', audioFile ? audioFile.name : 'NULL')}
                  <BackendTranscription
                    audioFile={audioFile}
                    onTranscriptionResult={handleTranscriptionResult}
                    onShowEditor={() => setActiveTab('transcribe')}
                  />
                </>
              )}
              
              {activeTab === 'deploy' && (
                <DeploymentGuide />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-500">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p>
              AudioScribe - Strumento professionale per la trascrizione di file audio e video
            </p>
            <p className="mt-1">
              Audio: MP3, WAV, M4A, AAC, OGG, FLAC • Video: MP4, AVI, MOV, MKV, WEBM
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;