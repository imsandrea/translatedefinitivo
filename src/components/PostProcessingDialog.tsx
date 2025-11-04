import React, { useState } from 'react';
import { X, FileText, MessageSquare, Download, Copy } from 'lucide-react';
import { aiPostProcessing, type SummaryOptions, type QAOptions } from '../services/aiPostProcessing';

interface PostProcessingDialogProps {
  text: string;
  isVisible: boolean;
  onClose: () => void;
}

export const PostProcessingDialog: React.FC<PostProcessingDialogProps> = ({
  text,
  isVisible,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'qa'>('summary');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [qaResult, setQAResult] = useState<Array<{ question: string; answer: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const [summaryStyle, setSummaryStyle] = useState<'concise' | 'detailed' | 'bullet-points'>('concise');
  const [qaStyle, setQAStyle] = useState<'simple' | 'detailed' | 'technical'>('simple');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);

  const handleGenerateSummary = async () => {
    setIsProcessing(true);
    setError(null);
    setResult('');

    try {
      const options: SummaryOptions = {
        style: summaryStyle
      };

      const summary = await aiPostProcessing.generateSummary(text, options);
      setResult(summary);
    } catch (err: any) {
      setError(err.message || 'Errore durante la generazione della sintesi');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateQA = async () => {
    setIsProcessing(true);
    setError(null);
    setQAResult([]);

    try {
      const options: QAOptions = {
        questionStyle: qaStyle,
        numberOfQuestions
      };

      const qa = await aiPostProcessing.generateQA(text, options);
      setQAResult(qa.questions);
    } catch (err: any) {
      setError(err.message || 'Errore durante la generazione di Q&A');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    let content = '';
    let filename = '';

    if (activeTab === 'summary') {
      content = result;
      filename = `sintesi_${new Date().toISOString().slice(0, 10)}.txt`;
    } else {
      content = qaResult.map((qa, index) =>
        `${index + 1}. ${qa.question}\n\n${qa.answer}\n\n`
      ).join('---\n\n');
      filename = `qa_${new Date().toISOString().slice(0, 10)}.txt`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyResult = () => {
    let content = '';

    if (activeTab === 'summary') {
      content = result;
    } else {
      content = qaResult.map((qa, index) =>
        `${index + 1}. ${qa.question}\n\n${qa.answer}\n\n`
      ).join('---\n\n');
    }

    navigator.clipboard.writeText(content);
  };

  if (!isVisible) return null;

  const hasResult = (activeTab === 'summary' && result) || (activeTab === 'qa' && qaResult.length > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-xl font-semibold text-gray-800">
            Post-Processing AI
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'summary'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <FileText className="w-4 h-4 inline-block mr-2" />
            Sintesi
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'qa'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline-block mr-2" />
            Q&A
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'summary' ? (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stile sintesi
                </label>
                <select
                  value={summaryStyle}
                  onChange={(e) => setSummaryStyle(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={isProcessing}
                >
                  <option value="concise">Concisa</option>
                  <option value="detailed">Dettagliata</option>
                  <option value="bullet-points">Punti elenco</option>
                </select>
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={isProcessing || !aiPostProcessing.isConfigured()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 mb-4"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Generazione in corso...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    <span>Genera Sintesi</span>
                  </>
                )}
              </button>

              {result && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-800">Sintesi generata</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={copyResult}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Copia"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={downloadResult}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Scarica"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{result}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stile domande
                  </label>
                  <select
                    value={qaStyle}
                    onChange={(e) => setQAStyle(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={isProcessing}
                  >
                    <option value="simple">Semplici</option>
                    <option value="detailed">Dettagliate</option>
                    <option value="technical">Tecniche</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numero domande
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={numberOfQuestions}
                    onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    disabled={isProcessing}
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateQA}
                disabled={isProcessing || !aiPostProcessing.isConfigured()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 mb-4"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Generazione in corso...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-5 h-5" />
                    <span>Genera Q&A</span>
                  </>
                )}
              </button>

              {qaResult.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-gray-800">Q&A generati</h4>
                    <div className="flex space-x-2">
                      <button
                        onClick={copyResult}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Copia"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={downloadResult}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Scarica"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {qaResult.map((qa, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="font-semibold text-blue-700 mb-2">
                          {index + 1}. {qa.question}
                        </p>
                        <p className="text-gray-700 leading-relaxed">{qa.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {!aiPostProcessing.isConfigured() && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              Configura la tua API key OpenAI per utilizzare queste funzionalità.
            </div>
          )}
        </div>

        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
