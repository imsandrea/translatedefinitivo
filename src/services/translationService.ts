import OpenAI from 'openai';

interface TranslationOptions {
  targetLanguage: string;
  sourceLanguage?: string;
}

class TranslationService {
  private client: OpenAI | null = null;
  private apiKey: string | null = null;

  setApiKey(key: string) {
    this.apiKey = key;
    this.client = new OpenAI({
      apiKey: key,
      dangerouslyAllowBrowser: true
    });
  }

  isConfigured(): boolean {
    return this.client !== null && this.apiKey !== null;
  }

  async translateText(text: string, options: TranslationOptions): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client non configurato. Inserisci la tua API key.');
    }

    if (!text || text.trim().length === 0) {
      throw new Error('Nessun testo da tradurre');
    }

    const { targetLanguage, sourceLanguage } = options;

    const sourceLanguageText = sourceLanguage && sourceLanguage !== 'auto'
      ? `from ${this.getLanguageName(sourceLanguage)} `
      : '';

    const prompt = `Translate the following text ${sourceLanguageText}to ${this.getLanguageName(targetLanguage)}.
Keep the same formatting, structure, and tone. Only provide the translation, without any additional comments or explanations.

Text to translate:
${text}`;

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the text accurately while preserving formatting, structure, and tone.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const translatedText = response.choices[0]?.message?.content?.trim();

      if (!translatedText) {
        throw new Error('La traduzione è vuota');
      }

      return translatedText;
    } catch (error) {
      console.error('Errore durante la traduzione:', error);
      if (error instanceof Error) {
        throw new Error(`Errore di traduzione: ${error.message}`);
      }
      throw new Error('Errore sconosciuto durante la traduzione');
    }
  }

  private getLanguageName(code: string): string {
    const languages: Record<string, string> = {
      'en': 'English',
      'it': 'Italian',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'pl': 'Polish',
      'tr': 'Turkish',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'cs': 'Czech',
      'ro': 'Romanian',
      'el': 'Greek',
      'he': 'Hebrew',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'uk': 'Ukrainian',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'sk': 'Slovak',
      'sl': 'Slovenian'
    };

    return languages[code] || code;
  }
}

export const translationService = new TranslationService();
