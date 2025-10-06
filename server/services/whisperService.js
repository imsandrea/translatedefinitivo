import OpenAI from 'openai';
import fs from 'fs';

class WhisperService {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  async transcribeFile(filePath, options = {}) {
    try {
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-1',
        language: options.language || 'it',
        response_format: options.response_format || 'verbose_json',
        temperature: options.temperature || 0,
        prompt: options.prompt || undefined
      });

      return transcription;
    } catch (error) {
      console.error('Errore trascrizione Whisper:', error);
      throw new Error(`Trascrizione fallita: ${error.message}`);
    }
  }

  async transcribeSegments(segments, options = {}, onProgress) {
    const results = [];
    const total = segments.length;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      try {
        console.log(`Trascrivendo segmento ${i + 1}/${total}...`);
        
        const result = await this.transcribeFile(segment.path, options);
        results.push({
          segmentIndex: segment.index,
          startTime: segment.startTime,
          endTime: segment.endTime,
          text: result.text,
          segments: result.segments || [],
          language: result.language
        });

        // Callback progresso
        if (onProgress) {
          onProgress({
            completed: i + 1,
            total: total,
            percentage: Math.round(((i + 1) / total) * 100),
            currentSegment: segment.index
          });
        }

      } catch (error) {
        console.error(`Errore segmento ${segment.index}:`, error);
        results.push({
          segmentIndex: segment.index,
          startTime: segment.startTime,
          endTime: segment.endTime,
          text: '',
          error: error.message
        });
      }
    }

    return results;
  }

  // Combina risultati di segmenti in un testo unico
  combineResults(results) {
    const sortedResults = results.sort((a, b) => a.segmentIndex - b.segmentIndex);
    
    const fullText = sortedResults
      .filter(result => result.text && !result.error)
      .map(result => result.text.trim())
      .join(' ');

    const detailedSegments = sortedResults.map(result => ({
      index: result.segmentIndex,
      startTime: result.startTime,
      endTime: result.endTime,
      duration: result.endTime - result.startTime,
      text: result.text || '',
      error: result.error || null,
      wordCount: result.text ? result.text.split(' ').length : 0
    }));

    return {
      fullText,
      segments: detailedSegments,
      totalSegments: results.length,
      successfulSegments: results.filter(r => !r.error).length,
      failedSegments: results.filter(r => r.error).length,
      totalWords: fullText.split(' ').length,
      estimatedDuration: Math.max(...sortedResults.map(r => r.endTime))
    };
  }

  // Genera sottotitoli SRT
  generateSRT(results) {
    let srtContent = '';
    let subtitleIndex = 1;

    const sortedResults = results.sort((a, b) => a.segmentIndex - b.segmentIndex);

    for (const result of sortedResults) {
      if (result.text && !result.error) {
        const startTime = this.formatSRTTime(result.startTime);
        const endTime = this.formatSRTTime(result.endTime);
        
        srtContent += `${subtitleIndex}\n`;
        srtContent += `${startTime} --> ${endTime}\n`;
        srtContent += `${result.text.trim()}\n\n`;
        
        subtitleIndex++;
      }
    }

    return srtContent;
  }

  formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }
}

export default WhisperService;