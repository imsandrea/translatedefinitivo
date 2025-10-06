// Servizi di trascrizione alternativi a OpenAI Whisper

interface TranscriptionService {
  name: string;
  provider: string;
  maxFileSize: number; // in MB
  supportedFormats: string[];
  pricing: string;
  features: string[];
  setup: string;
}

// 1. ASSEMBLYAI - Molto popolare, ottima qualità
export class AssemblyAIService {
  private apiKey: string;
  private baseUrl = 'https://api.assemblyai.com/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribeAudio(audioFile: File, options: {
    language_code?: string;
    speaker_labels?: boolean;
    auto_chapters?: boolean;
    sentiment_analysis?: boolean;
    entity_detection?: boolean;
  } = {}): Promise<any> {
    try {
      // 1. Upload file
      const uploadResponse = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
        },
        body: audioFile
      });
      
      const { upload_url } = await uploadResponse.json();

      // 2. Start transcription
      const transcriptResponse = await fetch(`${this.baseUrl}/transcript`, {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: upload_url,
          language_code: options.language_code || 'it',
          speaker_labels: options.speaker_labels || false,
          auto_chapters: options.auto_chapters || false,
          sentiment_analysis: options.sentiment_analysis || false,
          entity_detection: options.entity_detection || false,
        })
      });

      const transcript = await transcriptResponse.json();
      
      // 3. Poll for completion
      return await this.pollForCompletion(transcript.id);
    } catch (error) {
      throw new Error(`AssemblyAI Error: ${error}`);
    }
  }

  private async pollForCompletion(transcriptId: string): Promise<any> {
    while (true) {
      const response = await fetch(`${this.baseUrl}/transcript/${transcriptId}`, {
        headers: { 'authorization': this.apiKey }
      });
      
      const transcript = await response.json();
      
      if (transcript.status === 'completed') {
        return transcript;
      } else if (transcript.status === 'error') {
        throw new Error(`Transcription failed: ${transcript.error}`);
      }
      
      // Wait 3 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

// 2. DEEPGRAM - Veloce, real-time, ottimo per streaming
export class DeepgramService {
  private apiKey: string;
  private baseUrl = 'https://api.deepgram.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribeAudio(audioFile: File, options: {
    language?: string;
    model?: string;
    smart_format?: boolean;
    punctuate?: boolean;
    diarize?: boolean;
    summarize?: boolean;
  } = {}): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/listen`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': audioFile.type,
        },
        body: audioFile
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Deepgram Error: ${error}`);
    }
  }
}

