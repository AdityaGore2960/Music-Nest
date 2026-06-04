/**
 * Home Page — Spotify-inspired layout
 * Features real audio content from the Jamendo API:
 *  - Animated hero banner (featured track)
 *  - Horizontally scrollable "Popular Right Now" row
 *  - Horizontally scrollable "Fresh Releases" row
 *  - Genre category cards
 *  - "Discover More" infinite-scroll grid
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { jamendoService } from '../services';
import useAuthStore from '../store/authStore';
import usePlayerStore from '../store/playerStore';
import JamendoCard from '../components/JamendoCard';
import { SongCardSkeleton } from '../components/Skeletons';
import {
  FaPlay, FaPause, FaFire, FaStar, FaMusic, FaChevronLeft,
  FaChevronRight, FaCompactDisc, FaGuitar, FaDrum, FaMicrophone,
} from 'react-icons/fa6';
import toast from 'react-hot-toast';

// ── Genre definitions ─────────────────────────────────────────────────────────
const GENRE_CATEGORIES = [
  { label: 'Pop',        color: 'from-pink-500 to-rose-600',      icon: '🎤', query: 'pop' },
  { label: 'Rock',       color: 'from-orange-500 to-red-600',     icon: '🎸', query: 'rock' },
  { label: 'Electronic', color: 'from-cyan-500 to-blue-600',      icon: '🎛️', query: 'electronic' },
  { label: 'Jazz',       color: 'from-amber-500 to-yellow-600',   icon: '🎷', query: 'jazz' },
  { label: 'Classical',  color: 'from-purple-500 to-violet-700',  icon: '🎻', query: 'classical' },
  { label: 'Hip-Hop',    color: 'from-green-500 to-emerald-700',  icon: '🎧', query: 'hiphop' },
  { label: 'Acoustic',   color: 'from-lime-500 to-green-600',     icon: '🪗', query: 'acoustic' },
  { label: 'Ambient',    color: 'from-indigo-500 to-purple-700',  icon: '🌙', query: 'ambient' },
];

// ── Animation variants ────────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80 } },
};

// ── Horizontal scroll row ─────────────────────────────────────────────────────
function ScrollRow({ tracks, isLoading, skeletonCount = 6 }) {
  const rowRef = useRef(null);

  const scroll = (dir) => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: dir * 220, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/row">
      {/* Left arrow */}
      <button
        onClick={() => scroll(-1)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/80 border border-white/10 text-white flex items-center justify-center
          opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 -translate-x-3 hover:bg-spotify-green hover:text-black hover:border-transparent"
      >
        <FaChevronLeft size={13} />
      </button>

      {/* Track list */}
      <div
        ref={rowRef}
        className="flex gap-4 overflow-x-auto no-scrollbar pb-2"
      >
        {isLoading
          ? Array(skeletonCount).fill(null).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-44">
              <SongCardSkeleton />
            </div>
          ))
          : tracks.map((track, i) => (
            <div key={track.id} className="flex-shrink-0 w-44">
              <JamendoCard track={track} queue={tracks} index={i} />
            </div>
          ))
        }
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll(1)}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/80 border border-white/10 text-white flex items-center justify-center
          opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 translate-x-3 hover:bg-spotify-green hover:text-black hover:border-transparent"
      >
        <FaChevronRight size={13} />
      </button>
    </div>
  );
}

