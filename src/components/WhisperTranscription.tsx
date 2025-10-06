import React, { useState, useEffect } from 'react';
import { Zap, Settings, AlertCircle, DollarSign, Clock, Languages, FileText, Scissors, BarChart3 } from 'lucide-react';
import { whisperService, TranscriptionOptions } from '../services/whisperService';
import { audioChunker, AudioChunk, ChunkingProgress } from '../services/audioChunker';
import { ApiKeySetup } from './ApiKeySetup';
import { textFormatter } from '../services/textFormatter';

interface WhisperTranscriptionProps {
  audioFile: File | null;
  onTranscriptionResult: (text: string) => void;
}

export const WhisperTranscription: React.FC<WhisperTranscriptionProps> = ({
  audioFile,
  onTranscriptionResult,
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [chunkingProgress, setChunkingProgress] = useState<ChunkingProgress | null>(null);
  const [audioAnalysis, setAudioAnalysis] = useState<any>(null);
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [transcriptionResults, setTranscriptionResults] = useState<string[]>([]);
  const [options, setOptions] = useState<TranscriptionOptions>({
    language: 'it', // Default italiano
    response_format: 'verbose_json',
    temperature: 0
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mode, setMode] = useState<'transcribe' | 'translate'>('transcribe');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeySetup, setShowApiKeySetup] = useState(false);
  const [isApiKeyConfigured, setIsApiKeyConfigured] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [contentType, setContentType] = useState<'auto' | 'meeting' | 'interview' | 'lecture' | 'conversation' | 'presentation'>('auto');

  // Funzione per aggiungere log
  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '🔵';
    const logMessage = `${emoji} [${timestamp}] ${message}`;
    setLogs(prev => [...prev, logMessage]);
    console.log(`🚀 AudioScribe ${logMessage}`);
  };

  // Pulisci log
  const clearLogs = () => {
    setLogs([]);
  };

  useEffect(() => {
    // Priorità: 1. File .env, 2. localStorage
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const savedApiKey = localStorage.getItem('openai_api_key');
    
    if (envApiKey && envApiKey !== 'your_openai_api_key_here') {
      // API key dal file .env
      setApiKey(envApiKey);
      whisperService.setApiKey(envApiKey);
      textFormatter.setApiKey(envApiKey);
      setIsApiKeyConfigured(true);
      addLog(`API Key caricata da file .env - Sistema pronto!`, 'success');
    } else if (savedApiKey) {
      // Fallback a localStorage
      setApiKey(savedApiKey);
      whisperService.setApiKey(savedApiKey);
      textFormatter.setApiKey(savedApiKey);
      setIsApiKeyConfigured(true);
      addLog(`API Key caricata da localStorage - Sistema pronto!`, 'success');
    } else {
      // Richiedi setup manuale
      setShowApiKeySetup(true);
      addLog(`API Key non trovata - Configurazione richiesta!`, 'warning');
    }
    
    // Log di benvenuto sempre visibile
    addLog(`🎉 AudioScribe caricato! Premi F12 per vedere tutti i log dettagliati.`, 'info');
  }, []);

  // Analizza il file quando viene caricato
  useEffect(() => {
    if (audioFile && isApiKeyConfigured) {
      analyzeAudioFile();
    }
  }, [audioFile, apiKey]);

  const analyzeAudioFile = async () => {
    if (!audioFile) return;

    setIsAnalyzing(true);
    setError(null);
    addLog(`Iniziando analisi file: ${audioFile.name}`, 'info');
    addLog(`Dimensione file: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB`, 'info');
    
    // Controlla se è un file estratto da video
    const isExtractedFromVideo = audioFile.type === 'audio/mp3' && 
                                (audioFile.name.includes('extracted') || 
                                 (audioFile as any).extractedFromVideo);
    
    if (isExtractedFromVideo) {
      addLog(`File audio estratto da video rilevato`, 'info');
      // Usa la durata reale se disponibile
      const realDuration = (audioFile as any).originalDuration;
      if (realDuration) {
        addLog(`Durata reale dal video: ${Math.floor(realDuration / 60)}:${Math.floor(realDuration % 60).toString().padStart(2, '0')}`, 'success');
      }
    }

    try {
      const analysis = await audioChunker.analyzeAudioFile(audioFile);
      setAudioAnalysis(analysis);
      
      // Usa la durata reale se disponibile, altrimenti quella analizzata
      const realDuration = (audioFile as any).originalDuration || analysis.duration;
      addLog(`Durata audio: ${Math.floor(realDuration / 60)}:${Math.floor(realDuration % 60).toString().padStart(2, '0')}`, 'success');
      addLog(`Necessita chunking: ${analysis.needsChunking ? 'SÌ' : 'NO'}`, 'info');
      
      // Alert per file grandi
      if (analysis.needsChunking) {
        addLog(`File grande rilevato (${(audioFile.size / 1024 / 1024).toFixed(1)}MB) - sarà diviso in ${analysis.estimatedChunks} parti`, 'warning');
        alert(`⚠️ File Grande Rilevato!\n\n` +
              `Il tuo file è di ${(audioFile.size / 1024 / 1024).toFixed(1)}MB.\n` +
              `Sarà automaticamente diviso in ${analysis.estimatedChunks} parti da ~10 minuti ciascuna.\n\n` +
              `Questo garantisce la migliore qualità di trascrizione rispettando i limiti di Whisper (25MB per parte).\n\n` +
              `Costo stimato: ~$${(realDuration / 60 * 0.006).toFixed(3)}`);
      } else {
        addLog('File di dimensioni normali - trascrizione diretta', 'success');
      }
    } catch (err: any) {
      addLog(`Errore durante analisi: ${err.message}`, 'error');
      setError(`Errore analisi file: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    if (key) {
      whisperService.setApiKey(key);
      textFormatter.setApiKey(key);
      localStorage.setItem('openai_api_key', key);
      setIsApiKeyConfigured(true);
      setShowApiKeySetup(false);
      addLog(`API Key aggiornata per tutti i servizi`, 'success');
    } else {
      setIsApiKeyConfigured(false);
      setShowApiKeySetup(true);
    }
  };

  const showApiKeyInterface = () => {
    setShowApiKeySetup(true);
  };
  const handleTranscribe = async () => {
    if (!audioFile) return;

    // Verifica lingua selezionata
    if (!options.language) {
      addLog('ATTENZIONE: Nessuna lingua selezionata - usando auto-detect (più lento)', 'warning');
    } else {
      addLog(`Lingua selezionata: ${options.language}`, 'info');
    }

    setIsTranscribing(true);
    setError(null);
    setProgress(0);
    setChunkingProgress(null);
    setChunks([]);
    setTranscriptionResults([]);
    addLog('=== INIZIO TRASCRIZIONE ===', 'info');
    addLog(`Modalità: ${mode === 'transcribe' ? 'Trascrizione' : 'Traduzione'}`, 'info');
    addLog(`Formato risposta: ${options.response_format}`, 'info');
    addLog(`Temperatura: ${options.temperature}`, 'info');
    if (options.prompt) {
      addLog(`Prompt personalizzato: "${options.prompt}"`, 'info');
    }

    try {
      // Fase 1: Chunking se necessario
      addLog('Fase 1: Analisi e chunking del file...', 'info');
      console.log('🚀 Avviando chunking del file audio...');
      
      const audioChunks = await audioChunker.chunkAudioFile(
        audioFile, 
        10, // 10 minuti per chunk
        (progress) => {
          console.log('📊 Progresso chunking:', progress);
          setChunkingProgress(progress);
          addLog(`Chunking: ${progress.message} (${progress.percentage}%)`, 'info');
        }
      );
      
      console.log('✅ Chunking completato, chunk creati:', audioChunks.length);
      setChunks(audioChunks);
      addLog(`File diviso in ${audioChunks.length} parti`, 'success');

      // Fase 2: Trascrizione di ogni chunk
      const results: string[] = [];
      addLog('Fase 2: Trascrizione delle parti...', 'info');
      
      for (let i = 0; i < audioChunks.length; i++) {
        const chunk = audioChunks[i];
        
        addLog(`Trascrivendo parte ${i + 1}/${audioChunks.length} (${chunk.duration.toFixed(1)}s)`, 'info');
        
        setChunkingProgress({
          phase: 'transcribing',
          currentChunk: i + 1,
          totalChunks: audioChunks.length,
          percentage: 50 + (40 * i / audioChunks.length),
          message: `Trascrivendo parte ${i + 1}/${audioChunks.length}...`
        });

        // Crea un File dal Blob per Whisper
        const chunkFile = new File([chunk.blob], `chunk_${i}.${audioFile.name.split('.').pop()}`, {
          type: audioFile.type
        });

        try {
          const result = mode === 'transcribe' 
            ? await whisperService.transcribeAudio(chunkFile, options, (progress) => {
                addLog(`Progresso parte ${i + 1}: ${progress}%`, 'info');
              })
            : await whisperService.translateAudio(chunkFile, options, (progress) => {
                addLog(`Progresso traduzione parte ${i + 1}: ${progress}%`, 'info');
              });

          addLog(`Parte ${i + 1} completata: ${result.text.length} caratteri`, 'success');
          
          // Se abbiamo segmenti dettagliati, usa le pause naturali per creare paragrafi
          let processedText = result.text;
          if (result.segments && result.segments.length > 0) {
            addLog(`Parte ${i + 1}: Analizzando ${result.segments.length} segmenti per pause naturali`, 'info');
            processedText = whisperService.createParagraphsFromPauses(result.segments);
            addLog(`Parte ${i + 1}: Creati paragrafi basati su pause naturali`, 'success');
          }
          
          results.push(processedText);
          setTranscriptionResults([...results]);
          
          // Mostra anteprima del testo trascritto
          const preview = processedText.substring(0, 100) + (processedText.length > 100 ? '...' : '');
          addLog(`Anteprima parte ${i + 1}: "${preview}"`, 'info');
          
        } catch (chunkError: any) {
          addLog(`ERRORE parte ${i + 1}: ${chunkError.message}`, 'error');
          results.push(''); // Aggiungi stringa vuota per mantenere l'ordine
          setTranscriptionResults([...results]);
        }
      }

      // Fase 3: Combinazione risultati
      addLog('Fase 3: Combinazione risultati...', 'info');
      setChunkingProgress({
        phase: 'combining',
        currentChunk: audioChunks.length,
        totalChunks: audioChunks.length,
        percentage: 95,
        message: 'Combinando i risultati...'
      });

      // Combina i risultati filtrando quelli vuoti
      const validResults = results.filter(text => text && text.trim().length > 0);
      const finalText = validResults.join(' ').trim();
      
      addLog(`Trascrizione finale: ${finalText.length} caratteri totali`, 'success');
      
      // Formatta il testo con timestamp se abbiamo segmenti
      const formattedText = formatTranscriptionWithTimestamps(results, chunks);
      
      // Statistiche finali
      const successfulParts = validResults.length;
      addLog(`Parti riuscite: ${successfulParts}/${audioChunks.length}`, successfulParts === audioChunks.length ? 'success' : 'warning');
      
      // Usa il testo finale invece di quello formattato per evitare duplicazioni
      onTranscriptionResult(finalText);

      setChunkingProgress({
        phase: 'combining',
        currentChunk: audioChunks.length,
        totalChunks: audioChunks.length,
        percentage: 100,
        message: 'Trascrizione completata!'
      });
      
      addLog('=== TRASCRIZIONE COMPLETATA ===', 'success');

      // Fase 4: Formattazione automatica con AI
      if (textFormatter.isConfigured() && finalText.length > 50) {
        addLog(`Fase 4: Avvio formattazione AI (${finalText.length} caratteri)...`, 'info');
        setChunkingProgress({
          phase: 'combining',
          currentChunk: audioChunks.length,
          totalChunks: audioChunks.length,
          percentage: 95,
          message: 'Formattando il testo con AI...'
        });

        try {
          addLog('Chiamando ChatGPT per formattazione...', 'info');
          
          let formattingResult;
          if (contentType === 'auto') {
            formattingResult = await textFormatter.formatWithAI(finalText, {
              addParagraphs: true,
              addTitles: true,
              addTimestamps: audioChunks.length > 1,
              addSpeakers: false,
              language: options.language || 'it'
            });
          } else {
            addLog(`Usando formattazione specifica per: ${contentType}`, 'info');
            formattingResult = await textFormatter.formatByType(finalText, contentType);
          }
          
          addLog(`Formattazione AI completata: ${formattingResult.improvements.length} miglioramenti`, 'success');
          addLog(`Miglioramenti: ${formattingResult.improvements.join(', ')}`, 'info');
          addLog(`Punteggio leggibilità: ${formattingResult.readabilityScore}/100`, 'info');
          addLog(`Testo formattato: ${formattingResult.formattedText.length} caratteri`, 'success');
          
          // Sostituisci con il testo formattato
          onTranscriptionResult(formattingResult.formattedText);
          
          setChunkingProgress({
            phase: 'combining',
            currentChunk: audioChunks.length,
            totalChunks: audioChunks.length,
            percentage: 100,
            message: 'Trascrizione con formattazione AI completata!'
          });

        } catch (formatError: any) {
          addLog(`ERRORE Formattazione: ${formatError.message}`, 'error');
          addLog(`Stack trace: ${formatError.stack || 'N/A'}`, 'error');
          addLog(`Usando testo originale senza formattazione AI`, 'warning');
          // Il testo finale è già stato impostato sopra
        }
      } else {
        const reason = !textFormatter.isConfigured() ? 'API Key mancante' : 
                      finalText.length < 50 ? `Testo troppo breve (${finalText.length} caratteri)` : 
                      'Motivo sconosciuto';
        addLog(`Formattazione AI saltata: ${reason}`, 'warning');
      }
      // Auto-focus sull'editor dopo trascrizione completata
      setTimeout(() => {
        // Cambia tab all'editor se non è già attivo
        const editorTab = document.querySelector('[data-tab="transcribe"]') as HTMLButtonElement;
        if (editorTab) {
          editorTab.click();
        }
        
        // Focus sulla textarea dell'editor
        setTimeout(() => {
          const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
          if (textarea) {
            textarea.focus();
            // Scorri alla fine del testo
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            textarea.scrollTop = textarea.scrollHeight;
          }
        }, 500);
      }, 1000);

    } catch (err: any) {
      addLog(`ERRORE FATALE: ${err.message}`, 'error');
      setError(err.message);
    } finally {
      setIsTranscribing(false);
      setProgress(0);
      setTimeout(() => setChunkingProgress(null), 3000);
    }
  };

  const costEstimate = audioFile ? whisperService.estimateCost(audioFile) : null;

  // Funzione per formattare la trascrizione con timestamp
  const formatTranscriptionWithTimestamps = (results: string[], chunks: AudioChunk[]): string => {
    if (chunks.length <= 1) {
      // File singolo - nessun timestamp necessario
      const combinedText = results.join(' ').trim();
      
      // Aggiungi header base per file singoli
      let formattedText = `# Trascrizione Audio\n\n`;
      formattedText += `📁 **File:** ${audioFile?.name || 'Audio'}\n`;
      formattedText += `⏱️ **Durata:** ${audioAnalysis ? Math.floor(audioAnalysis.duration / 60) : '?'}:${audioAnalysis ? Math.floor(audioAnalysis.duration % 60).toString().padStart(2, '0') : '??'}\n`;
      formattedText += `🗣️ **Lingua:** ${options.language === 'it' ? '🇮🇹 Italiano' : options.language === 'en' ? '🇺🇸 Inglese' : options.language || 'Auto-detect'}\n`;
      formattedText += `📅 **Data:** ${new Date().toLocaleString('it-IT')}\n\n`;
      formattedText += `---\n\n`;
      formattedText += combinedText;
      
      return formattedText;
    }

    let formattedText = `# Trascrizione Audio\n\n`;
    formattedText += `📁 **File:** ${audioFile?.name || 'Audio'}\n`;
    formattedText += `⏱️ **Durata totale:** ${audioAnalysis ? Math.floor(audioAnalysis.duration / 60) : '?'}:${audioAnalysis ? Math.floor(audioAnalysis.duration % 60).toString().padStart(2, '0') : '??'}\n`;
    formattedText += `📊 **Parti elaborate:** ${chunks.length}\n`;
    formattedText += `🗣️ **Lingua:** ${options.language === 'it' ? '🇮🇹 Italiano' : options.language === 'en' ? '🇺🇸 Inglese' : options.language || 'Auto-detect'}\n`;
    formattedText += `📅 **Data:** ${new Date().toLocaleString('it-IT')}\n\n`;
    formattedText += `---\n\n`;

    results.forEach((text, index) => {
      if (text && text.trim()) {
        const chunk = chunks[index];
        if (chunk) {
          const startMinutes = Math.floor(chunk.startTime / 60);
          const startSeconds = Math.floor(chunk.startTime % 60);
          const endMinutes = Math.floor(chunk.endTime / 60);
          const endSeconds = Math.floor(chunk.endTime % 60);
          
          formattedText += `## 🕐 ${startMinutes.toString().padStart(2, '0')}:${startSeconds.toString().padStart(2, '0')} - ${endMinutes.toString().padStart(2, '0')}:${endSeconds.toString().padStart(2, '0')}\n\n`;
          
          // Usa il testo già pre-formattato con pause naturali
          const cleanText = text.trim();
          
          // Il testo dovrebbe già avere paragrafi se formattato con AI
          // Altrimenti usa divisione semplice
          if (cleanText.includes('\n\n')) {
            formattedText += `${cleanText}\n\n`;
          } else {
            // Divisione semplice per testi senza formattazione
            const sentences = cleanText.split(/([.!?]+\s*)/);
            let paragraph = '';
            let sentenceCount = 0;
            
            for (let i = 0; i < sentences.length; i += 2) {
              const sentence = sentences[i];
              const punctuation = sentences[i + 1] || '';
              
              if (sentence && sentence.trim()) {
                paragraph += sentence + punctuation;
                sentenceCount++;
                
                // Nuovo paragrafo ogni 3-4 frasi
                if (sentenceCount % 3 === 0 && i < sentences.length - 2) {
                  formattedText += `${paragraph.trim()}\n\n`;
                  paragraph = '';
                }
              }
            }
            
            if (paragraph.trim()) {
              formattedText += `${paragraph.trim()}\n\n`;
            }
          }
        } else {
          formattedText += `## 📝 Parte ${index + 1}\n\n`;
          formattedText += `${text.trim()}\n\n`;
        }
      }
    });

    formattedText += `---\n\n`;
    formattedText += `## 📊 Statistiche Trascrizione\n\n`;
    formattedText += `- **Parole totali:** ~${results.join(' ').split(' ').length}\n`;
    formattedText += `- **Caratteri:** ${results.join(' ').length}\n`;
    formattedText += `- **Parti trascritte:** ${results.filter(r => r.trim()).length}/${chunks.length}\n`;
    formattedText += `- **Tempo di elaborazione:** ${Math.ceil(chunks.length * 2)} minuti circa\n`;
    
    return formattedText;
  };

  // Mostra setup API key se richiesto o non configurata
  if (showApiKeySetup || !isApiKeyConfigured) {
    return (
      <div className="space-y-4">
        <ApiKeySetup onApiKeySet={handleApiKeySet} currentApiKey={apiKey} />
        {isApiKeyConfigured && (
          <div className="text-center">
            <button
              onClick={() => setShowApiKeySetup(false)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ← Torna alla Trascrizione
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            OpenAI Whisper
          </h3>
          <p className="text-sm text-gray-600">
            Trascrizione AI di alta qualità
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">AI Powered</span>
          </div>
          <button
            onClick={showApiKeyInterface}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
            title="Cambia API Key"
          >
            Cambia API Key
          </button>
        </div>
      </div>

      {/* API Key Status */}
      <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-green-800">
            API Key Configurata: {apiKey.substring(0, 7)}...{apiKey.substring(apiKey.length - 4)}
          </span>
        </div>
      </div>

      {/* Selezione Lingua Prominente */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
        <div className="flex items-center space-x-2 mb-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Languages className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-blue-900">🎯 Seleziona Lingua Audio</h4>
            <p className="text-sm text-blue-700">Fondamentale per risultati ottimali</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { code: 'it', name: '🇮🇹 Italiano', recommended: true },
            { code: 'en', name: '🇺🇸 Inglese' },
            { code: 'es', name: '🇪🇸 Spagnolo' },
            { code: 'fr', name: '🇫🇷 Francese' },
            { code: 'de', name: '🇩🇪 Tedesco' },
            { code: 'pt', name: '🇵🇹 Portoghese' },
            { code: 'ru', name: '🇷🇺 Russo' },
            { code: 'zh', name: '🇨🇳 Cinese' },
            { code: 'ja', name: '🇯🇵 Giapponese' },
            { code: 'ko', name: '🇰🇷 Coreano' },
            { code: 'ar', name: '🇸🇦 Arabo' },
            { code: '', name: '🌍 Auto-detect' }
          ].map((lang) => (
            <label key={lang.code} className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
              options.language === lang.code 
                ? 'border-blue-500 bg-blue-100 shadow-md' 
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}>
              <input
                type="radio"
                value={lang.code}
                checked={options.language === lang.code}
                onChange={(e) => {
                  setOptions({...options, language: e.target.value});
                  addLog(`Lingua cambiata in: ${lang.name}`, 'info');
                }}
                className="mr-3 w-4 h-4"
              />
              <span className={`text-sm font-medium ${
                lang.recommended ? 'text-blue-800 font-bold' : 
                options.language === lang.code ? 'text-blue-700' : 'text-gray-700'
              }`}>
                {lang.name}
                {lang.recommended && ' ⭐'}
              </span>
            </label>
          ))}
        </div>
        
        <div className="mt-4 bg-blue-100 border border-blue-300 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">!</div>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">🎯 Suggerimenti:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Seleziona sempre la lingua corretta</strong> per risultati ottimali</li>
                <li>• <strong>Auto-detect è più lento</strong> e meno preciso</li>
                <li>• <strong>Italiano ⭐</strong> è preselezionato come raccomandato</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Tipo di Contenuto Audio */}
      <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-6 shadow-lg">
        <div className="flex items-center space-x-2 mb-3">
          <div className="bg-purple-600 p-2 rounded-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-purple-900">🎵 Tipo di Contenuto Audio</h4>
            <p className="text-sm text-purple-700">Ottimizza la formattazione per il tuo contenuto</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { id: 'auto', name: '🤖 Automatico', desc: 'AI rileva il tipo', recommended: true },
            { id: 'meeting', name: '👥 Riunione', desc: 'Verbale aziendale' },
            { id: 'interview', name: '🎤 Intervista', desc: 'Q&A strutturate' },
            { id: 'lecture', name: '📚 Lezione', desc: 'Contenuto didattico' },
            { id: 'presentation', name: '📊 Presentazione', desc: 'Slide e punti chiave' },
            { id: 'conference', name: '🏛️ Conferenza', desc: 'Eventi formali' },
            { id: 'webinar', name: '💻 Webinar', desc: 'Seminari online' },
            { id: 'conversation', name: '💬 Conversazione', desc: 'Dialogo informale' },
            { id: 'podcast', name: '🎙️ Podcast', desc: 'Show radiofonico' },
            { id: 'call', name: '📞 Chiamata', desc: 'Conversazione telefonica' },
            { id: 'memo', name: '🗣️ Memo Vocale', desc: 'Appunti personali' },
            { id: 'dictation', name: '📖 Dettatura', desc: 'Testo dettato' }
          ].map((type) => (
            <label
              key={type.id}
              className={`flex flex-col p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                contentType === type.id
                  ? 'border-purple-500 bg-purple-100 shadow-md'
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
            >
              <input
                type="radio"
                value={type.id}
                checked={contentType === type.id}
                onChange={(e) => {
                  setContentType(e.target.value as any);
                  addLog(`Tipo contenuto cambiato in: ${type.name}`, 'info');
                }}
                className="sr-only"
              />
              <span className={`text-sm font-medium mb-1 ${
                type.recommended ? 'text-purple-800 font-bold' : 
                contentType === type.id ? 'text-purple-700' : 'text-gray-700'
              }`}>
                {type.name}
                {type.recommended && ' ⭐'}
              </span>
              <span className="text-xs text-gray-600">{type.desc}</span>
            </label>
          ))}
        </div>
        
        <div className="mt-4 bg-purple-100 border border-purple-300 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <div className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">💡</div>
            <div className="text-sm text-purple-800">
              <p className="font-semibold mb-1">🎯 Formattazione Intelligente:</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Riunione:</strong> Verbale con decisioni e azioni</li>
                <li>• <strong>Intervista:</strong> Domande evidenziate, risposte separate</li>
                <li>• <strong>Lezione:</strong> Struttura didattica con argomenti</li>
                <li>• <strong>Automatico ⭐:</strong> AI rileva automaticamente il tipo</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* File Analysis Results */}
      {audioAnalysis && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-3">📊 Analisi File Audio</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-600">Durata:</span>
              <p className="font-medium">{Math.floor(audioAnalysis.duration / 60)}:{Math.floor(audioAnalysis.duration % 60).toString().padStart(2, '0')}</p>
            </div>
            <div>
              <span className="text-blue-600">Dimensione:</span>
              <p className="font-medium">{(audioFile!.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            <div>
              <span className="text-blue-600">Chunking:</span>
              <p className="font-medium">{audioAnalysis.needsChunking ? `${audioAnalysis.estimatedChunks} parti` : 'Non necessario'}</p>
            </div>
            <div>
              <span className="text-blue-600">Costo stimato:</span>
              <p className="font-medium">~${(audioAnalysis.duration / 60 * 0.006).toFixed(3)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chunks Display */}
      {chunks.length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-3">✂️ Chunk Audio Preparati ({chunks.length})</h4>
          <div className="space-y-2">
            {chunks.map((chunk, index) => (
              <div key={index} className="bg-white rounded p-3 border border-green-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-green-800">Parte {index + 1}</span>
                    <span className="text-sm text-green-600 ml-2">
                      {Math.floor(chunk.startTime / 60)}:{Math.floor(chunk.startTime % 60).toString().padStart(2, '0')} - 
                      {Math.floor(chunk.endTime / 60)}:{Math.floor(chunk.endTime % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-sm text-green-600">
                    {(chunk.size / 1024 / 1024).toFixed(2)} MB • {chunk.duration.toFixed(1)}s
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-sm text-green-700">
            <p>Dimensione totale chunk: {(chunks.reduce((sum, chunk) => sum + chunk.size, 0) / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {(isAnalyzing || isTranscribing || chunkingProgress) && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="font-medium text-yellow-800">
              {isAnalyzing ? 'Analizzando file...' : 
               chunkingProgress ? chunkingProgress.message : 
               'Trascrizione in corso...'}
            </span>
          </div>
          {chunkingProgress && (
            <div className="w-full bg-yellow-200 rounded-full h-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${chunkingProgress.percentage}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-4">
        {/* Step 1: Analyze File */}
        {audioFile && !audioAnalysis && (
          <button
            onClick={analyzeAudioFile}
            disabled={isAnalyzing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <BarChart3 className="w-5 h-5" />
            <span>{isAnalyzing ? 'Analizzando...' : '📊 Analizza File Audio'}</span>
          </button>
        )}

        {/* Step 2: Create Chunks (if needed) */}
        {audioAnalysis && audioAnalysis.needsChunking && chunks.length === 0 && (
          <button
            onClick={async () => {
              if (!audioFile) return;
              setError(null);
              addLog('Iniziando creazione chunk...', 'info');
              
              try {
                const audioChunks = await audioChunker.chunkAudioFile(
                  audioFile, 
                  10,
                  setChunkingProgress
                );
                setChunks(audioChunks);
                addLog(`${audioChunks.length} chunk creati con successo`, 'success');
              } catch (err: any) {
                addLog(`Errore creazione chunk: ${err.message}`, 'error');
                setError(err.message);
              }
            }}
            disabled={chunkingProgress !== null}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Scissors className="w-5 h-5" />
            <span>✂️ Crea Chunk Audio ({audioAnalysis.estimatedChunks} parti)</span>
          </button>
        )}

        {/* Step 3: Transcribe */}
        {audioFile && audioAnalysis && (audioAnalysis.needsChunking ? chunks.length > 0 : true) && (
          <div className="space-y-3">
            {/* Mode Selection */}
            <div className="flex space-x-2">
              <label className="flex items-center space-x-2 bg-blue-50 border border-blue-200 rounded-lg p-3 cursor-pointer flex-1">
                <input
                  type="radio"
                  value="transcribe"
                  checked={mode === 'transcribe'}
                  onChange={(e) => setMode(e.target.value as 'transcribe')}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-blue-800">🎯 Trascrizione</span>
              </label>
              <label className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg p-3 cursor-pointer flex-1">
                <input
                  type="radio"
                  value="translate"
                  checked={mode === 'translate'}
                  onChange={(e) => setMode(e.target.value as 'translate')}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-green-800">🌍 Traduzione in Inglese</span>
              </label>
            </div>

            {/* Transcribe Button */}
            <button
              onClick={handleTranscribe}
              disabled={isTranscribing || !isApiKeyConfigured}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-4 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 text-lg font-semibold"
            >
              <Zap className="w-6 h-6" />
              <span>
                {isTranscribing 
                  ? `🚀 ${mode === 'transcribe' ? 'Trascrivendo' : 'Traducendo'}...` 
                  : `🚀 Avvia ${mode === 'transcribe' ? 'Trascrizione' : 'Traduzione'} Whisper`
                }
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Advanced Options */}
      <div className="mt-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <Settings className="w-4 h-4" />
          <span>Opzioni Avanzate</span>
          <span className="text-xs">{showAdvanced ? '▼' : '▶'}</span>
        </button>

        {showAdvanced && (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formato Risposta
              </label>
              <select
                value={options.response_format}
                onChange={(e) => setOptions({...options, response_format: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="verbose_json">Verbose JSON (dettagliato)</option>
                <option value="json">JSON</option>
                <option value="text">Solo Testo</option>
                <option value="srt">SRT (sottotitoli)</option>
                <option value="vtt">VTT (sottotitoli web)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperatura (0 = preciso, 1 = creativo)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={options.temperature}
                onChange={(e) => setOptions({...options, temperature: parseFloat(e.target.value)})}
                className="w-full"
              />
              <span className="text-sm text-gray-600">{options.temperature}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt Personalizzato (opzionale)
              </label>
              <textarea
                value={options.prompt || ''}
                onChange={(e) => setOptions({...options, prompt: e.target.value})}
                placeholder="Es: Il seguente audio contiene terminologia medica..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Cost Estimate */}
      {costEstimate && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-yellow-600" />
            <div className="text-sm text-yellow-800">
              <span className="font-medium">Costo stimato: {costEstimate.estimatedCost}</span>
              <span className="ml-2">({costEstimate.duration})</span>
            </div>
          </div>
        </div>
      )}

      {/* Logs Section */}
      <div className="mt-6 space-y-4 border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        {/* Console Browser */}
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-lg font-bold text-green-300">🖥️ CONSOLE BROWSER - PREMI F12</h5>
            <div className="text-xs text-gray-400">
              IMPORTANTE: Apri DevTools per vedere i log!
            </div>
          </div>
          <div className="text-sm text-yellow-300 space-y-2 bg-gray-800 p-3 rounded">
            <p className="font-bold">📋 COME VEDERE I LOG:</p>
            <p>1. <strong>Premi F12</strong> (o tasto destro → Ispeziona)</p>
            <p>2. <strong>Clicca su "Console"</strong> nella barra in alto</p>
            <p>3. <strong>Vedrai tutti i log</strong> con emoji: 🚀 🎯 ✅ ❌ ⚠️</p>
            <p>4. <strong>Filtra per "🚀"</strong> per vedere solo i log di AudioScribe</p>
          </div>
        </div>

        {/* Log Applicazione */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-lg font-bold text-gray-800">📋 Log Applicazione ({logs.length})</h4>
            {logs.length > 0 && (
              <button
                onClick={clearLogs}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                🗑️ Pulisci Log
              </button>
            )}
          </div>
          
          {logs.length > 0 ? (
            <div className="bg-gray-900 text-green-400 rounded-lg p-3 max-h-80 overflow-y-auto text-sm font-mono border-2 border-green-500">
              {logs.map((log, index) => (
                <div key={index} className="mb-1 p-1 hover:bg-gray-800 rounded">
                  {log}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-center">
              <div className="text-yellow-800 font-medium">⏳ Nessun log ancora</div>
              <div className="text-sm text-yellow-700 mt-1">I log appariranno quando inizi l'elaborazione</div>
            </div>
          )}
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-6 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <div className="space-y-1">
          <p><strong>💾 Gestione Chunk:</strong> I chunk vengono salvati temporaneamente nella memoria del browser (RAM)</p>
          <p><strong>🔒 Privacy:</strong> Nessun dato viene inviato a server esterni eccetto OpenAI per la trascrizione</p>
          <p><strong>🧹 Pulizia:</strong> I chunk vengono eliminati automaticamente quando chiudi la pagina</p>
          <p><strong>💰 Costo:</strong> $0.006 per minuto di audio • Limite Whisper: 25MB per file</p>
        </div>
      </div>
    </div>
  );
};