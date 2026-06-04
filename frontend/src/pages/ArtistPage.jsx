/**
 * Artist Profile Page
 * Shows bio, stats, discography, and follow button
 */
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { userService, albumService } from '../services';
import useAuthStore from '../store/authStore';
import usePlayerStore from '../store/playerStore';
import SongRow from '../components/SongRow';
import { ProfileSkeleton } from '../components/Skeletons';
import toast from 'react-hot-toast';
import {
  FaPlay, FaUserPlus, FaUserCheck, FaCompactDisc, FaMusic,
} from 'react-icons/fa6';

export default function ArtistPage() {
  const { id } = useParams();
  const { user, updateUser } = useAuthStore();
  const { playSong } = usePlayerStore();
  const [artist, setArtist] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [artistRes, albumsRes] = await Promise.all([
          userService.getProfile(id),
          albumService.getAll({ artist: id, limit: 6 }),
        ]);
        setArtist(artistRes.data.data);
        setAlbums(albumsRes.data.data || []);
        setIsFollowing(user?.following?.some(f => (f._id || f) === id));
      } catch {
        toast.error('Failed to load artist profile');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, user]);

  const handleFollow = async () => {
    if (!user) return toast.error('Please log in to follow artists');
    setFollowLoading(true);
    try {
      const { data } = await userService.follow(id);
      setIsFollowing(data.isFollowing);
      setArtist(prev => ({
        ...prev,
        followersCount: data.followersCount,
      }));
      toast.success(data.isFollowing ? `Following ${artist.username}` : 'Unfollowed');
    } catch {
      toast.error('Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  if (isLoading) return <ProfileSkeleton />;
  if (!artist) return (
    <div className="flex items-center justify-center h-full text-spotify-light">
      Artist not found
    </div>
  );

  // Collect all songs from albums for "play all"
  const allSongs = albums.flatMap(a => a.songs || []);

  return (
    <div className="pb-24 overflow-y-auto h-full">
      {/* Hero */}
      <div className="relative h-72 overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-b from-transparent to-spotify-black"
          style={{
            background: `linear-gradient(to bottom, transparent 0%, #121212 100%), 
              ${artist.profileImage ? `url(${artist.profileImage})` : 'linear-gradient(135deg, #1DB954, #191414)'}`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top',
          }}
        />
        <div className="absolute bottom-0 left-0 p-8 flex items-end gap-6">
          {artist.profileImage ? (
            <img
              src={artist.profileImage}
              alt={artist.username}
              className="w-40 h-40 rounded-full object-cover shadow-2xl border-4 border-white/10"
            />
          ) : (
            <div className="w-40 h-40 rounded-full bg-spotify-green flex items-center justify-center shadow-2xl text-5xl font-black text-black">
              {artist.username?.[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <span className="text-xs text-spotify-light uppercase tracking-widest font-bold">
              {artist.role === 'artist' ? '✓ Verified Artist' : 'User'}
            </span>
            <h1 className="text-5xl md:text-7xl font-black text-white mt-1">{artist.username}</h1>
            <p className="text-spotify-light mt-2 text-sm">
              {(artist.followersCount || 0).toLocaleString()} followers
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-8 py-6 flex items-center gap-4">
        {allSongs.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => playSong(allSongs[0], allSongs, 0)}
            className="w-14 h-14 bg-spotify-green rounded-full flex items-center justify-center shadow-glow-green hover:bg-spotify-accent transition-colors"
          >
            <FaPlay size={20} className="text-black ml-1" />
          </motion.button>
        )}

        {user && user.id !== id && (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex items-center gap-2 px-5 py-2 rounded-full border font-semibold text-sm transition-all ${
              isFollowing
                ? 'border-spotify-green text-spotify-green hover:border-white hover:text-white'
                : 'border-white/40 text-white hover:border-white'
            }`}
          >
            {isFollowing ? <FaUserCheck size={14} /> : <FaUserPlus size={14} />}
            {isFollowing ? 'Following' : 'Follow'}
          </motion.button>
        )}
      </div>

      <div className="px-8 space-y-10">
        {/* Bio */}
        {artist.bio && (
          <section>
            <h2 className="text-xl font-bold text-white mb-3">About</h2>
            <p className="text-spotify-light leading-relaxed max-w-2xl">{artist.bio}</p>
          </section>
        )}

        {/* Albums */}
        {albums.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FaCompactDisc className="text-spotify-green" />
                <h2 className="text-xl font-bold text-white">Albums</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {albums.map((album) => (
                <Link
                  key={album._id}
                  to={`/album/${album._id}`}
                  className="music-card group block"
                >
                  <img
                    src={album.coverImage || '/default-cover.png'}
                    alt={album.title}
                    className="w-full aspect-square object-cover rounded-md mb-3"
                  />
                  <p className="text-white text-sm font-semibold truncate">{album.title}</p>
                  <p className="text-spotify-light text-xs">
                    {new Date(album.releaseDate).getFullYear()} · Album
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {albums.length === 0 && (
          <div className="text-center py-12 text-spotify-light">
            <FaMusic size={40} className="mx-auto mb-4 opacity-30" />
            <p>No music yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
