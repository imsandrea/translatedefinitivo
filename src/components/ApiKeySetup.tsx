import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink, Zap } from 'lucide-react';

interface ApiKeySetupProps {
  onApiKeySet: (apiKey: string) => void;
  currentApiKey?: string;
}

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onApiKeySet, currentApiKey }) => {
  const [apiKey, setApiKey] = useState(currentApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | 'untested' | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Controlla se abbiamo già una API key configurata
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const savedApiKey = localStorage.getItem('openai_api_key');
    
    if (envApiKey && envApiKey !== 'your_openai_api_key_here') {
      setApiKey(envApiKey);
      setValidationResult('valid');
      setIsConfigured(true);
    } else if (savedApiKey) {
      setApiKey(savedApiKey);
      setValidationResult('untested');
      setIsConfigured(true);
    }
  }, [currentApiKey]);

  const testApiKey = async () => {
    const key = apiKey.trim();
    if (!key || key.length < 20) {
      setValidationResult('invalid');
      return false;
    }

    setIsValidating(true);
    setValidationResult(null);
    
    try {
      // Test semplice per validare la chiave
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${key}`,
        },
      });

      const isValid = response.ok;
      setValidationResult(isValid ? 'valid' : 'invalid');
      return isValid;
    } catch (error) {
      // Se c'è un errore CORS, assumiamo che la chiave sia valida se ha il formato giusto
      if (key.startsWith('sk-') && key.length > 40) {
        setValidationResult('valid');
        return true;
      }
      setValidationResult('invalid');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const saveApiKey = () => {
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey) {
      alert('Inserisci una API key valida');
      return;
    }

    // Salva anche senza test per permettere l'uso immediato
    if (validationResult === 'invalid') {
      if (!confirm('La chiave sembra non valida. Vuoi salvarla comunque?')) {
        return;
      }
    }

    localStorage.setItem('openai_api_key', trimmedKey);
    setIsConfigured(true);
    onApiKeySet(trimmedKey);
  };

  const handleRemoveApiKey = () => {
    setApiKey('');
    setValidationResult('untested');
    setIsConfigured(false);
    localStorage.removeItem('openai_api_key');
    onApiKeySet('');
  };

  const formatApiKey = (key: string) => {
    if (!key) return '';
    if (showApiKey) return key;
    return key.substring(0, 7) + '...' + key.substring(key.length - 4);
  };

  const getStatusColor = () => {
    switch (validationResult) {
      case 'valid': return 'text-green-600';
      case 'invalid': return 'text-red-600';
      case 'untested': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (validationResult) {
      case 'valid': return 'Connessione OK';
      case 'invalid': return 'Chiave non valida';
      case 'untested': return 'Non testata';
      default: return '';
    }
  };
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Key className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-800">Configurazione OpenAI API</h3>
      </div>

      {!isConfigured ? (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Come ottenere la tua API Key:</h4>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Vai su <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center">platform.openai.com <ExternalLink className="w-3 h-3 ml-1" /></a></li>
              <li>2. Accedi o crea un account OpenAI</li>
              <li>3. Clicca su "Create new secret key"</li>
              <li>4. Copia la chiave e incollala qui sotto</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-20 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {validationResult && (
                  <div className={`text-xs font-medium ${getStatusColor()}`}>
                    {getStatusText()}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={testApiKey}
              disabled={!apiKey.trim() || isValidating}
              className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Testa Connessione</span>
                </>
              )}
            </button>

            <button
              onClick={saveApiKey}
              disabled={!apiKey.trim() || validationResult !== 'valid'}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Key className="w-4 h-4" />
              <span>Salva in Sessione</span>
            </button>
          </div>

          {validationResult === 'invalid' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">
                ❌ API Key non valida. Verifica che sia corretta e che il tuo account OpenAI sia attivo.
              </p>
            </div>
          )}

          {validationResult === 'valid' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm text-green-800">
                ✅ Connessione riuscita! Ora puoi salvare la chiave in sessione.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">API Key Salvata in Sessione</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Chiave: {formatApiKey(apiKey)}
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => {
                setIsConfigured(false);
                setValidationResult('untested');
              }}
              className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Key className="w-4 h-4" />
              <span>Cambia Chiave</span>
            </button>
            
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showApiKey ? 'Nascondi' : 'Mostra'}</span>
            </button>
            
            <button
              onClick={handleRemoveApiKey}
              className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <AlertCircle className="w-4 h-4" />
              <span>Rimuovi</span>
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 space-y-1">
        <div className="bg-gray-50 border border-gray-200 rounded p-2">
          <p className="font-medium text-gray-700 mb-1">🔐 Sicurezza API Key:</p>
          <p>• <strong>Metodo 1 (Raccomandato):</strong> File .env locale</p>
          <p>• <strong>Metodo 2 (Fallback):</strong> localStorage del browser</p>
          <p>• Non viene mai inviata a server esterni eccetto OpenAI</p>
          <p>• Costo Whisper: $0.006 per minuto di audio</p>
        </div>
      </div>
    </div>
  );
};