export interface SpeakerSegment {
  speaker: string;
  text: string;
  startIndex: number;
  endIndex: number;
}

export function detectSpeakers(text: string): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];

  const speakerPatterns = [
    /^([A-Z][a-z]+):\s*/gm,
    /^(Speaker\s+\d+):\s*/gim,
    /^(Interlocutore\s+\d+):\s*/gim,
    /^([A-Z]):\s*/gm,
  ];

  let hasExplicitSpeakers = false;
  for (const pattern of speakerPatterns) {
    if (pattern.test(text)) {
      hasExplicitSpeakers = true;
      break;
    }
  }

  if (hasExplicitSpeakers) {
    return extractExplicitSpeakers(text);
  }

  return detectImplicitSpeakers(text);
}

function extractExplicitSpeakers(text: string): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];
  const lines = text.split('\n');
  let currentSpeaker = 'Speaker 1';
  let currentText = '';
  let startIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const speakerMatch = line.match(/^([A-Z][a-z]+|Speaker\s+\d+|Interlocutore\s+\d+|[A-Z]):\s*(.*)/i);

    if (speakerMatch) {
      if (currentText) {
        segments.push({
          speaker: currentSpeaker,
          text: currentText.trim(),
          startIndex,
          endIndex: startIndex + currentText.length
        });
      }
      currentSpeaker = speakerMatch[1];
      currentText = speakerMatch[2] + ' ';
      startIndex = startIndex + (currentText ? currentText.length : 0);
    } else {
      currentText += line + ' ';
    }
  }

  if (currentText) {
    segments.push({
      speaker: currentSpeaker,
      text: currentText.trim(),
      startIndex,
      endIndex: startIndex + currentText.length
    });
  }

  return segments;
}

function detectImplicitSpeakers(text: string): SpeakerSegment[] {
  const segments: SpeakerSegment[] = [];

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  const chunkSize = Math.ceil(sentences.length / 4);
  let currentIndex = 0;

  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize).join(' ');
    const speakerNum = Math.floor(i / chunkSize) + 1;

    segments.push({
      speaker: `Speaker ${speakerNum}`,
      text: chunk.trim(),
      startIndex: currentIndex,
      endIndex: currentIndex + chunk.length
    });

    currentIndex += chunk.length;
  }

  return segments;
}

export function formatTranscriptionWithSpeakers(segments: SpeakerSegment[]): string {
  return segments.map(seg => `${seg.speaker}: ${seg.text}`).join('\n\n');
}

export function getSpeakerColor(speaker: string): string {
  const colors = [
    '#3B82F6',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F97316',
  ];

  const hash = speaker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
