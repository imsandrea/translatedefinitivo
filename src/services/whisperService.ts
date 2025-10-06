import OpenAI from 'openai';

interface TranscriptionOptions {
  language?: string;
  prompt?: string;
  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
}

interface TranscriptionResult {
  text: string;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }>;
  language?: string;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    probability: number;
  }>;
}

class WhisperService {
  private openai: OpenAI | null = null;
  private apiKey: string | null = null;

  constructor() {
    // Priorità: 1. File .env, 2. localStorage
    const envApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const savedApiKey = localStorage.getItem('openai_api_key');
    
    if (envApiKey && envApiKey !== 'your_openai_api_key_here') {
      this.apiKey = envApiKey;
    } else if (savedApiKey) {
      this.apiKey = savedApiKey;
    }
    
    if (this.apiKey) {
      this.initializeOpenAI();
    }
  }

  private initializeOpenAI() {
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true
      });
    }
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
    }
    this.initializeOpenAI();
  }

  isConfigured(): boolean {
    return !!this.apiKey && !!this.openai;
  }

  async transcribeAudio(
    audioFile: File,
    options: TranscriptionOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    if (!this.openai) {
      throw new Error('OpenAI API non configurata. Inserisci la tua API key.');
    }

    // Verifica dimensione file (max 25MB per Whisper)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      throw new Error(`Il file è troppo grande (${(audioFile.size / 1024 / 1024).toFixed(1)}MB). Whisper supporta file fino a 25MB. Usa il chunking automatico.`);
    }

    try {
      onProgress?.(10);

      // Prepara le opzioni per Whisper
      const transcriptionOptions: any = {
        file: audioFile,
        model: 'whisper-1',
        language: options.language || 'it', // Default italiano
        response_format: options.response_format || 'verbose_json',
        temperature: options.temperature || 0,
      };

      if (options.prompt) {
        transcriptionOptions.prompt = options.prompt;
      }

      onProgress?.(30);

      console.log(`🎯 Inviando a Whisper: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)}MB)`);
      // Chiamata all'API Whisper
      const response = await this.openai.audio.transcriptions.create(transcriptionOptions);

      onProgress?.(90);

      console.log(`✅ Risposta Whisper ricevuta per: ${audioFile.name}`);
      // Gestione della risposta basata sul formato
      let result: TranscriptionResult;
      
      // Sempre verbose_json per avere dati dettagliati
      result = {
        text: (response as any).text,
        segments: (response as any).segments || [],
        language: (response as any).language,
        words: (response as any).words || []
      };

      console.log(`📝 Testo trascritto: ${result.text.length} caratteri`);
      onProgress?.(100);
      return result;

    } catch (error: any) {
      console.error('Errore durante la trascrizione:', error);
      
      if (error.code === 'insufficient_quota') {
        throw new Error('Quota API esaurita. Verifica il tuo piano OpenAI.');
      } else if (error.code === 'invalid_api_key') {
        throw new Error('API key non valida. Verifica la tua chiave OpenAI.');
      } else if (error.message?.includes('rate_limit')) {
        throw new Error('Limite di rate raggiunto. Riprova tra qualche minuto.');
      } else {
        throw new Error(`Errore durante la trascrizione: ${error.message || 'Errore sconosciuto'}`);
      }
    }
  }

  async translateAudio(
    audioFile: File,
    options: Omit<TranscriptionOptions, 'language'> = {},
    onProgress?: (progress: number) => void
  ): Promise<TranscriptionResult> {
    if (!this.openai) {
      throw new Error('OpenAI API non configurata. Inserisci la tua API key.');
    }

    try {
      onProgress?.(10);

      const translationOptions: any = {
        file: audioFile,
        model: 'whisper-1',
        response_format: options.response_format || 'verbose_json',
        temperature: options.temperature || 0,
      };

      if (options.prompt) {
        translationOptions.prompt = options.prompt;
      }

      onProgress?.(30);

      const response = await this.openai.audio.translations.create(translationOptions);

      onProgress?.(90);

      let result: TranscriptionResult;
      
      if (options.response_format === 'verbose_json') {
        result = {
          text: (response as any).text,
          segments: (response as any).segments,
          language: (response as any).language
        };
      } else {
        result = {
          text: typeof response === 'string' ? response : (response as any).text
        };
      }

      onProgress?.(100);
      return result;

    } catch (error: any) {
      console.error('Errore durante la traduzione:', error);
      throw new Error(`Errore durante la traduzione: ${error.message || 'Errore sconosciuto'}`);
    }
  }

  // Formati audio supportati da Whisper
  getSupportedFormats(): string[] {
    return [
      'mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'flac', 'ogg'
    ];
  }

  // Stima del costo per la trascrizione
  estimateCost(audioFile: File): { duration: string; estimatedCost: string } {
    // Stima approssimativa: 1MB ≈ 1 minuto di audio
    const estimatedMinutes = Math.ceil(audioFile.size / (1024 * 1024));
    const costPerMinute = 0.006; // $0.006 per minuto (prezzo OpenAI)
    const estimatedCost = (estimatedMinutes * costPerMinute).toFixed(3);
    
    return {
      duration: `~${estimatedMinutes} minuti`,
      estimatedCost: `~$${estimatedCost}`
    };
  }

  // Analizza i segmenti per identificare pause naturali
  analyzeNaturalPauses(segments: any[]): Array<{
    text: string;
    isPauseAfter: boolean;
    pauseDuration: number;
    confidence: number;
  }> {
    if (!segments || segments.length === 0) return [];

    const analyzedSegments = [];
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];
      
      let pauseDuration = 0;
      let isPauseAfter = false;
      
      if (nextSegment) {
        pauseDuration = nextSegment.start - segment.end;
        // Considera una pausa significativa se > 0.8 secondi
        isPauseAfter = pauseDuration > 0.8;
      }
      
      analyzedSegments.push({
        text: segment.text.trim(),
        isPauseAfter,
        pauseDuration,
        confidence: 1 - (segment.no_speech_prob || 0)
      });
    }
    
    return analyzedSegments;
  }

  // Crea paragrafi basati su pause naturali
  createParagraphsFromPauses(segments: any[]): string {
    const analyzedSegments = this.analyzeNaturalPauses(segments);
    
    if (analyzedSegments.length === 0) {
      return segments.map(s => s.text).join(' ');
    }
    
    let paragraphs: string[] = [];
    let currentParagraph = '';
    
    for (let i = 0; i < analyzedSegments.length; i++) {
      const segment = analyzedSegments[i];
      
      currentParagraph += segment.text + ' ';
      
      // Crea nuovo paragrafo se:
      // 1. C'è una pausa significativa (> 0.8s)
      // 2. Il paragrafo corrente è già lungo (> 200 caratteri)
      // 3. È l'ultimo segmento
      const shouldBreakParagraph = 
        segment.isPauseAfter || 
        (currentParagraph.length > 200 && segment.pauseDuration > 0.3) ||
        i === analyzedSegments.length - 1;
      
      if (shouldBreakParagraph) {
        paragraphs.push(currentParagraph.trim());
        currentParagraph = '';
      }
    }
    
    // Filtra paragrafi vuoti e unisci con doppio newline
    return paragraphs
      .filter(p => p.length > 0)
      .join('\n\n');
  }
}

export const whisperService = new WhisperService();
export type { TranscriptionOptions, TranscriptionResult };