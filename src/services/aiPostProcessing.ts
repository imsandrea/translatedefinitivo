import OpenAI from 'openai';

interface SummaryOptions {
  style: 'concise' | 'detailed' | 'bullet-points';
  maxLength?: number;
}

interface QAOptions {
  numberOfQuestions?: number;
  questionStyle: 'simple' | 'detailed' | 'technical';
}

interface QAResult {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

class AIPostProcessingService {
  private openai: OpenAI | null = null;

  setApiKey(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }

  isConfigured(): boolean {
    return this.openai !== null;
  }

  async generateSummary(text: string, options: SummaryOptions = { style: 'concise' }): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI non configurato. Inserisci la tua API key.');
    }

    const stylePrompts = {
      'concise': 'Crea una sintesi concisa e diretta, massimo 150 parole.',
      'detailed': 'Crea una sintesi dettagliata e completa, includendo tutti i punti chiave.',
      'bullet-points': 'Crea una sintesi sotto forma di elenco puntato, evidenziando i punti principali.'
    };

    const systemPrompt = `Sei un assistente esperto nella creazione di sintesi.
${stylePrompts[options.style]}
Mantieni il tono professionale e obiettivo.
Se il testo è in italiano, rispondi in italiano. Se è in inglese, rispondi in inglese.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Crea una sintesi del seguente testo:\n\n${text}` }
        ],
        temperature: 0.3,
        max_tokens: options.maxLength || 500
      });

      return response.choices[0].message.content || 'Errore nella generazione della sintesi';
    } catch (error) {
      console.error('Errore generazione sintesi:', error);
      throw new Error('Impossibile generare la sintesi');
    }
  }

  async generateQA(text: string, options: QAOptions = { questionStyle: 'simple', numberOfQuestions: 5 }): Promise<QAResult> {
    if (!this.openai) {
      throw new Error('OpenAI non configurato. Inserisci la tua API key.');
    }

    const stylePrompts = {
      'simple': 'Crea domande semplici e dirette adatte a un pubblico generale.',
      'detailed': 'Crea domande approfondite che richiedono risposte dettagliate.',
      'technical': 'Crea domande tecniche e specifiche per un pubblico esperto.'
    };

    const systemPrompt = `Sei un assistente esperto nella creazione di Q&A educativi.
${stylePrompts[options.questionStyle]}
Genera ${options.numberOfQuestions || 5} domande con le relative risposte complete.
Se il testo è in italiano, crea domande e risposte in italiano. Se è in inglese, usa l'inglese.
Formatta la risposta come JSON array con questo formato:
[
  {"question": "Domanda 1?", "answer": "Risposta 1"},
  {"question": "Domanda 2?", "answer": "Risposta 2"}
]`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Crea domande e risposte basate sul seguente testo:\n\n${text}` }
        ],
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content || '{}';

      try {
        const parsed = JSON.parse(content);

        if (parsed.qa && Array.isArray(parsed.qa)) {
          return { questions: parsed.qa };
        }

        if (parsed.questions && Array.isArray(parsed.questions)) {
          return { questions: parsed.questions };
        }

        if (Array.isArray(parsed)) {
          return { questions: parsed };
        }

        return { questions: [] };
      } catch (parseError) {
        console.error('Errore parsing JSON:', parseError);

        const lines = content.split('\n').filter(l => l.trim());
        const questions: Array<{ question: string; answer: string }> = [];

        for (let i = 0; i < lines.length - 1; i++) {
          if (lines[i].includes('?')) {
            questions.push({
              question: lines[i].replace(/^\d+\.\s*/, '').trim(),
              answer: lines[i + 1].trim()
            });
            i++;
          }
        }

        return { questions };
      }
    } catch (error) {
      console.error('Errore generazione Q&A:', error);
      throw new Error('Impossibile generare Q&A');
    }
  }

  async improveText(text: string, instructions: string = 'Migliora il testo correggendo errori e migliorando la leggibilità'): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI non configurato. Inserisci la tua API key.');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Sei un assistente esperto nella correzione e miglioramento di testi.
Mantieni lo stesso tono e stile del testo originale.
Correggi errori grammaticali, ortografici e migliora la leggibilità.
${instructions}`
          },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: Math.min(text.length * 2, 4000)
      });

      return response.choices[0].message.content || text;
    } catch (error) {
      console.error('Errore miglioramento testo:', error);
      throw new Error('Impossibile migliorare il testo');
    }
  }
}

export const aiPostProcessing = new AIPostProcessingService();
export type { SummaryOptions, QAOptions, QAResult };
