/**
 * Playlist Page
 * Shows songs with DnD reorder, add/remove, and share
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { playlistService } from '../services';
import useAuthStore from '../store/authStore';
import usePlayerStore from '../store/playerStore';
import useSocketStore from '../store/socketStore';
import SongRow from '../components/SongRow';
import { SongRowSkeleton } from '../components/Skeletons';
import toast from 'react-hot-toast';
import {
  FaPlay, FaPause, FaGripVertical, FaShare,
  FaTrash, FaLock, FaGlobe, FaHeart,
} from 'react-icons/fa6';

function SortableSongRow({ song, index, queue, onRemove, canEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: song._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 group">
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          className="text-spotify-light opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing p-2"
        >
          <FaGripVertical size={14} />
        </button>
      )}
      <div className="flex-1">
        <SongRow song={song} index={index} queue={queue} showAlbum />
      </div>
      {canEdit && (
        <button
          onClick={() => onRemove(song._id)}
          className="text-spotify-light opacity-0 group-hover:opacity-100 hover:text-red-400 transition-colors p-2"
        >
          <FaTrash size={12} />
        </button>
      )}
    </div>
  );
}

export default function PlaylistPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayerStore();
  const { joinPlaylistRoom, leavePlaylistRoom, emitPlaylistUpdate, socket } = useSocketStore();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const canEdit = user && playlist &&
    (playlist.owner?._id === user.id || user.role === 'admin');

  useEffect(() => {
    loadPlaylist();
  }, [id]);

  // Join collaboration room
  useEffect(() => {
    if (id) {
      joinPlaylistRoom(id);
      return () => leavePlaylistRoom(id);
    }
  }, [id]);

  // Listen for remote updates
  useEffect(() => {
    if (!socket) return;
    socket.on('playlist:updated', (data) => {
      toast(`${data.by} updated the playlist`, { icon: '🎵' });
      loadPlaylist(); // Reload
    });
    return () => socket.off('playlist:updated');
  }, [socket]);

  const loadPlaylist = async () => {
    setIsLoading(true);
    try {
      const { data } = await playlistService.getById(id);
      setPlaylist(data.data);
      setSongs(data.data.songs || []);
    } catch {
      toast.error('Failed to load playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = songs.findIndex(s => s._id === active.id);
    const newIndex = songs.findIndex(s => s._id === over.id);
    const reordered = arrayMove(songs, oldIndex, newIndex);
    setSongs(reordered);

    setSaving(true);
    try {
      await playlistService.reorder(id, reordered.map(s => s._id));
      emitPlaylistUpdate({ playlistId: id, action: 'reorder' });
    } catch {
      toast.error('Failed to save order');
      setSongs(songs); // Revert
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSong = async (songId) => {
    const prev = songs;
    setSongs(songs.filter(s => s._id !== songId));
    try {
      await playlistService.removeSong(id, songId);
      emitPlaylistUpdate({ playlistId: id, action: 'remove', songId });
      toast.success('Song removed');
    } catch {
      setSongs(prev);
      toast.error('Failed to remove song');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Playlist link copied!', { icon: '🔗' });
  };

  const isCurrentPlaylist = currentSong && songs.some(s => s._id === currentSong._id);

  if (isLoading) {
    return (
      <div className="pb-24 overflow-y-auto h-full px-8 pt-8">
        <div className="flex gap-6 mb-8">
          <div className="skeleton w-52 h-52 rounded-lg" />
          <div className="flex flex-col justify-end gap-3 flex-1">
            <div className="skeleton h-4 w-24 rounded" />
            <div className="skeleton h-14 w-64 rounded" />
            <div className="skeleton h-4 w-48 rounded" />
          </div>
        </div>
        {Array(6).fill(null).map((_, i) => <SongRowSkeleton key={i} />)}
      </div>
    );
  }

  if (!playlist) return (
    <div className="flex items-center justify-center h-full text-spotify-light">
      Playlist not found or is private.
    </div>
  );

  return (
    <div className="pb-24 overflow-y-auto h-full">
      {/* Header */}
      <div
        className="p-8 pb-6"
        style={{
          background: 'linear-gradient(to bottom, rgba(29,185,84,0.2) 0%, #121212 100%)',
        }}
      >
        <div className="flex flex-col sm:flex-row items-end gap-6">
          <div className="w-52 h-52 rounded-lg shadow-2xl flex-shrink-0 overflow-hidden bg-spotify-card">
            {playlist.coverImage ? (
              <img src={playlist.coverImage} alt={playlist.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                <FaHeart size={48} className="text-white opacity-80" />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-2 text-xs text-spotify-light font-semibold uppercase tracking-widest mb-2">
              {playlist.isPublic ? <FaGlobe size={10} /> : <FaLock size={10} />}
              Playlist
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
              {playlist.title}
            </h1>
            {playlist.description && (
              <p className="text-spotify-light text-sm mb-3">{playlist.description}</p>
            )}
            <p className="text-sm text-spotify-light">
              <Link to={`/profile/${playlist.owner?._id}`} className="text-white font-semibold hover:underline">
                {playlist.owner?.username}
              </Link>
              {' · '}
              {songs.length} songs
              {(playlist.followersCount > 0) && ` · ${playlist.followersCount.toLocaleString()} likes`}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-8 py-4 flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (isCurrentPlaylist && isPlaying) {
              togglePlay();
            } else if (songs.length > 0) {
              playSong(songs[0], songs, 0);
            }
          }}
          className="w-14 h-14 bg-spotify-green rounded-full flex items-center justify-center shadow-glow-green hover:bg-spotify-accent transition-colors"
        >
          {isCurrentPlaylist && isPlaying
            ? <FaPause size={20} className="text-black" />
            : <FaPlay size={20} className="text-black ml-1" />
          }
        </motion.button>

        <button
          onClick={handleShare}
          className="text-spotify-light hover:text-white transition-colors p-2"
          title="Share"
        >
          <FaShare size={18} />
        </button>

        {saving && (
          <div className="w-4 h-4 border-2 border-spotify-green border-t-transparent rounded-full animate-spin ml-2" />
        )}
      </div>

      {/* Songs Table Header */}
      {songs.length > 0 && (
        <div className="px-8 border-b border-white/10 pb-2 mb-2">
          <div className={`grid text-xs text-spotify-light font-semibold uppercase tracking-wider px-4 ${canEdit ? 'ml-6' : ''}`}
            style={{ gridTemplateColumns: canEdit ? '40px 1fr 1fr auto auto auto' : '40px 1fr 1fr auto auto' }}
          >
            <span>#</span>
            <span>Title</span>
            <span className="hidden md:block">Album</span>
            <span />
            <span>⏱</span>
          </div>
        </div>
      )}

      {/* Song List with DnD */}
      <div className="px-8">
        {songs.length === 0 ? (
          <div className="text-center py-20 text-spotify-light">
            <FaHeart size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold text-white mb-2">This playlist is empty</p>
            <p className="text-sm">Search for songs to add them here.</p>
          </div>
        ) : canEdit ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={songs.map(s => s._id)} strategy={verticalListSortingStrategy}>
              {songs.map((song, i) => (
                <SortableSongRow
                  key={song._id}
                  song={song}
                  index={i}
                  queue={songs}
                  onRemove={handleRemoveSong}
                  canEdit={canEdit}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          songs.map((song, i) => (
            <SongRow key={song._id} song={song} index={i} queue={songs} showAlbum />
          ))
        )}
      </div>
    </div>
  );
}
