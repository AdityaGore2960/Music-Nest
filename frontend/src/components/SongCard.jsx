/**
 * SongCard — Reusable card for displaying a song in grids
 * Shows cover, title, artist, play button on hover
 */
import { motion } from 'framer-motion';
import { FaPlay, FaPause, FaHeart } from 'react-icons/fa6';
import usePlayerStore from '../store/playerStore';
import useAuthStore from '../store/authStore';

const DEFAULT_COVER = '/default-cover.png';

export default function SongCard({ song, queue = [], index = 0, onLike }) {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayerStore();
  const { user } = useAuthStore();

  const isCurrentSong = currentSong?._id === song._id;
  const isThisPlaying = isCurrentSong && isPlaying;

  const handlePlay = (e) => {
    e.preventDefault();
    if (isCurrentSong) {
      togglePlay();
    } else {
      playSong(song, queue.length > 0 ? queue : [song], index);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="music-card group relative"
    >
      {/* Cover Image */}
      <div className="relative mb-4 rounded-md overflow-hidden aspect-square bg-spotify-hover">
        <img
          src={song.coverImage || DEFAULT_COVER}
          alt={song.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = DEFAULT_COVER; }}
        />

        {/* Playing indicator overlay */}
        {isThisPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex items-end gap-0.5 h-6">
              <div className="eq-bar w-1.5" style={{ animationDelay: '0s' }} />
              <div className="eq-bar w-1.5" style={{ animationDelay: '0.2s' }} />
              <div className="eq-bar w-1.5" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {/* Play button */}
        <motion.button
          onClick={handlePlay}
          className={`play-button-overlay absolute bottom-2 right-2 w-10 h-10 bg-spotify-green rounded-full
            flex items-center justify-center shadow-glow-green hover:scale-110 transition-transform
            ${isCurrentSong ? 'opacity-100 translate-y-0' : ''}`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isThisPlaying
            ? <FaPause size={14} className="text-black" />
            : <FaPlay size={14} className="text-black ml-0.5" />
          }
        </motion.button>
      </div>

      {/* Song Info */}
      <div>
        <h3 className={`font-semibold text-sm truncate mb-1 ${isCurrentSong ? 'text-spotify-green' : 'text-white'}`}>
          {song.title}
        </h3>
        <p className="text-spotify-light text-xs truncate">
          {song.artist?.username || 'Unknown Artist'}
        </p>
        {song.duration && (
          <p className="text-spotify-light text-xs mt-1">{formatDuration(song.duration)}</p>
        )}
      </div>
    </motion.div>
  );
}
