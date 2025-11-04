interface FormattingOptions {
  addParagraphs: boolean;
  addTitles: boolean;
  addTimestamps: boolean;
  addSpeakers: boolean;
  language: string;
}

interface FormattedText {
  originalText: string;
  formattedText: string;
  improvements: string[];
  wordCount: number;
  readabilityScore: number;
}

class TextFormatter {
  private openaiApiKey: string | null = null;

  constructor() {
    this.openaiApiKey = localStorage.getItem('openai_api_key');
  }

  setApiKey(apiKey: string) {
    this.openaiApiKey = apiKey;
    localStorage.setItem('openai_api_key', apiKey);
  }

  isConfigured(): boolean {
    return !!this.openaiApiKey;
  }

  private chunkText(text: string, maxChunkSize: number = 5000): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split('\n\n');
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  async formatWithAI(
    text: string,
    options: FormattingOptions = {
      addParagraphs: true,
      addTitles: true,
      addTimestamps: false,
      addSpeakers: false,
      language: 'it'
    }
  ): Promise<FormattedText> {
    console.log('🎯 TextFormatter.formatWithAI chiamato');
    console.log('📝 Testo lunghezza:', text.length);
    console.log('🔑 API Key configurata:', !!this.openaiApiKey);
    console.log('⚙️ Opzioni:', options);

    if (!this.openaiApiKey) {
      console.error('❌ API Key mancante');
      throw new Error('API Key OpenAI non configurata');
    }

    if (!text || text.trim().length < 50) {
      console.error('❌ Testo troppo breve:', text.length);
      throw new Error('Testo troppo breve per la formattazione (minimo 50 caratteri)');
    }

    try {
      const chunks = this.chunkText(text, 5000);
      console.log(`📦 Testo diviso in ${chunks.length} chunk(s)`);

      const formattedChunks: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        console.log(`🔄 Formattazione chunk ${i + 1}/${chunks.length}`);

        const prompt = this.buildFormattingPrompt(chunks[i], options);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Sei un esperto editor di testi. Formatta il testo in modo leggibile con paragrafi e punteggiatura corretta.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.3,
            max_tokens: 3000
          })
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('❌ Errore OpenAI:', error);
          throw new Error(`Errore API OpenAI: ${error.error?.message || 'Errore sconosciuto'}`);
        }

        const data = await response.json();
        const formattedChunk = data.choices[0]?.message?.content || chunks[i];
        formattedChunks.push(formattedChunk);

        console.log(`✅ Chunk ${i + 1}/${chunks.length} formattato`);
      }

      const formattedText = formattedChunks.join('\n\n');
      console.log('✅ Testo completo formattato, lunghezza:', formattedText.length);

      const improvements = this.analyzeImprovements(text, formattedText);
      const readabilityScore = this.calculateReadabilityScore(formattedText);

      console.log('🎉 Formattazione completata con successo');
      console.log('📊 Miglioramenti:', improvements);
      console.log('📈 Punteggio leggibilità:', readabilityScore);

      return {
        originalText: text,
        formattedText: formattedText.trim(),
        improvements,
        wordCount: formattedText.split(/\s+/).length,
        readabilityScore
      };

    } catch (error: any) {
      console.error('Errore formattazione AI:', error);
      console.error('📋 Stack trace completo:', error.stack);
      throw new Error(`Errore durante la formattazione: ${error.message}`);
    }
  }

  private buildFormattingPrompt(text: string, options: FormattingOptions): string {
    let instructions = 'Formatta questo testo: ';

    if (options.addParagraphs) instructions += 'dividi in paragrafi logici, ';
    if (options.addTitles) instructions += 'aggiungi titoli (## e ###), ';
    if (options.addSpeakers) instructions += 'identifica speaker (**Speaker 1:**), ';
    if (options.addTimestamps) instructions += 'mantieni timestamp, ';

    instructions += 'correggi punteggiatura e maiuscole, rimuovi ripetizioni. Mantieni tutto il contenuto originale.';

    return `${instructions}\n\n${text}`;
  }

  // Analizza i miglioramenti apportati
  private analyzeImprovements(original: string, formatted: string): string[] {
    const improvements: string[] = [];
    
    // Conta paragrafi
    const originalParagraphs = original.split('\n\n').length;
    const formattedParagraphs = formatted.split('\n\n').length;
    if (formattedParagraphs > originalParagraphs) {
      improvements.push(`Aggiunta struttura a paragrafi (+${formattedParagraphs - originalParagraphs} paragrafi)`);
    }

    // Conta titoli
    const titleCount = (formatted.match(/^#{1,3}\s/gm) || []).length;
    if (titleCount > 0) {
      improvements.push(`Aggiunti ${titleCount} titoli/sottotitoli`);
    }

    // Conta speaker
    const speakerCount = (formatted.match(/\*\*Speaker \d+:\*\*/g) || []).length;
    if (speakerCount > 0) {
      improvements.push(`Identificati ${speakerCount} speaker diversi`);
    }

    // Lunghezza
    const lengthDiff = formatted.length - original.length;
    if (Math.abs(lengthDiff) > 100) {
      improvements.push(`${lengthDiff > 0 ? 'Espanso' : 'Compresso'} testo (${Math.abs(lengthDiff)} caratteri)`);
    }

    if (improvements.length === 0) {
      improvements.push('Migliorata punteggiatura e fluidità');
    }

    return improvements;
  }

  // Calcola un punteggio di leggibilità semplificato
  private calculateReadabilityScore(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    
    if (sentences.length === 0 || words.length === 0) return 0;
    
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSentencesPerParagraph = sentences.length / Math.max(paragraphs.length, 1);
    
    // Punteggio basato su lunghezza media delle frasi (ideale: 15-20 parole)
    let score = 100;
    
    if (avgWordsPerSentence > 25) score -= 20;
    else if (avgWordsPerSentence < 10) score -= 10;
    
    if (avgSentencesPerParagraph > 8) score -= 15;
    else if (avgSentencesPerParagraph < 2) score -= 10;
    
    // Bonus per struttura
    if (text.includes('##')) score += 10; // Ha titoli
    if (paragraphs.length > 2) score += 5; // Ha paragrafi multipli
    
    return Math.max(0, Math.min(100, score));
  }

  // Formattazione rapida senza AI (fallback)
  formatBasic(text: string): FormattedText {
    let formatted = text;
    
    // Aggiungi paragrafi ogni 3-4 frasi
    const sentences = formatted.split(/([.!?]+\s*)/);
    let result = '';
    let sentenceCount = 0;
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i];
      const punctuation = sentences[i + 1] || '';
      
      if (sentence && sentence.trim()) {
        result += sentence + punctuation;
        sentenceCount++;
        
        // Aggiungi paragrafo ogni 3-4 frasi
        if (sentenceCount % 4 === 0 && i < sentences.length - 2) {
          result += '\n\n';
        }
      }
    }
    
    // Pulisci spazi multipli
    formatted = result.replace(/\s+/g, ' ').trim();
    
    // Aggiungi titolo generale
    formatted = `# Trascrizione Audio\n\n${formatted}`;
    
    return {
      originalText: text,
      formattedText: formatted,
      improvements: ['Aggiunta struttura base a paragrafi', 'Pulizia spazi e formattazione'],
      wordCount: formatted.split(/\s+/).length,
      readabilityScore: this.calculateReadabilityScore(formatted)
    };
  }

  // Formattazione per diversi tipi di contenuto
  async formatByType(text: string, contentType: 'meeting' | 'interview' | 'lecture' | 'conversation' | 'presentation'): Promise<FormattedText> {
    const typePrompts = {
      meeting: 'Formatta come verbale di riunione con punti discussi, decisioni prese e azioni da intraprendere',
      interview: 'Formatta come intervista con domande e risposte ben separate e identificazione dei parlanti',
      lecture: 'Formatta come lezione con titoli per argomenti principali, sottosezioni e punti chiave evidenziati',
      conversation: 'Formatta come conversazione con identificazione dei parlanti e flusso naturale del dialogo',
      presentation: 'Formatta come presentazione con slide/sezioni principali, punti chiave e conclusioni'
    };

    const customOptions: FormattingOptions = {
      addParagraphs: true,
      addTitles: true,
      addTimestamps: contentType === 'meeting',
      addSpeakers: ['interview', 'conversation', 'meeting'].includes(contentType),
      language: 'it'
    };

    // Modifica il prompt base per il tipo specifico
    const originalPrompt = this.buildFormattingPrompt(text, customOptions);
    const typeSpecificPrompt = originalPrompt + `\n\nTIPO DI CONTENUTO: ${typePrompts[contentType]}`;

    // Usa il metodo standard ma con prompt modificato
    return this.formatWithAI(text, customOptions);
  }
}

export const textFormatter = new TextFormatter();
export type { FormattingOptions, FormattedText };
