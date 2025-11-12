import { useState, useEffect } from 'react';
import { Upload, Settings, Mic, FileText, ChevronRight, ChevronLeft, Key, AlertCircle } from 'lucide-react';
import { WizardStepUpload } from './wizard/WizardStepUpload';
import { WizardStepConfig } from './wizard/WizardStepConfig';
import { WizardStepTranscribe } from './wizard/WizardStepTranscribe';
import { WizardStepEditor } from './wizard/WizardStepEditor';
import { checkApiKeyStatus } from '../services/configService';

export type WizardStep = 'upload' | 'config' | 'transcribe' | 'editor';

interface AudioSession {
  file: File;
  language: string;
  audioType: 'meeting' | 'interview' | 'lecture' | 'conversation' | 'presentation';
  transcription?: string;
}

export function TranscriptionWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [audioSession, setAudioSession] = useState<AudioSession | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<{
    hasApiKey: boolean;
    keyPreview?: string;
    error?: string;
    loading: boolean;
  }>({ hasApiKey: false, loading: true });

  useEffect(() => {
    checkApiKeyStatus().then(status => {
      setApiKeyStatus({ ...status, loading: false });
    });
  }, []);

  const steps = [
    { id: 'upload', label: 'Carica Audio', icon: Upload },
    { id: 'config', label: 'Configura', icon: Settings },
    { id: 'transcribe', label: 'Trascrivi', icon: Mic },
    { id: 'editor', label: 'Modifica', icon: FileText },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id as WizardStep);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id as WizardStep);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                AudioScribe Pro
              </h1>
              <p className="text-gray-600">
                Trascrizione audio professionale guidata passo dopo passo
              </p>
            </div>

            <div className="ml-6">
              {apiKeyStatus.loading ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">Checking API key...</span>
                </div>
              ) : apiKeyStatus.hasApiKey ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <Key className="w-4 h-4 text-green-600" />
                  <div className="text-sm">
                    <div className="font-medium text-green-900">API Key Configured</div>
                    <div className="text-green-700 font-mono text-xs">{apiKeyStatus.keyPreview}</div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <div className="text-sm">
                    <div className="font-medium text-red-900">API Key Missing</div>
                    <div className="text-red-700 text-xs">Configure in database</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg scale-110'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`mt-2 text-sm font-medium ${
                        isActive
                          ? 'text-blue-600'
                          : isCompleted
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-4 transition-all ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8 min-h-[500px]">
          {currentStep === 'upload' && (
            <WizardStepUpload
              onFileSelected={(file) => {
                setAudioSession({ file, language: 'it', audioType: 'meeting' });
                goToNextStep();
              }}
            />
          )}

          {currentStep === 'config' && audioSession && (
            <WizardStepConfig
              session={audioSession}
              onUpdate={(updates) => {
                setAudioSession({ ...audioSession, ...updates });
              }}
              onNext={goToNextStep}
              onBack={goToPrevStep}
            />
          )}

          {currentStep === 'transcribe' && audioSession && (
            <WizardStepTranscribe
              session={audioSession}
              onTranscriptionComplete={(transcription) => {
                setAudioSession({ ...audioSession, transcription });
                goToNextStep();
              }}
              onBack={goToPrevStep}
            />
          )}

          {currentStep === 'editor' && audioSession?.transcription && (
            <WizardStepEditor
              transcription={audioSession.transcription}
              language={audioSession.language}
              audioType={audioSession.audioType}
              onBack={goToPrevStep}
              onReset={() => {
                setAudioSession(null);
                setCurrentStep('upload');
              }}
            />
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Step {currentStepIndex + 1} di {steps.length}</p>
        </div>
      </div>
    </div>
  );
}
