/**
 * Library Page — User's music library
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/authStore';
import usePlayerStore from '../store/playerStore';
import { userService } from '../services';
import SongRow from '../components/SongRow';
import { SongRowSkeleton } from '../components/Skeletons';
import toast from 'react-hot-toast';
import { FaHeart, FaClock, FaBookmark, FaUserGroup } from 'react-icons/fa6';

const TABS = [
  { id: 'liked', label: 'Liked Songs', icon: FaHeart },
  { id: 'recent', label: 'Recently Played', icon: FaClock },
  { id: 'following', label: 'Following', icon: FaUserGroup },
];

export default function LibraryPage() {
  const { user } = useAuthStore();
  const { playSong } = usePlayerStore();
  const [activeTab, setActiveTab] = useState('liked');
  const [likedSongs, setLikedSongs] = useState([]);
  const [recentSongs, setRecentSongs] = useState([]);
  const [following, setFollowing] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadTab(activeTab);
  }, [activeTab, user]);

  const loadTab = async (tab) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      if (tab === 'liked') {
        const { data } = await userService.getLikedSongs(user.id);
        setLikedSongs(data.data || []);
      } else if (tab === 'recent') {
        const { data } = await userService.getRecentlyPlayed(user.id);
        setRecentSongs(data.data?.map(h => h.song).filter(Boolean) || []);
      } else if (tab === 'following') {
        setFollowing(user.following || []);
      }
    } catch {
      toast.error('Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-xl font-semibold text-white">Sign in to see your library</p>
        <Link to="/login" className="btn-primary">Log In</Link>
      </div>
    );
  }

  return (
    <div className="pb-24 overflow-y-auto h-full px-6 md:px-8 pt-8">
      <h1 className="text-2xl font-bold text-white mb-6">Your Library</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === id
                ? 'bg-white text-black'
                : 'bg-spotify-card text-spotify-light hover:text-white hover:bg-spotify-hover'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Liked Songs */}
      {activeTab === 'liked' && (
        <div>
          {isLoading ? (
            Array(5).fill(null).map((_, i) => <SongRowSkeleton key={i} />)
          ) : likedSongs.length === 0 ? (
            <div className="text-center py-16 text-spotify-light">
              <FaHeart size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold text-white mb-2">No liked songs yet</p>
              <p className="text-sm">Songs you like will appear here.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => playSong(likedSongs[0], likedSongs, 0)}
                  className="w-14 h-14 bg-spotify-green rounded-full flex items-center justify-center shadow-glow-green"
                >
                  ▶
                </motion.button>
                <span className="text-spotify-light text-sm">{likedSongs.length} songs</span>
              </div>
              {likedSongs.map((song, i) => (
                <SongRow key={song._id} song={song} index={i} queue={likedSongs} showAlbum />
              ))}
            </>
          )}
        </div>
      )}

      {/* Recently Played */}
      {activeTab === 'recent' && (
        <div>
          {isLoading ? (
            Array(5).fill(null).map((_, i) => <SongRowSkeleton key={i} />)
          ) : recentSongs.length === 0 ? (
            <div className="text-center py-16 text-spotify-light">
              <FaClock size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold text-white mb-2">No play history yet</p>
              <p className="text-sm">Songs you listen to will appear here.</p>
            </div>
          ) : (
            recentSongs.map((song, i) => (
              <SongRow key={`${song._id}-${i}`} song={song} index={i} queue={recentSongs} showAlbum />
            ))
          )}
        </div>
      )}

      {/* Following */}
      {activeTab === 'following' && (
        <div>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Array(4).fill(null).map((_, i) => (
                <div key={i} className="skeleton aspect-square rounded-lg" />
              ))}
            </div>
          ) : (user.following || []).length === 0 ? (
            <div className="text-center py-16 text-spotify-light">
              <FaUserGroup size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold text-white mb-2">Not following anyone yet</p>
              <p className="text-sm">Find artists and follow them to see them here.</p>
              <Link to="/search" className="btn-primary inline-block mt-4">
                Discover Artists
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {(user.following || []).map(artist => {
                const a = typeof artist === 'object' ? artist : { _id: artist, username: '...' };
                return (
                  <Link
                    key={a._id}
                    to={`/artist/${a._id}`}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-spotify-card transition-colors w-32 text-center"
                  >
                    {a.profileImage ? (
                      <img src={a.profileImage} alt={a.username} className="w-20 h-20 rounded-full object-cover" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-spotify-green flex items-center justify-center text-black text-2xl font-black">
                        {a.username?.[0]?.toUpperCase()}
                      </div>
                    )}
                    <p className="text-white text-sm font-medium truncate w-full">{a.username}</p>
                    <p className="text-spotify-light text-xs">Artist</p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
