/**
 * SongRow — Displays a song in a table/list format (for playlists, albums)
 * Shows index, cover, title/artist, album, duration, and like button
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPlay, FaPause, FaHeart, FaRegHeart } from 'react-icons/fa6';
import usePlayerStore from '../store/playerStore';
import useAuthStore from '../store/authStore';
import { songService } from '../services';
import toast from 'react-hot-toast';

const formatDuration = (sec) => {
  if (!sec) return '--:--';
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
};

export default function SongRow({ song, index, queue = [], showAlbum = false }) {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayerStore();
  const { user, updateUser } = useAuthStore();
  const [liked, setLiked] = useState(() => user?.likedSongs?.includes(song._id));
  const [likeLoading, setLikeLoading] = useState(false);

  const isActive = currentSong?._id === song._id;

  const handlePlay = () => {
    if (isActive) {
      togglePlay();
    } else {
      playSong(song, queue, index);
    }
  };

  const handleLike = async (e) => {
    e.stopPropagation();
    if (!user) return toast.error('Please log in to like songs');
    if (likeLoading) return;

    setLikeLoading(true);
    try {
      const { data } = await songService.like(song._id);
      setLiked(data.isLiked);
      // Update liked songs in auth store
      if (data.isLiked) {
        updateUser({ likedSongs: [...(user.likedSongs || []), song._id] });
      } else {
        updateUser({ likedSongs: (user.likedSongs || []).filter((id) => id !== song._id) });
      }
    } catch {
      toast.error('Failed to update');
    } finally {
      setLikeLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={handlePlay}
      className={`song-row ${
        showAlbum
          ? 'grid-cols-[40px_1fr_1fr_auto_auto]'
          : 'grid-cols-[40px_1fr_auto_auto]'
      } ${isActive ? 'bg-white/10' : ''}`}
    >
      {/* Index / Play Indicator */}
      <div className="flex items-center justify-center">
        {isActive && isPlaying ? (
          <div className="flex items-end gap-0.5 h-4">
            <div className="eq-bar w-1 bg-spotify-green" />
            <div className="eq-bar w-1 bg-spotify-green" style={{ animationDelay: '0.2s' }} />
            <div className="eq-bar w-1 bg-spotify-green" style={{ animationDelay: '0.4s' }} />
          </div>
        ) : (
          <>
            <span className={`text-sm group-hover:hidden ${isActive ? 'text-spotify-green' : 'text-spotify-light'}`}>
              {index + 1}
            </span>
            <button className="hidden group-hover:flex text-white">
              {isActive ? <FaPause size={12} /> : <FaPlay size={12} />}
            </button>
          </>
        )}
      </div>

      {/* Title + Artist */}
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={song.coverImage || '/default-cover.png'}
          alt={song.title}
          className="w-10 h-10 rounded object-cover flex-shrink-0"
        />
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-spotify-green' : 'text-white'}`}>
            {song.title}
          </p>
          <Link
            to={`/artist/${song.artist?._id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-spotify-light hover:text-white hover:underline truncate block"
          >
            {song.artist?.username}
          </Link>
        </div>
      </div>

      {/* Album (optional) */}
      {showAlbum && song.album && (
        <Link
          to={`/album/${song.album?._id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm text-spotify-light hover:text-white hover:underline truncate hidden md:block"
        >
          {song.album?.title}
        </Link>
      )}

      {/* Like */}
      <button
        onClick={handleLike}
        className={`transition-colors ${liked ? 'text-spotify-green' : 'text-transparent group-hover:text-spotify-light hover:!text-spotify-green'}`}
      >
        {liked ? <FaHeart size={14} /> : <FaRegHeart size={14} />}
      </button>

      {/* Duration */}
      <span className="text-sm text-spotify-light text-right">
        {formatDuration(song.duration)}
      </span>
    </motion.div>
  );
}
