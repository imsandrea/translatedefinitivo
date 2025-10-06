import React, { useState, useEffect } from 'react';
import { Save, Download, Copy, RotateCcw, Sparkles } from 'lucide-react';
import { TextFormattingPanel } from './TextFormattingPanel';
import { textFormatter } from '../services/textFormatter';

interface TranscriptionEditorProps {
  transcription: string;
  onTranscriptionChange: (text: string) => void;
  audioFile: File | null;
}

export const TranscriptionEditor: React.FC<TranscriptionEditorProps> = ({
  transcription,
  onTranscriptionChange,
  audioFile
}) => {
  const [localTranscription, setLocalTranscription] = useState(transcription);
  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showFormattingPanel, setShowFormattingPanel] = useState(false);

  // Inizializza il formatter con l'API key esistente
  useEffect(() => {
    const apiKey = localStorage.getItem('openai_api_key');
    if (apiKey) {
      textFormatter.setApiKey(apiKey);
    }
  }, []);

  useEffect(() => {
    setLocalTranscription(transcription);
  }, [transcription]);

  useEffect(() => {
    const words = localTranscription.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
  }, [localTranscription]);

  // Auto-save ogni 30 secondi
  useEffect(() => {
    const timer = setInterval(() => {
      if (localTranscription !== transcription) {
        saveTranscription();
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [localTranscription, transcription]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalTranscription(e.target.value);
  };

  const saveTranscription = () => {
    setIsSaving(true);
    onTranscriptionChange(localTranscription);
    setLastSaved(new Date());
    
    // Simula salvataggio
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  };

  const downloadTranscription = () => {
    const fileName = audioFile ? 
      `trascrizione_${audioFile.name.replace(/\.[^/.]+$/, "")}_${new Date().toISOString().slice(0, 10)}.txt` : 
      'trascrizione.txt';
    
    const blob = new Blob([localTranscription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsMarkdown = () => {
    const fileName = audioFile ? 
      `trascrizione_${audioFile.name.replace(/\.[^/.]+$/, "")}_${new Date().toISOString().slice(0, 10)}.md` : 
      'trascrizione.md';
    
    const blob = new Blob([localTranscription], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsSRT = () => {
    // Converti il testo formattato in SRT se contiene timestamp
    let srtContent = '';
    const lines = localTranscription.split('\n');
    let subtitleIndex = 1;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Cerca pattern timestamp: ## 🕐 00:00 - 05:30
      const timestampMatch = line.match(/## 🕐 (\d{2}):(\d{2}) - (\d{2}):(\d{2})/);
      
      if (timestampMatch && i + 2 < lines.length) {
        const [, startMin, startSec, endMin, endSec] = timestampMatch;
        const text = lines[i + 2].trim();
        
        if (text) {
          srtContent += `${subtitleIndex}\n`;
          srtContent += `00:${startMin}:${startSec},000 --> 00:${endMin}:${endSec},000\n`;
          srtContent += `${text}\n\n`;
          subtitleIndex++;
        }
      }
    }
    
    if (!srtContent) {
      alert('Nessun timestamp trovato nel testo. Usa la trascrizione con chunking per generare SRT.');
      return;
    }
    
    const fileName = audioFile ? 
      `sottotitoli_${audioFile.name.replace(/\.[^/.]+$/, "")}_${new Date().toISOString().slice(0, 10)}.srt` : 
      'sottotitoli.srt';
    
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(localTranscription).then(() => {
      // Potresti aggiungere una notifica qui
    });
  };

  const clearTranscription = () => {
    if (window.confirm('Sei sicuro di voler cancellare tutta la trascrizione?')) {
      setLocalTranscription('');
      onTranscriptionChange('');
    }
  };

  const handleFormattedText = (formattedText: string) => {
    console.log('📝 Editor riceve testo formattato:', formattedText.length, 'caratteri');
    setLocalTranscription(formattedText);
    onTranscriptionChange(formattedText);
    setLastSaved(new Date());
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Trascrizione</h3>
          <p className="text-sm text-gray-600">
            {wordCount} parole
            {lastSaved && (
              <span className="ml-2">
                • Salvato: {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={saveTranscription}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salva'}</span>
          </button>
          
          <button
            onClick={() => setShowFormattingPanel(true)}
            disabled={!localTranscription.trim() || localTranscription.length < 50}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
            title="Formatta con AI"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI</span>
          </button>
          
          <button
            onClick={copyToClipboard}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
            title="Copia negli appunti"
          >
            <Copy className="w-4 h-4" />
          </button>
          
          <div className="relative group">
            <button
              className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
              title="Opzioni download"
            >
              <Download className="w-4 h-4" />
              <span>▼</span>
            </button>
            
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 min-w-48">
              <button
                onClick={downloadTranscription}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
              >
                📄 Scarica come TXT
              </button>
              <button
                onClick={downloadAsMarkdown}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                📝 Scarica come Markdown
              </button>
              <button
                onClick={downloadAsSRT}
                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg"
              >
                🎬 Scarica come SRT
              </button>
            </div>
          </div>
          
          <button
            onClick={clearTranscription}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors flex items-center space-x-1"
            title="Cancella tutto"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Formatting Panel */}
      <TextFormattingPanel
        text={localTranscription}
        onFormattedText={handleFormattedText}
        isVisible={showFormattingPanel}
        onClose={() => setShowFormattingPanel(false)}
      />

      {/* Editor */}
      <div className="flex-1">
        <textarea
          id="transcription-textarea"
          value={localTranscription}
          onChange={handleTextChange}
          placeholder="Il testo trascritto apparirà qui. Puoi anche scrivere manualmente o modificare la trascrizione automatica..."
          className="w-full h-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm leading-relaxed transition-all duration-200"
          style={{ minHeight: '400px' }}
        />
      </div>

      {/* Footer info */}
      <div className="mt-4 text-xs text-gray-500 border-t pt-4">
        <div className="flex justify-between">
          <span>Caratteri: {localTranscription.length}</span>
          <div className="flex items-center space-x-4">
            {localTranscription.length >= 50 && textFormatter.isConfigured() && (
              <span className="text-purple-600">✨ Formattazione AI disponibile</span>
            )}
            <span>Auto-salvataggio ogni 30 secondi</span>
          </div>
        </div>
      </div>
    </div>
  );
};