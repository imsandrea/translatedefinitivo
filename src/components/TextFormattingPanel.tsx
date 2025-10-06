import React, { useState } from 'react';
import { Wand2, FileText, Users, BookOpen, MessageCircle, Presentation, Sparkles, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react';
import { textFormatter, FormattingOptions, FormattedText } from '../services/textFormatter';

interface TextFormattingPanelProps {
  text: string;
  onFormattedText: (formattedText: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const TextFormattingPanel: React.FC<TextFormattingPanelProps> = ({
  text,
  onFormattedText,
  isVisible,
  onClose
}) => {
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattingResult, setFormattingResult] = useState<FormattedText | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'auto' | 'meeting' | 'interview' | 'lecture' | 'conversation' | 'presentation'>('auto');
  const [options, setOptions] = useState<FormattingOptions>({
    addParagraphs: true,
    addTitles: true,
    addTimestamps: false,
    addSpeakers: false,
    language: 'it'
  });

  const contentTypes = [
    { id: 'auto', name: 'Automatico', icon: Wand2, description: 'Formattazione intelligente automatica' },
    { id: 'meeting', name: 'Riunione', icon: Users, description: 'Verbale con decisioni e azioni' },
    { id: 'interview', name: 'Intervista', icon: MessageCircle, description: 'Domande e risposte separate' },
    { id: 'lecture', name: 'Lezione', icon: BookOpen, description: 'Struttura didattica con argomenti' },
    { id: 'conversation', name: 'Conversazione', icon: MessageCircle, description: 'Dialogo con speaker identificati' },
    { id: 'presentation', name: 'Presentazione', icon: Presentation, description: 'Slide e punti chiave' }
  ];

  const handleFormat = async () => {
    if (!text || text.trim().length < 50) {
      setError('Testo troppo breve per la formattazione (minimo 50 caratteri)');
      return;
    }

    if (!textFormatter.isConfigured()) {
      setError('API Key OpenAI non configurata. Configura la chiave nelle impostazioni Whisper.');
      return;
    }

    setIsFormatting(true);
    setError(null);
    setFormattingResult(null);

    try {
      let result: FormattedText;

      if (selectedType === 'auto') {
        result = await textFormatter.formatWithAI(text, options);
      } else {
        result = await textFormatter.formatByType(text, selectedType as any);
      }

      setFormattingResult(result);
    } catch (err: any) {
      console.error('Errore formattazione:', err);
      setError(err.message);
      
      // Fallback alla formattazione base
      try {
        const basicResult = textFormatter.formatBasic(text);
        setFormattingResult(basicResult);
        setError('Usata formattazione base (AI non disponibile): ' + err.message);
      } catch (basicErr: any) {
        setError('Errore anche nella formattazione base: ' + basicErr.message);
      }
    } finally {
      setIsFormatting(false);
    }
  };

  const applyFormatting = () => {
    if (formattingResult) {
      onFormattedText(formattingResult.formattedText);
      onClose();
    }
  };

  const getReadabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReadabilityLabel = (score: number) => {
    if (score >= 80) return 'Eccellente';
    if (score >= 60) return 'Buona';
    if (score >= 40) return 'Sufficiente';
    return 'Da migliorare';
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-600 p-2 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Formattazione Intelligente</h2>
                <p className="text-sm text-gray-600">Rendi il testo più leggibile con l'AI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Tipo di Contenuto */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Tipo di Contenuto</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {contentTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <label
                    key={type.id}
                    className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedType === type.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <input
                      type="radio"
                      value={type.id}
                      checked={selectedType === type.id}
                      onChange={(e) => setSelectedType(e.target.value as any)}
                      className="sr-only"
                    />
                    <Icon className="w-5 h-5 text-purple-600 mr-2" />
                    <div>
                      <div className="font-medium text-gray-800">{type.name}</div>
                      <div className="text-xs text-gray-600">{type.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Opzioni Avanzate */}
          {selectedType === 'auto' && (
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3">Opzioni di Formattazione</h4>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.addParagraphs}
                    onChange={(e) => setOptions({...options, addParagraphs: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Aggiungi paragrafi</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.addTitles}
                    onChange={(e) => setOptions({...options, addTitles: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Aggiungi titoli</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.addSpeakers}
                    onChange={(e) => setOptions({...options, addSpeakers: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Identifica speaker</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={options.addTimestamps}
                    onChange={(e) => setOptions({...options, addTimestamps: e.target.checked})}
                    className="mr-2"
                  />
                  <span className="text-sm">Mantieni timestamp</span>
                </label>
              </div>
            </div>
          )}

          {/* Statistiche Testo Originale */}
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">📊 Testo Originale</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-600">Parole:</span>
                <p className="font-medium">{text.split(/\s+/).length}</p>
              </div>
              <div>
                <span className="text-blue-600">Caratteri:</span>
                <p className="font-medium">{text.length}</p>
              </div>
              <div>
                <span className="text-blue-600">Paragrafi:</span>
                <p className="font-medium">{text.split('\n\n').length}</p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Risultato Formattazione */}
          {formattingResult && (
            <div className="mb-6 space-y-4">
              {/* Statistiche Miglioramenti */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-green-800">✨ Formattazione Completata</h4>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-green-600">Parole:</span>
                    <p className="font-medium">{formattingResult.wordCount}</p>
                  </div>
                  <div>
                    <span className="text-green-600">Caratteri:</span>
                    <p className="font-medium">{formattingResult.formattedText.length}</p>
                  </div>
                  <div>
                    <span className="text-green-600">Leggibilità:</span>
                    <p className={`font-medium ${getReadabilityColor(formattingResult.readabilityScore)}`}>
                      {formattingResult.readabilityScore}/100 ({getReadabilityLabel(formattingResult.readabilityScore)})
                    </p>
                  </div>
                  <div>
                    <span className="text-green-600">Miglioramenti:</span>
                    <p className="font-medium">{formattingResult.improvements.length}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <h5 className="font-medium text-green-800">Miglioramenti applicati:</h5>
                  {formattingResult.improvements.map((improvement, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm text-green-700">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span>{improvement}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anteprima Testo Formattato */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">📄 Anteprima Testo Formattato</h4>
                <div className="max-h-60 overflow-y-auto bg-white border rounded p-3 text-sm leading-relaxed">
                  <div dangerouslySetInnerHTML={{
                    __html: formattingResult.formattedText
                      .replace(/\n\n/g, '</p><p>')
                      .replace(/^/, '<p>')
                      .replace(/$/, '</p>')
                      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-bold text-gray-800 mt-4 mb-2">$1</h2>')
                      .replace(/^### (.*$)/gm, '<h3 class="text-md font-semibold text-gray-700 mt-3 mb-1">$1</h3>')
                      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {text.length < 50 ? (
                <span className="text-red-600">⚠️ Testo troppo breve (minimo 50 caratteri)</span>
              ) : !textFormatter.isConfigured() ? (
                <span className="text-yellow-600">⚠️ API Key OpenAI richiesta</span>
              ) : (
                <span>✅ Pronto per la formattazione</span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annulla
              </button>
              
              {formattingResult && (
                <button
                  onClick={applyFormatting}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Applica Formattazione</span>
                </button>
              )}
              
              <button
                onClick={handleFormat}
                disabled={isFormatting || text.length < 50 || !textFormatter.isConfigured()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                {isFormatting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Formattando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Formatta con AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};