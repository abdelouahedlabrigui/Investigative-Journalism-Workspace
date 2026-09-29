import React, { useEffect, useRef, useState } from 'react';

interface TextToSpeechProps {
  text: string;
  rate?: number; // e.g., 1.3 for faster speech
  pitch?: number; // Not used (Piper typically doesn't support)
  volume?: number; // Handled by browser audio controls
  onSentenceChange?: (index: number | null) => void;
}

export const cleanTextForSpeech = (markdown: string): string => {
  return markdown
    .replace(/```[\s\S]*?\n([\s\S]*?)```/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\|?[\s:-]+\|[\s|:-]*$/gm, '')
    .replace(/\|/g, ' ')
    .replace(/[*_~]+/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\([()[\]])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
};

export const splitTextIntoSentences = (text: string): string[] =>
  text.match(/(?:[^.!?]|[.!?](?!\s|$))+[.!?]*(?:\s+|$)/g)?.map(sentence => sentence.trim()).filter(Boolean) ?? [];

const TextToSpeech: React.FC<TextToSpeechProps> = ({
  text,
  rate = 1.3,
  pitch = 1, // unused
  volume = 1,
  onSentenceChange,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const sentenceIndexRef = useRef(0);
  const playbackIdRef = useRef(0);

  const synthesizeAndPlay = async () => {
    const speechText = cleanTextForSpeech(text);
    const sentences = splitTextIntoSentences(speechText);
    if (!sentences.length) return;

    // Stop any ongoing playback/fetch
    stop();

    setIsLoading(true);
    const playbackId = ++playbackIdRef.current;

    for (let index = 0; index < sentences.length; index += 1) {
      if (playbackId !== playbackIdRef.current) return;
      sentenceIndexRef.current = index;
      onSentenceChange?.(index);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await fetch('http://10.42.0.243:5000/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortController.signal,
          body: JSON.stringify({
            text: sentences[index],
            lang: 'en',
            volume,
            rate,
          }),
        });

        if (!response.ok) throw new Error('Synthesis failed');

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.volume = volume;

        await new Promise<void>((resolve, reject) => {
          audio.onplay = () => {
            setIsPlaying(true);
            setIsPaused(false);
            setIsLoading(false);
          };
          audio.onpause = () => {
            if (!audio.ended) {
              setIsPlaying(false);
              setIsPaused(true);
            }
          };
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('Audio playback failed'));
          void audio.play().catch(reject);
        });

        URL.revokeObjectURL(audioUrl);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('TTS error:', err);
        return;
      }
    }

    setIsLoading(false);
    setIsPlaying(false);
    setIsPaused(false);
    onSentenceChange?.(null);
  };

  const pause = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  };

  const resume = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play();
    }
  };

  const stop = () => {
    playbackIdRef.current += 1;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0; // Reset to start (optional)
      const src = audioRef.current.src;
      audioRef.current.src = ''; // Stop loading
      URL.revokeObjectURL(src);
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setIsLoading(false);
    onSentenceChange?.(null);
  };

  useEffect(() => stop, []);

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <button onClick={synthesizeAndPlay} disabled={isLoading} title="Play">
        {isLoading ? '⏳' : '▶️'}
      </button>
      <button onClick={pause} disabled={!isPlaying || isPaused} title="Pause">
        ⏸️
      </button>
      <button onClick={resume} disabled={!isPaused} title="Resume">
        ▶️
      </button>
      <button onClick={stop} disabled={!isPlaying && !isLoading} title="Stop">
        ⏹️
      </button>
    </div>
  );
};

export default TextToSpeech;