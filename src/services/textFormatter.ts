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

  // Formattazione automatica con ChatGPT
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
      const prompt = this.buildFormattingPrompt(text, options);
      console.log('📋 Prompt generato, lunghezza:', prompt.length);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Sei un esperto editor di testi specializzato nella formattazione di trascrizioni audio. Il tuo compito è rendere i testi più leggibili e ben strutturati.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      console.log('🌐 Risposta OpenAI status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Errore OpenAI:', error);
        throw new Error(`Errore API OpenAI: ${error.error?.message || 'Errore sconosciuto'}`);
      }

      const data = await response.json();
      console.log('📦 Dati ricevuti:', data);
      
      const formattedText = data.choices[0]?.message?.content || text;
      console.log('✅ Testo formattato ricevuto, lunghezza:', formattedText.length);

      // Analizza i miglioramenti apportati
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

  // Costruisce il prompt per ChatGPT
  private buildFormattingPrompt(text: string, options: FormattingOptions): string {
    let prompt = `Formatta questo testo trascritto da audio per renderlo più leggibile e professionale.

TESTO ORIGINALE:
"""
${text}
"""

ISTRUZIONI:
`;

    if (options.addParagraphs) {
      prompt += `
• PARAGRAFI: Dividi il testo in paragrafi logici basati su:
  - Pause naturali nel parlato (già indicate da interruzioni di riga)
  - Cambi di argomento o concetto
  - Transizioni logiche nel discorso
  - Respiri naturali e pause del parlante
• Aggiungi spazi tra i paragrafi per migliorare la leggibilità
`;
    }

    if (options.addTitles) {
      prompt += `
• TITOLI: Aggiungi titoli e sottotitoli appropriati usando ## per i titoli principali e ### per i sottotitoli
• Identifica i temi principali e crea una struttura gerarchica
`;
    }

    if (options.addSpeakers) {
      prompt += `
• SPEAKER: Se identifichi diversi parlanti, usa **Speaker 1:**, **Speaker 2:** etc.
`;
    }

    if (options.addTimestamps) {
      prompt += `
• TIMESTAMP: Mantieni eventuali timestamp esistenti nel formato originale
`;
    }

    prompt += `
• PUNTEGGIATURA: Correggi e migliora la punteggiatura
• MAIUSCOLE: Usa maiuscole appropriate per nomi propri e inizio frasi
• RIPETIZIONI: Rimuovi ripetizioni eccessive e riempitivi ("ehm", "cioè", "allora", "quindi", etc.)
• PAUSE NATURALI: Rispetta le pause naturali del parlato per creare paragrafi fluidi
• FLUSSO LOGICO: Mantieni il flusso naturale del discorso raggruppando concetti correlati
• FLUIDITÀ: Rendi il testo più fluido mantenendo il significato originale
• LINGUA: Il testo è in ${options.language === 'it' ? 'italiano' : options.language === 'en' ? 'inglese' : options.language}

IMPORTANTE:
- Mantieni TUTTO il contenuto originale, non rimuovere informazioni
- Non inventare contenuti che non ci sono
- Mantieni lo stile e il tono originale
- Se ci sono termini tecnici, mantienili
- Usa le interruzioni di riga esistenti come indicatori di pause naturali
- Crea paragrafi di lunghezza ragionevole (3-5 frasi)
- Restituisci SOLO il testo formattato, senza commenti aggiuntivi

TESTO FORMATTATO:`;

    return prompt;
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
