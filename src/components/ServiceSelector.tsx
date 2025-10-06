import React, { useState } from 'react';
import { Bot, Zap, Globe, Cloud, Mic, Settings, ExternalLink, DollarSign, Clock, HardDrive } from 'lucide-react';
import { TRANSCRIPTION_SERVICES } from '../services/alternativeTranscriptionServices';

interface ServiceSelectorProps {
  selectedService: string;
  onServiceChange: (service: string) => void;
  onApiKeyChange: (apiKey: string, provider: string) => void;
}

export const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  selectedService,
  onServiceChange,
  onApiKeyChange
}) => {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showApiKeyInput, setShowApiKeyInput] = useState<string | null>(null);

  const handleServiceSelect = (serviceKey: string) => {
    onServiceChange(serviceKey);
    
    // Se il servizio richiede API key e non ce l'abbiamo, mostra input
    if (serviceKey !== 'web-speech' && !apiKeys[serviceKey]) {
      setShowApiKeyInput(serviceKey);
    }
  };

  const handleApiKeySubmit = (serviceKey: string, apiKey: string) => {
    setApiKeys(prev => ({ ...prev, [serviceKey]: apiKey }));
    onApiKeyChange(apiKey, serviceKey);
    setShowApiKeyInput(null);
  };

  const getServiceIcon = (serviceKey: string) => {
    switch (serviceKey) {
      case 'whisper': return <Bot className="w-5 h-5 text-blue-600" />;
      case 'assemblyai': return <Zap className="w-5 h-5 text-purple-600" />;
      case 'deepgram': return <Mic className="w-5 h-5 text-green-600" />;
      case 'google': return <Globe className="w-5 h-5 text-red-600" />;
      case 'azure': return <Cloud className="w-5 h-5 text-blue-500" />;
      case 'speechmatics': return <Settings className="w-5 h-5 text-orange-600" />;
      default: return <Bot className="w-5 h-5 text-gray-600" />;
    }
  };

  const getServiceColor = (serviceKey: string) => {
    switch (serviceKey) {
      case 'whisper': return 'border-blue-200 bg-blue-50';
      case 'assemblyai': return 'border-purple-200 bg-purple-50';
      case 'deepgram': return 'border-green-200 bg-green-50';
      case 'google': return 'border-red-200 bg-red-50';
      case 'azure': return 'border-blue-200 bg-blue-50';
      case 'speechmatics': return 'border-orange-200 bg-orange-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        🎯 Scegli Servizio di Trascrizione
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Object.entries(TRANSCRIPTION_SERVICES).map(([key, service]) => (
          <div
            key={key}
            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedService === key 
                ? `${getServiceColor(key)} border-opacity-100` 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => handleServiceSelect(key)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getServiceIcon(key)}
                <h4 className="font-semibold text-gray-800">{service.name}</h4>
              </div>
              {selectedService === key && (
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-2">{service.provider}</p>

            <div className="space-y-1 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <DollarSign className="w-3 h-3" />
                <span>{service.pricing}</span>
              </div>
              <div className="flex items-center space-x-1">
                <HardDrive className="w-3 h-3" />
                <span>Max: {service.maxFileSize}MB</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{service.supportedFormats.join(', ').toUpperCase()}</span>
              </div>
            </div>

            <div className="mt-2">
              <div className="flex flex-wrap gap-1">
                {service.features.slice(0, 2).map((feature, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                  >
                    {feature}
                  </span>
                ))}
                {service.features.length > 2 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                    +{service.features.length - 2}
                  </span>
                )}
              </div>
            </div>

            {/* API Key Status */}
            {key !== 'web-speech' && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                {apiKeys[key] ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-700">API Key configurata</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-red-700">API Key richiesta</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* API Key Input Modal */}
      {showApiKeyInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">
              Configura {TRANSCRIPTION_SERVICES[showApiKeyInput].name}
            </h4>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                placeholder="Inserisci la tua API key..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const apiKey = (e.target as HTMLInputElement).value;
                    if (apiKey.trim()) {
                      handleApiKeySubmit(showApiKeyInput, apiKey.trim());
                    }
                  }
                }}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <h5 className="font-medium text-blue-800 mb-2">Come ottenere l'API Key:</h5>
              <div className="text-sm text-blue-700">
                {showApiKeyInput === 'assemblyai' && (
                  <p>1. Vai su <a href="https://www.assemblyai.com/" target="_blank" className="underline">assemblyai.com</a><br/>
                     2. Crea account gratuito<br/>
                     3. Copia API key dal dashboard</p>
                )}
                {showApiKeyInput === 'deepgram' && (
                  <p>1. Vai su <a href="https://deepgram.com/" target="_blank" className="underline">deepgram.com</a><br/>
                     2. Registrati per il piano gratuito<br/>
                     3. Genera API key</p>
                )}
                {showApiKeyInput === 'google' && (
                  <p>1. Vai su <a href="https://cloud.google.com/speech-to-text" target="_blank" className="underline">Google Cloud Console</a><br/>
                     2. Abilita Speech-to-Text API<br/>
                     3. Crea credenziali API key</p>
                )}
                {showApiKeyInput === 'azure' && (
                  <p>1. Vai su <a href="https://azure.microsoft.com/services/cognitive-services/speech-services/" target="_blank" className="underline">Azure Portal</a><br/>
                     2. Crea risorsa Speech Services<br/>
                     3. Copia chiave e regione</p>
                )}
                {showApiKeyInput === 'speechmatics' && (
                  <p>1. Vai su <a href="https://www.speechmatics.com/" target="_blank" className="underline">speechmatics.com</a><br/>
                     2. Registrati per trial gratuito<br/>
                     3. Genera API token</p>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowApiKeyInput(null)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                  const apiKey = input?.value?.trim();
                  if (apiKey) {
                    handleApiKeySubmit(showApiKeyInput, apiKey);
                  }
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service Comparison */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3">🔍 Confronto Rapido</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h5 className="font-medium text-green-700 mb-1">💰 Più Economici</h5>
            <p className="text-gray-600">Speechmatics, AssemblyAI</p>
          </div>
          <div>
            <h5 className="font-medium text-blue-700 mb-1">⚡ Più Veloci</h5>
            <p className="text-gray-600">Deepgram, Whisper</p>
          </div>
          <div>
            <h5 className="font-medium text-purple-700 mb-1">🎯 Più Funzioni</h5>
            <p className="text-gray-600">AssemblyAI, Azure</p>
          </div>
        </div>
      </div>
    </div>
  );
};