// 3. GOOGLE CLOUD SPEECH-TO-TEXT
export class GoogleSpeechService {
  private apiKey: string;
  private baseUrl = 'https://speech.googleapis.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribeAudio(audioFile: File, options: {
    languageCode?: string;
    enableAutomaticPunctuation?: boolean;
    enableSpeakerDiarization?: boolean;
    diarizationSpeakerCount?: number;
  } = {}): Promise<any> {
    try {
      // Convert file to base64
      const base64Audio = await this.fileToBase64(audioFile);
      
      const response = await fetch(`${this.baseUrl}/speech:recognize?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: this.getAudioEncoding(audioFile.type),
            sampleRateHertz: 16000,
            languageCode: options.languageCode || 'it-IT',
            enableAutomaticPunctuation: options.enableAutomaticPunctuation || true,
            enableSpeakerDiarization: options.enableSpeakerDiarization || false,
            diarizationSpeakerCount: options.diarizationSpeakerCount || 2,
          },
          audio: {
            content: base64Audio
          }
        })
      });

      return await response.json();
    } catch (error) {
      throw new Error(`Google Speech Error: ${error}`);
    }
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  private getAudioEncoding(mimeType: string): string {
    if (mimeType.includes('wav')) return 'LINEAR16';
    if (mimeType.includes('flac')) return 'FLAC';
    if (mimeType.includes('ogg')) return 'OGG_OPUS';
    return 'MP3';
  }
}

// 4. AZURE COGNITIVE SERVICES
export class AzureSpeechService {
  private subscriptionKey: string;
  private region: string;
  private baseUrl: string;

  constructor(subscriptionKey: string, region: string = 'westeurope') {
    this.subscriptionKey = subscriptionKey;
    this.region = region;
    this.baseUrl = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`;
  }

  async transcribeAudio(audioFile: File, options: {
    language?: string;
    format?: string;
  } = {}): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}?language=${options.language || 'it-IT'}&format=${options.format || 'detailed'}`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': this.subscriptionKey,
            'Content-Type': audioFile.type,
          },
          body: audioFile
        }
      );

      return await response.json();
    } catch (error) {
      throw new Error(`Azure Speech Error: ${error}`);
    }
  }
}

// 5. SPEECHMATICS - Ottimo per lingue multiple
export class SpeechmaticsService {
  private apiKey: string;
  private baseUrl = 'https://asr.api.speechmatics.com/v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribeAudio(audioFile: File, options: {
    language?: string;
    operating_point?: string;
    enable_partials?: boolean;
  } = {}): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('data_file', audioFile);
      formData.append('config', JSON.stringify({
        type: 'transcription',
        transcription_config: {
          language: options.language || 'it',
          operating_point: options.operating_point || 'enhanced',
          enable_partials: options.enable_partials || false,
        }
      }));

      const response = await fetch(`${this.baseUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData
      });

      const job = await response.json();
      return await this.pollJobStatus(job.id);
    } catch (error) {
      throw new Error(`Speechmatics Error: ${error}`);
    }
  }

  private async pollJobStatus(jobId: string): Promise<any> {
    while (true) {
      const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });
      
      const job = await response.json();
      
      if (job.job.status === 'done') {
        // Get transcript
        const transcriptResponse = await fetch(`${this.baseUrl}/jobs/${jobId}/transcript`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          }
        });
        return await transcriptResponse.json();
      } else if (job.job.status === 'rejected') {
        throw new Error(`Job rejected: ${job.job.errors}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Configurazione servizi disponibili
export const TRANSCRIPTION_SERVICES: Record<string, TranscriptionService> = {
  whisper: {
    name: 'OpenAI Whisper',
    provider: 'OpenAI',
    maxFileSize: 25,
    supportedFormats: ['mp3', 'mp4', 'wav', 'flac', 'ogg', 'm4a'],
    pricing: '$0.006/minuto',
    features: ['99+ lingue', 'Traduzione', 'Timestamp', 'Alta qualità'],
    setup: 'API Key OpenAI'
  },
  assemblyai: {
    name: 'AssemblyAI',
    provider: 'AssemblyAI',
    maxFileSize: 2048, // 2GB
    supportedFormats: ['mp3', 'wav', 'flac', 'm4a', 'mp4'],
    pricing: '$0.00037/secondo (~$1.33/ora)',
    features: ['Speaker diarization', 'Sentiment analysis', 'Auto chapters', 'Entity detection'],
    setup: 'API Key AssemblyAI'
  },
  deepgram: {
    name: 'Deepgram Nova-2',
    provider: 'Deepgram',
    maxFileSize: 2048,
    supportedFormats: ['mp3', 'wav', 'flac', 'm4a', 'ogg'],
    pricing: '$0.0043/minuto',
    features: ['Real-time', 'Streaming', 'Smart formatting', 'Summarization'],
    setup: 'API Key Deepgram'
  },
  google: {
    name: 'Google Cloud Speech',
    provider: 'Google Cloud',
    maxFileSize: 10,
    supportedFormats: ['wav', 'flac', 'mp3', 'ogg'],
    pricing: '$0.006/15 secondi',
    features: ['125+ lingue', 'Speaker diarization', 'Profanity filter'],
    setup: 'Google Cloud API Key'
  },
  azure: {
    name: 'Azure Speech Services',
    provider: 'Microsoft Azure',
    maxFileSize: 200,
    supportedFormats: ['wav', 'ogg', 'mp3', 'flac'],
    pricing: '$1/ora',
    features: ['85+ lingue', 'Custom models', 'Batch transcription'],
    setup: 'Azure Subscription Key'
  },
  speechmatics: {
    name: 'Speechmatics',
    provider: 'Speechmatics',
    maxFileSize: 2048,
    supportedFormats: ['wav', 'mp3', 'flac', 'm4a'],
    pricing: '$0.10/ora',
    features: ['34+ lingue', 'Real-time', 'Custom dictionary'],
    setup: 'Speechmatics API Key'
  }
};

// Factory per creare servizi
export class TranscriptionServiceFactory {
  static createService(provider: string, apiKey: string, options?: any) {
    switch (provider) {
      case 'assemblyai':
        return new AssemblyAIService(apiKey);
      case 'deepgram':
        return new DeepgramService(apiKey);
      case 'google':
        return new GoogleSpeechService(apiKey);
      case 'azure':
        return new AzureSpeechService(apiKey, options?.region);
      case 'speechmatics':
        return new SpeechmaticsService(apiKey);
      default:
        throw new Error(`Provider ${provider} not supported`);
    }
  }
}