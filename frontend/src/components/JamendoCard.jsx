/**
 * JamendoCard — Card for displaying a Jamendo API track
 * Handles Jamendo data shape: { id, title, artist, image, audio, duration }
 */
import { motion } from 'framer-motion';
import { FaPlay, FaPause, FaExternalLinkAlt } from 'react-icons/fa';
import usePlayerStore from '../store/playerStore';

const DEFAULT_COVER = 'https://usercontent.jamendo.com/?type=album&id=0&width=200';

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function JamendoCard({ track, queue = [], index = 0 }) {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayerStore();

  // Compare by Jamendo id (numeric string)
  const currentId = currentSong?._id || currentSong?.id;
  const isCurrentSong = currentId && String(currentId) === String(track.id);
  const isThisPlaying = isCurrentSong && isPlaying;

  const handlePlay = (e) => {
    e.preventDefault();
    if (isCurrentSong) {
      togglePlay();
    } else {
      playSong(track, queue.length > 0 ? queue : [track], index);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="music-card group relative flex-shrink-0"
    >
      {/* Cover Image */}
      <div className="relative mb-3 rounded-md overflow-hidden aspect-square bg-spotify-hover">
        <img
          src={track.image || DEFAULT_COVER}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { e.target.src = DEFAULT_COVER; }}
          loading="lazy"
        />

        {/* Playing indicator */}
        {isThisPlaying && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-6">
              <div className="eq-bar w-1.5" style={{ animationDelay: '0s' }} />
              <div className="eq-bar w-1.5" style={{ animationDelay: '0.2s' }} />
              <div className="eq-bar w-1.5" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play button */}
        <motion.button
          onClick={handlePlay}
          className={`play-button-overlay absolute bottom-2 right-2 w-10 h-10 bg-spotify-green rounded-full
            flex items-center justify-center shadow-glow-green hover:scale-110 transition-transform
            ${isCurrentSong ? 'opacity-100 translate-y-0' : ''}`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={isThisPlaying ? 'Pause' : 'Play'}
        >
          {isThisPlaying
            ? <FaPause size={13} className="text-black" />
            : <FaPlay size={13} className="text-black ml-0.5" />
          }
        </motion.button>

        {/* CC License badge */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white/70 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
          CC
        </div>
      </div>

      {/* Track Info */}
      <div className="space-y-0.5">
        <h3 className={`font-semibold text-sm truncate ${isCurrentSong ? 'text-spotify-green' : 'text-white'}`}>
          {track.title}
        </h3>
        <p className="text-spotify-light text-xs truncate">{track.artist}</p>
        <div className="flex items-center justify-between mt-1">
          {track.duration && (
            <span className="text-spotify-light text-xs">{formatDuration(track.duration)}</span>
          )}
          {track.genre && (
            <span className="text-xs text-spotify-light bg-white/10 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
              {track.genre}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