// ── Greeting helper ───────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuthStore();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayerStore();

  const [featured, setFeatured]       = useState([]);   // hero candidates
  const [heroIdx, setHeroIdx]         = useState(0);
  const [popular, setPopular]         = useState([]);    // popularity_total order
  const [newReleases, setNewReleases] = useState([]);    // releasedate order
  const [genreTracks, setGenreTracks] = useState([]);   // genre-filtered
  const [discoverMore, setDiscoverMore] = useState([]); // secondary popular block
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [isGenreLoading, setIsGenreLoading] = useState(false);
  const heroTimerRef = useRef(null);

  // ── Fetch initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [popRes, newRes, moreRes] = await Promise.all([
          jamendoService.getFeaturedTracks(20, 'popularity_total'),
          jamendoService.getFeaturedTracks(20, 'releasedate'),
          jamendoService.getFeaturedTracks(20, 'popularity_week'),
        ]);

        const pop  = popRes.data?.results  || [];
        const newR = newRes.data?.results  || [];
        const more = moreRes.data?.results || [];

        setFeatured(pop.slice(0, 5));   // first 5 as hero candidates
        setPopular(pop);
        setNewReleases(newR);
        setDiscoverMore(more);
      } catch (err) {
        console.error(err);
        toast.error('Could not load Jamendo tracks. Check backend connection.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Auto-rotate hero ────────────────────────────────────────────────────────
  useEffect(() => {
    if (featured.length < 2) return;
    heroTimerRef.current = setInterval(() => {
      setHeroIdx(i => (i + 1) % featured.length);
    }, 6000);
    return () => clearInterval(heroTimerRef.current);
  }, [featured]);

  // ── Genre filter ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedGenre) { setGenreTracks([]); return; }
    setIsGenreLoading(true);
    jamendoService
      .searchTracks(selectedGenre.query, 20, 0)
      .then(res => setGenreTracks(res.data?.results || []))
      .catch(() => toast.error('Genre search failed'))
      .finally(() => setIsGenreLoading(false));
  }, [selectedGenre]);

  // ── Hero helpers ────────────────────────────────────────────────────────────
  const hero = featured[heroIdx];
  const heroCurrentId = currentSong?._id || currentSong?.id;
  const isHeroPlaying = hero && String(heroCurrentId) === String(hero?.id) && isPlaying;

  const handleHeroPlay = () => {
    if (!hero) return;
    if (heroCurrentId && String(heroCurrentId) === String(hero.id)) {
      togglePlay();
    } else {
      playSong(hero, popular, heroIdx);
    }
  };

  const jumpHero = (idx) => {
    clearInterval(heroTimerRef.current);
    setHeroIdx(idx);
    heroTimerRef.current = setInterval(() => {
      setHeroIdx(i => (i + 1) % featured.length);
    }, 6000);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="pb-28 overflow-y-auto h-full">

      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <div className="relative h-80 md:h-[420px] overflow-hidden">
        <AnimatePresence mode="sync">
          {hero && (
            <motion.div
              key={hero.id}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              {/* Background image */}
              <img
                src={hero.image}
                alt={hero.title}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-spotify-black via-black/50 to-black/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-spotify-black/90 via-black/30 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
          {isLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-4 w-24 rounded-full" />
              <div className="skeleton h-10 w-72 rounded-lg" />
              <div className="skeleton h-4 w-40 rounded" />
            </div>
          ) : hero && (
            <motion.div
              key={hero.id + '-content'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-spotify-green bg-spotify-green/15 px-3 py-1 rounded-full mb-3">
                <FaFire size={10} /> Featured on Jamendo
              </span>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-1 leading-tight line-clamp-2 max-w-xl drop-shadow-lg">
                {hero.title}
              </h1>
              <p className="text-white/70 text-base mb-5">
                by <span className="text-white font-semibold">{hero.artist}</span>
                {hero.genre && <span className="ml-2 text-white/50">· {hero.genre}</span>}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleHeroPlay}
                  className="btn-primary inline-flex items-center gap-2.5"
                >
                  {isHeroPlaying
                    ? <><FaPause size={14} /> Pause</>
                    : <><FaPlay  size={14} /> Play Now</>
                  }
                </button>
                {hero.shareUrl && (
                  <a
                    href={hero.shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary inline-flex items-center gap-2 text-sm py-2.5 px-5"
                  >
                    Jamendo ↗
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Hero dot navigation */}
        {featured.length > 1 && (
          <div className="absolute bottom-4 right-8 z-10 flex gap-1.5">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => jumpHero(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === heroIdx
                    ? 'w-6 h-2 bg-spotify-green'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Page body ───────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-8 space-y-10 mt-6">

        {/* Greeting */}
        {user && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-black text-white"
          >
            {getGreeting()}, <span className="text-spotify-green">{user.username}</span> 👋
          </motion.p>
        )}

        {/* ── Quick Picks — 6 recent popular tracks in a 2-row grid ─── */}
        {!isLoading && popular.length > 0 && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {popular.slice(0, 6).map((track, i) => {
                const tId = currentSong?._id || currentSong?.id;
                const active = tId && String(tId) === String(track.id);
                return (
                  <motion.button
                    key={track.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      if (active) togglePlay();
                      else playSong(track, popular, i);
                    }}
                    className={`flex items-center gap-3 rounded-md overflow-hidden text-left transition-all duration-200 group
                      ${active ? 'bg-spotify-green/20 ring-1 ring-spotify-green/40' : 'bg-white/5 hover:bg-white/10'}`}
                  >
                    <img
                      src={track.image}
                      alt={track.title}
                      className="w-14 h-14 object-cover flex-shrink-0"
                      onError={(e) => { e.target.src = 'https://usercontent.jamendo.com/?type=album&id=0&width=200'; }}
                    />
                    <div className="flex-1 min-w-0 pr-2">
                      <p className={`font-bold text-sm truncate ${active ? 'text-spotify-green' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="text-xs text-white/50 truncate">{track.artist}</p>
                    </div>
                    <div className={`mr-3 w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center flex-shrink-0
                      transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {active && isPlaying
                        ? <FaPause size={11} className="text-black" />
                        : <FaPlay  size={11} className="text-black ml-0.5" />
                      }
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Popular Right Now ─────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaFire className="text-orange-400" size={18} />
              <h2 className="text-xl font-bold text-white">Popular Right Now</h2>
            </div>
            <Link to="/discover" className="text-sm text-spotify-light hover:text-white transition-colors font-medium">
              Show all →
            </Link>
          </div>
          <ScrollRow tracks={popular} isLoading={isLoading} />
        </section>

        {/* ── Fresh Releases ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaStar className="text-yellow-400" size={18} />
              <h2 className="text-xl font-bold text-white">Fresh Releases</h2>
            </div>
          </div>
          <ScrollRow tracks={newReleases} isLoading={isLoading} />
        </section>

        {/* ── Genre Categories ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Browse by Genre</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {GENRE_CATEGORIES.map((g) => {
              const active = selectedGenre?.label === g.label;
              return (
                <motion.button
                  key={g.label}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedGenre(active ? null : g)}
                  className={`relative overflow-hidden rounded-xl h-24 text-left p-4 font-bold text-white transition-all duration-200
                    bg-gradient-to-br ${g.color}
                    ${active ? 'ring-2 ring-white shadow-lg' : 'opacity-85 hover:opacity-100'}`}
                >
                  <span className="text-3xl absolute right-3 bottom-2 opacity-70">{g.icon}</span>
                  <span className="text-base font-black relative z-10">{g.label}</span>
                  {active && (
                    <span className="absolute top-2 right-2 text-white bg-black/30 rounded-full px-2 py-0.5 text-xs font-semibold">
                      ✓ Active
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Genre results */}
          <AnimatePresence>
            {selectedGenre && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
              >
                <h3 className="text-white font-bold mb-3">
                  {selectedGenre.icon} {selectedGenre.label} tracks
                </h3>
                <ScrollRow tracks={genreTracks} isLoading={isGenreLoading} skeletonCount={8} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── Discover More ─────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaMusic className="text-blue-400" size={18} />
              <h2 className="text-xl font-bold text-white">Discover More</h2>
            </div>
            <Link to="/discover" className="text-sm text-spotify-light hover:text-white transition-colors font-medium">
              Full library →
            </Link>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {isLoading
              ? Array(10).fill(null).map((_, i) => <SongCardSkeleton key={i} />)
              : discoverMore.map((track, i) => (
                <motion.div key={track.id} variants={itemVariants}>
                  <JamendoCard track={track} queue={discoverMore} index={i} />
                </motion.div>
              ))
            }
          </motion.div>

          {!isLoading && discoverMore.length === 0 && (
            <div className="text-center py-16 text-spotify-light">
              <FaMusic className="text-4xl mx-auto mb-4 opacity-20" />
              <p className="font-medium">No tracks loaded — ensure the backend is running.</p>
              <Link to="/discover" className="text-spotify-green mt-2 inline-block hover:underline">
                Try the Discover page →
              </Link>
            </div>
          )}
        </section>

        {/* ── Jamendo attribution ───────────────────────────────────────── */}
        <div className="py-4 border-t border-white/5 flex items-center gap-2 text-white/30 text-xs">
          <FaCompactDisc className="text-spotify-green/50" />
          Music powered by <a href="https://www.jamendo.com" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 underline transition-colors">Jamendo</a> — free, legal, Creative Commons music
        </div>

      </div>
    </div>
  );
}
