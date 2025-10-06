import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
  audioFile: File | null;
  audioUrl?: string;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioFile,
  audioUrl,
  currentTime,
  onTimeUpdate,
  onDurationChange
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [internalAudioUrl, setInternalAudioUrl] = useState<string>('');

  useEffect(() => {
    if (audioFile && !audioUrl) {
      const url = URL.createObjectURL(audioFile);
      setInternalAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (audioUrl) {
      setInternalAudioUrl(audioUrl);
    }
  }, [audioFile, audioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      onTimeUpdate(audio.currentTime);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration);
      onDurationChange(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, onDurationChange]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(duration, audio.currentTime + 10);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    onTimeUpdate(time);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audio.volume = newVolume;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentAudioUrl = audioUrl || internalAudioUrl;

  if (!audioFile) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <div className="text-gray-500 mb-2">
          <Volume2 className="w-12 h-12 mx-auto mb-4" />
          <p className="text-lg">Nessun file audio caricato</p>
          <p className="text-sm">Seleziona un file audio per iniziare la trascrizione</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <audio ref={audioRef} src={currentAudioUrl} />
      
      {/* File info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{audioFile.name}</h3>
        <p className="text-sm text-gray-600">
          {(audioFile.size / 1024 / 1024).toFixed(2)} MB
          {audioFile.name.includes('.mp3') && audioFile.type === 'audio/mp3' && (
            <span className="ml-2 text-green-600">
              ✅ Audio estratto da video con FFmpeg.js
            </span>
          )}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        <button
          onClick={skipBackward}
          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
          title="Indietro 10s"
        >
          <SkipBack className="w-6 h-6" />
        </button>
        
        <button
          onClick={togglePlayPause}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors"
          disabled={!audioFile}
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
        </button>
        
        <button
          onClick={skipForward}
          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
          title="Avanti 10s"
        >
          <SkipForward className="w-6 h-6" />
        </button>
      </div>

      {/* Volume controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={toggleMute}
          className="text-gray-600 hover:text-blue-600 transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-sm text-gray-600 w-10">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};