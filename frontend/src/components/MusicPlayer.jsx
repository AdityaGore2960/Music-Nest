/**
 * MusicPlayer — Persistent bottom player bar
 * Uses Howler.js via playerStore for audio playback
 * Features: play/pause, next/prev, shuffle, repeat, volume, seek
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import usePlayerStore from '../store/playerStore';
import useSocketStore from '../store/socketStore';
import {
  FaPlay, FaPause, FaForward, FaBackward,
  FaShuffle, FaRepeat, FaVolumeHigh, FaVolumeLow,
  FaVolumeXmark, FaList, FaHeart, FaMicrophone
} from 'react-icons/fa6';
import LyricsPanel from './LyricsPanel';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function MusicPlayer() {
  const {
    currentSong, isPlaying, duration, currentTime,
    volume, isMuted, isShuffle, repeatMode,
    togglePlay, playNext, playPrev, seek,
    setVolume, toggleMute, toggleShuffle, cycleRepeat,
    queue, isLoading,
  } = usePlayerStore();

  const { emitSongPlay, emitSongStop } = useSocketStore();
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [prevSongId, setPrevSongId] = useState(null);
  const seekRef = useRef(null);

  // Sync socket events with player state
  useEffect(() => {
    if (isPlaying && currentSong && currentSong._id !== prevSongId) {
      emitSongPlay(currentSong._id, currentSong.title);
      setPrevSongId(currentSong._id);
    }
  }, [isPlaying, currentSong]);

  useEffect(() => {
    if (!isPlaying && prevSongId) {
      emitSongStop(prevSongId);
    }
  }, [isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(Math.min(duration, currentTime + 10));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(Math.max(0, currentTime - 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, seek, setVolume, duration, currentTime, volume]);

  // Update seek bar CSS variable for the gradient fill
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    seek(pct * duration);
  };

  if (!currentSong) return null;

  const VolumeIcon = isMuted || volume === 0
    ? FaVolumeXmark
    : volume < 0.4
      ? FaVolumeLow
      : FaVolumeHigh;

  const repeatColors = {
    off: 'text-spotify-light',
    all: 'text-spotify-green',
    one: 'text-spotify-green',
  };

  return (
    <>
      {/* Queue Sidebar */}
      <AnimatePresence>
        {showQueue && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-20 w-80 bg-spotify-dark border-l border-white/10 z-40 overflow-y-auto"
          >
            <div className="p-4">
              <h3 className="text-white font-bold text-lg mb-4">Queue</h3>
              {queue.length === 0 ? (
                <p className="text-spotify-light text-sm">Queue is empty</p>
              ) : (
                queue.map((song, i) => (
                  <div
                    key={`${song._id}-${i}`}
                    className={`flex items-center gap-3 p-2 rounded-md mb-1 cursor-pointer
                      ${currentSong._id === song._id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <img
                      src={song.coverImage || '/default-cover.png'}
                      alt={song.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${currentSong._id === song._id ? 'text-spotify-green' : 'text-white'}`}>
                        {song.title}
                      </p>
                      <p className="text-xs text-spotify-light truncate">{song.artist?.username}</p>
                    </div>
                    {currentSong._id === song._id && isPlaying && (
                      <div className="flex items-end gap-0.5 h-4">
                        {[...Array(3)].map((_, j) => (
                          <div key={j} className="eq-bar w-1" style={{ animationDelay: `${j * 0.15}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lyrics Sidebar */}
      <LyricsPanel 
        song={currentSong} 
        isOpen={showLyrics} 
        onClose={() => setShowLyrics(false)} 
      />

      {/* Player Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-spotify-dark border-t border-white/10 z-50 px-4">
        <div className="max-w-screen-2xl mx-auto h-full flex items-center gap-4">

          {/* Left: Song Info */}
          <div className="flex items-center gap-3 w-1/4 min-w-0">
            <div className="relative group flex-shrink-0">
              <img
                src={currentSong.coverImage || '/default-cover.png'}
                alt={currentSong.title}
                className={`w-14 h-14 rounded-md object-cover ${isPlaying ? 'animate-pulse-slow' : ''}`}
              />
              {isLoading && (
                <div className="absolute inset-0 bg-black/60 rounded-md flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <Link
                to={`/songs/${currentSong._id}`}
                className="text-sm font-semibold text-white hover:underline truncate block"
              >
                {currentSong.title}
              </Link>
              <Link
                to={`/artist/${currentSong.artist?._id}`}
                className="text-xs text-spotify-light hover:text-white hover:underline truncate block"
              >
                {currentSong.artist?.username}
              </Link>
            </div>
            <button className="text-spotify-light hover:text-spotify-green transition-colors ml-2 flex-shrink-0">
              <FaHeart size={14} />
            </button>
          </div>

          {/* Center: Controls + Seek */}
          <div className="flex-1 flex flex-col items-center gap-2">
            {/* Control Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleShuffle}
                className={`transition-colors hover:scale-110 active:scale-95 ${isShuffle ? 'text-spotify-green' : 'text-spotify-light hover:text-white'
                  }`}
                title="Shuffle"
              >
                <FaShuffle size={16} />
              </button>

              <button
                onClick={playPrev}
                className="text-spotify-light hover:text-white hover:scale-110 active:scale-95 transition-all"
                title="Previous (← key)"
              >
                <FaBackward size={18} />
              </button>

              <button
                onClick={togglePlay}
                className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-lg"
                title="Play/Pause (Space)"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <FaPause size={14} className="text-black" />
                ) : (
                  <FaPlay size={14} className="text-black ml-0.5" />
                )}
              </button>

              <button
                onClick={playNext}
                className="text-spotify-light hover:text-white hover:scale-110 active:scale-95 transition-all"
                title="Next (→ key)"
              >
                <FaForward size={18} />
              </button>

              <button
                onClick={cycleRepeat}
                className={`relative transition-colors hover:scale-110 active:scale-95 ${repeatColors[repeatMode]}`}
                title={`Repeat: ${repeatMode}`}
              >
                <FaRepeat size={16} />
                {repeatMode === 'one' && (
                  <span className="absolute -top-1 -right-1 text-[8px] text-spotify-green font-bold">1</span>
                )}
              </button>
            </div>

            {/* Seek Bar */}
            <div className="flex items-center gap-2 w-full max-w-lg">
              <span className="text-xs text-spotify-light w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <div className="relative flex-1 h-4 flex items-center group cursor-pointer" onClick={handleSeek}>
                <div className="w-full h-1 group-hover:h-1.5 bg-spotify-hover rounded-full transition-all duration-100">
                  <div
                    className="h-full bg-spotify-green group-hover:bg-spotify-accent rounded-full transition-colors relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                  </div>
                </div>
              </div>
              <span className="text-xs text-spotify-light w-10">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right: Volume + Queue */}
          <div className="flex items-center gap-3 w-1/4 justify-end">
            <button
              onClick={() => { setShowLyrics(!showLyrics); setShowQueue(false); }}
              className={`transition-colors hover:scale-110 ${showLyrics ? 'text-spotify-green' : 'text-spotify-light hover:text-white'}`}
              title="Lyrics"
            >
              <FaMicrophone size={15} />
            </button>

            <button
              onClick={() => { setShowQueue(!showQueue); setShowLyrics(false); }}
              className={`transition-colors hover:scale-110 ${showQueue ? 'text-spotify-green' : 'text-spotify-light hover:text-white'}`}
              title="Queue"
            >
              <FaList size={16} />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-spotify-light hover:text-white transition-colors"
                title="Mute/Unmute (↑↓ keys)"
              >
                <VolumeIcon size={16} />
              </button>
              <div className="relative w-24 h-4 flex items-center group cursor-pointer">
                <div
                  className="w-full h-1 group-hover:h-1.5 bg-spotify-hover rounded-full transition-all cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    setVolume(x / rect.width);
                  }}
                >
                  <div
                    className="h-full bg-spotify-light group-hover:bg-white rounded-full transition-colors relative"
                    style={{ width: `${isMuted ? 0 : volume * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
