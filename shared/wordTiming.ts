import { CaptionCue, WordTimestamp } from './types';

/**
 * Calculates word-level timestamps for a caption cue.
 * If explicit word timestamps exist in cue.words, returns them.
 * Otherwise, estimates word timings proportionally based on character length.
 */
export function getCueWords(cue: CaptionCue): WordTimestamp[] {
  if (cue.words && cue.words.length > 0) {
    return cue.words;
  }

  // Tokenize preserving line breaks
  const lines = cue.text.trim().split(/\r?\n/);
  const rawWords: Array<{ word: string; hasNewline: boolean }> = [];

  for (let l = 0; l < lines.length; l++) {
    const lineWords = lines[l].trim().split(/\s+/).filter(Boolean);
    for (let w = 0; w < lineWords.length; w++) {
      const isEndOfLine = w === lineWords.length - 1 && l < lines.length - 1;
      rawWords.push({ word: lineWords[w], hasNewline: isEndOfLine });
    }
  }

  if (rawWords.length === 0) return [];

  const totalDuration = Math.max(0.1, cue.endTime - cue.startTime);

  if (rawWords.length === 1) {
    return [
      {
        word: rawWords[0].word,
        startTime: cue.startTime,
        endTime: cue.endTime,
        isEstimated: true,
        hasNewline: rawWords[0].hasNewline,
      },
    ];
  }

  // Weight words by length (minimum weight 2 for small prepositions)
  const weights = rawWords.map((item) => Math.max(2, item.word.length));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let currentStart = cue.startTime;
  const wordTimestamps: WordTimestamp[] = [];

  for (let i = 0; i < rawWords.length; i++) {
    const wordDuration = (weights[i] / totalWeight) * totalDuration;
    const wordEnd = i === rawWords.length - 1
      ? cue.endTime
      : Math.round((currentStart + wordDuration) * 1000) / 1000;

    wordTimestamps.push({
      word: rawWords[i].word,
      startTime: Math.round(currentStart * 1000) / 1000,
      endTime: wordEnd,
      isEstimated: true,
      hasNewline: rawWords[i].hasNewline,
    });

    currentStart = wordEnd;
  }

  return wordTimestamps;
}

/**
 * Given a list of word timestamps and the current playback time,
 * returns the index of the currently active word, or -1 if none.
 */
export function getActiveWordIndex(words: WordTimestamp[], currentTime: number): number {
  if (!words.length) return -1;

  for (let i = 0; i < words.length; i++) {
    if (currentTime >= words[i].startTime && currentTime <= words[i].endTime) {
      return i;
    }
  }

  // If slightly before first word
  if (currentTime < words[0].startTime) return 0;
  // If slightly after last word
  if (currentTime >= words[words.length - 1].endTime) return words.length - 1;

  return -1;
}
