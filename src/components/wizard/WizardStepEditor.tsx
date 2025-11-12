import { useState } from 'react';
import { Download, Sparkles, Languages, FileText, RotateCcw, Copy, Check } from 'lucide-react';
import { textFormatter } from '../../services/textFormatter';
import { aiPostProcessing } from '../../services/aiPostProcessing';
import { translationService } from '../../services/translationService';
import { getApiKey } from '../../services/configService';

interface WizardStepEditorProps {
  transcription: string;
  language: string;
  audioType: string;
  onBack: () => void;
  onReset: () => void;
}

export function WizardStepEditor({
  transcription,
  language,
  audioType,
  onBack,
  onReset,
}: WizardStepEditorProps) {
  const [text, setText] = useState(transcription);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'format' | 'translate' | 'summary'>('format');
  const [processingMessage, setProcessingMessage] = useState('');
  const [showContinueButton, setShowContinueButton] = useState(false);

  const handleFormat = async () => {
    const apiKey = await getApiKey();
    if (!apiKey) {
      alert('API Key OpenAI non configurata nel database. Contatta l\'amministratore.');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Formattazione del testo in corso...');
    setShowContinueButton(false);
    try {
      textFormatter.setApiKey(apiKey);
      const result = await textFormatter.formatByType(
        text,
        audioType as any
      );
      setText(result.formattedText);
      setShowContinueButton(true);
      setProcessingMessage('Formattazione completata!');
    } catch (error: any) {
      alert(`Errore: ${error.message}`);
      setProcessingMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranslate = async (targetLang: string) => {
    const apiKey = await getApiKey();
    if (!apiKey) {
      alert('API Key OpenAI non configurata nel database. Contatta l\'amministratore.');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage(`Traduzione in corso...`);
    setShowContinueButton(false);
    try {
      translationService.setApiKey(apiKey);
      const translated = await translationService.translateText(
        text,
        language,
        targetLang
      );
      setText(translated);
      setProcessingMessage('Traduzione completata!');
    } catch (error: any) {
      alert(`Errore: ${error.message}`);
      setProcessingMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSummary = async () => {
    const apiKey = await getApiKey();
    if (!apiKey) {
      alert('API Key OpenAI non configurata nel database. Contatta l\'amministratore.');
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Generazione sintesi in corso...');
    setShowContinueButton(false);
    try {
      aiPostProcessing.setApiKey(apiKey);
      const summary = await aiPostProcessing.generateSummary(text, {
        style: 'detailed',
      });
      setText(summary);
      setProcessingMessage('Sintesi completata!');
    } catch (error: any) {
      alert(`Errore: ${error.message}`);
      setProcessingMessage('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (format: 'txt' | 'docx') => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trascrizione.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const charCount = text.length;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Editor Avanzato
        </h2>
        <p className="text-gray-600">
          Modifica, formatta, traduci e scarica la tua trascrizione
        </p>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('format')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'format'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Sparkles className="w-4 h-4 inline mr-2" />
          Formattazione
        </button>
        <button
          onClick={() => setActiveTab('translate')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'translate'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Languages className="w-4 h-4 inline mr-2" />
          Traduzione
        </button>
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'summary'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Sintesi
        </button>
      </div>

      {activeTab === 'format' && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            Formattazione Intelligente
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Migliora la leggibilità con paragrafi, titoli e punteggiatura ottimizzata
          </p>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleFormat}
              disabled={isProcessing}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
            >
              {isProcessing ? 'Formattazione...' : 'Formatta Testo'}
            </button>
            {showContinueButton && (
              <button
                onClick={() => {
                  setActiveTab('translate');
                  setShowContinueButton(false);
                }}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
              >
                <Languages className="w-4 h-4" />
                <span>Vai alla Traduzione</span>
              </button>
            )}
          </div>
          {isProcessing && (
            <div className="mt-4 flex items-center space-x-3 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">{processingMessage}</span>
            </div>
          )}
          {!isProcessing && processingMessage && (
            <div className="mt-4 flex items-center space-x-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">{processingMessage}</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'translate' && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            Traduci in un'altra lingua
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { code: 'it', name: 'Italiano', flag: '🇮🇹', actualTarget: 'en' },
              { code: 'en', name: 'Inglese', flag: '🇬🇧', actualTarget: 'en' },
              { code: 'es', name: 'Spagnolo', flag: '🇪🇸', actualTarget: 'es' },
              { code: 'fr', name: 'Francese', flag: '🇫🇷', actualTarget: 'fr' },
              { code: 'de', name: 'Tedesco', flag: '🇩🇪', actualTarget: 'de' },
              { code: 'pt', name: 'Portoghese', flag: '🇵🇹', actualTarget: 'pt' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleTranslate(lang.actualTarget)}
                disabled={isProcessing}
                className="p-3 bg-white border-2 border-gray-200 hover:border-blue-400 disabled:opacity-50 rounded-lg transition-colors"
              >
                <div className="text-2xl mb-1">{lang.flag}</div>
                <div className="text-sm font-medium">{lang.name}</div>
              </button>
            ))}
          </div>
          {isProcessing && (
            <div className="mt-4 flex items-center space-x-3 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">{processingMessage}</span>
            </div>
          )}
          {!isProcessing && processingMessage && (
            <div className="mt-4 flex items-center space-x-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">{processingMessage}</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            Genera Sintesi
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Crea un riassunto dettagliato del contenuto
          </p>
          <button
            onClick={handleSummary}
            disabled={isProcessing}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {isProcessing ? 'Generazione...' : 'Genera Sintesi'}
          </button>
          {isProcessing && (
            <div className="mt-4 flex items-center space-x-3 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">{processingMessage}</span>
            </div>
          )}
          {!isProcessing && processingMessage && (
            <div className="mt-4 flex items-center space-x-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">{processingMessage}</span>
            </div>
          )}
        </div>
      )}

      <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>{wordCount} parole</span>
            <span>{charCount} caratteri</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Copiato!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="text-sm">Copia</span>
              </>
            )}
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-96 p-4 font-mono text-sm resize-none focus:outline-none"
          placeholder="La tua trascrizione apparirà qui..."
        />
      </div>

      <div className="flex items-center justify-between pt-4">
        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Indietro
          </button>
          <button
            onClick={onReset}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Nuova Trascrizione</span>
          </button>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => handleDownload('txt')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Scarica TXT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
