import { Globe, Users, GraduationCap, MessageCircle, Briefcase, Presentation } from 'lucide-react';

interface AudioSession {
  file: File;
  language: string;
  audioType: 'meeting' | 'interview' | 'lecture' | 'conversation' | 'presentation';
  forceChunking?: boolean;
}

interface WizardStepConfigProps {
  session: AudioSession;
  onUpdate: (updates: Partial<AudioSession>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function WizardStepConfig({ session, onUpdate, onNext, onBack }: WizardStepConfigProps) {
  const languages = [
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
  ];

  const audioTypes = [
    {
      id: 'meeting',
      name: 'Riunione',
      icon: Briefcase,
      description: 'Meeting di lavoro, discussioni di team',
      color: 'blue',
    },
    {
      id: 'interview',
      name: 'Intervista',
      icon: Users,
      description: 'Interviste, colloqui, Q&A',
      color: 'purple',
    },
    {
      id: 'lecture',
      name: 'Lezione',
      icon: GraduationCap,
      description: 'Lezioni universitarie, conferenze',
      color: 'green',
    },
    {
      id: 'presentation',
      name: 'Presentazione',
      icon: Presentation,
      description: 'Presentazioni aziendali, pitch',
      color: 'orange',
    },
    {
      id: 'conversation',
      name: 'Conversazione',
      icon: MessageCircle,
      description: 'Dialoghi generali, podcast',
      color: 'pink',
    },
  ];

  const getColorClasses = (color: string, selected: boolean) => {
    const colors = {
      blue: selected ? 'bg-blue-100 border-blue-500' : 'hover:border-blue-300',
      purple: selected ? 'bg-purple-100 border-purple-500' : 'hover:border-purple-300',
      green: selected ? 'bg-green-100 border-green-500' : 'hover:border-green-300',
      orange: selected ? 'bg-orange-100 border-orange-500' : 'hover:border-orange-300',
      pink: selected ? 'bg-pink-100 border-pink-500' : 'hover:border-pink-300',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Configura la trascrizione
        </h2>
        <p className="text-gray-600">
          Scegli la lingua e il tipo di audio per risultati ottimali
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            <Globe className="w-4 h-4 inline mr-2" />
            Lingua dell'audio
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => onUpdate({ language: lang.code })}
                className={`p-4 border-2 rounded-lg transition-all ${
                  session.language === lang.code
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="text-3xl mb-2">{lang.flag}</div>
                <div className="text-sm font-medium text-gray-900">
                  {lang.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Tipo di audio
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {audioTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = session.audioType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => onUpdate({ audioType: type.id as any })}
                  className={`p-4 border-2 rounded-lg transition-all text-left ${
                    getColorClasses(type.color, isSelected)
                  } ${!isSelected && 'border-gray-200'}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      isSelected ? 'bg-white' : 'bg-gray-100'
                    }`}>
                      <Icon className="w-6 h-6 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {type.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {type.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Suggerimento:</strong> La scelta del tipo di audio aiuta il sistema a:
        </p>
        <ul className="text-sm text-yellow-700 mt-2 ml-4 list-disc space-y-1">
          <li>Identificare meglio i diversi parlanti</li>
          <li>Formattare il testo in modo appropriato</li>
          <li>Applicare le ottimizzazioni giuste per il contesto</li>
        </ul>
      </div>

      <div className="border-t pt-4 mt-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={session.forceChunking || false}
            onChange={(e) => onUpdate({ forceChunking: e.target.checked })}
            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">
              Forza chunking (per test)
            </span>
            <p className="text-xs text-gray-500">
              Abilita il chunking anche per file piccoli, utile per testare il sistema
            </p>
          </div>
        </label>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
        >
          Indietro
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
        >
          Avvia Trascrizione
        </button>
      </div>
    </div>
  );
}
