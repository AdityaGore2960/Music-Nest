/**
 * MusicDiscover Page
 * Songs tab  → Jamendo API   (real audio streams + cover art)
 * Artists tab → MusicBrainz  (rich metadata + discography)
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { jamendoService, musicBrainzService } from '../services';
import {
  FaMagnifyingGlass, FaMusic, FaUser, FaPlay, FaPause,
  FaRecordVinyl, FaGlobe, FaTag, FaArrowLeft, FaCompactDisc,
} from 'react-icons/fa6';

// ── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce(val, ms) {
  const [d, setD] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setD(val), ms);
    return () => clearTimeout(t);
  }, [val, ms]);
  return d;
}

function fmt(secs) {
  if (!secs) return '—';
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

const FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23282828'/%3E%3Ccircle cx='50' cy='50' r='22' fill='%231DB954' opacity='.35'/%3E%3C/svg%3E";

// ── Mini Audio Player ─────────────────────────────────────────────────────────
function AudioRow({ track, index, playing, onPlay }) {
  const isThis = playing?.id === track.id;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
    >
      {/* Cover + play btn */}
      <div className="relative w-10 h-10 flex-shrink-0">
        <img
          src={track.image || FALLBACK}
          alt={track.title}
          className="w-10 h-10 rounded-md object-cover"
          onError={(e) => { e.target.src = FALLBACK; }}
        />
        {track.audio && (
          <button
            onClick={() => onPlay(track)}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isThis ? <FaPause size={12} className="text-[#1DB954]" /> : <FaPlay size={12} className="text-white ml-0.5" />}
          </button>
        )}
        {isThis && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#1DB954] rounded-full border border-[#121212] animate-pulse" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isThis ? 'text-[#1DB954]' : 'text-white'}`}>{track.title}</p>
        <p className="text-[#b3b3b3] text-xs truncate">{track.artist}</p>
      </div>

      {/* Meta */}
      <div className="hidden sm:flex items-center gap-4 text-[#b3b3b3] text-xs flex-shrink-0">
        {track.album && <span className="max-w-[120px] truncate">{track.album}</span>}
        {track.year && <span>{track.year}</span>}
        <span className="w-10 text-right">{fmt(track.duration)}</span>
      </div>
    </motion.div>
  );
}

// ── Artist Card (MusicBrainz) ─────────────────────────────────────────────────
function ArtistCard({ artist, index, onClick }) {
  const initials = artist.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(artist)}
      className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-[#181818] hover:bg-[#282828] transition-colors text-center w-full"
    >
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1DB954] to-[#169040] flex items-center justify-center text-black font-black text-xl shadow-lg">
        {initials || <FaUser size={22} />}
      </div>
      <div>
        <p className="text-white text-sm font-semibold truncate max-w-[120px]">{artist.name}</p>
        <p className="text-[#b3b3b3] text-xs mt-0.5">{artist.type || 'Artist'}</p>
        {artist.country && (
          <p className="text-[#535353] text-[10px] mt-0.5 flex items-center justify-center gap-1">
            <FaGlobe size={8} />{artist.country}
          </p>
        )}
      </div>
      {artist.tags?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1">
          {artist.tags.slice(0, 2).map(t => (
            <span key={t} className="bg-[#1DB954]/10 text-[#1DB954] text-[10px] px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      )}
    </motion.button>
  );
}

// ── Album Card ────────────────────────────────────────────────────────────────
function AlbumCard({ album, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ scale: 1.03 }}
      className="bg-[#181818] hover:bg-[#282828] rounded-xl p-3 transition-colors"
    >
      <div className="aspect-square w-full rounded-lg overflow-hidden mb-3 bg-[#282828]">
        <img
          src={album.coverArt || FALLBACK}
          alt={album.title}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = FALLBACK; }}
        />
      </div>
      <p className="text-white text-sm font-semibold truncate">{album.title}</p>
      <p className="text-[#b3b3b3] text-xs mt-1">{album.year && `${album.year} · `}{album.type}</p>
    </motion.div>
  );
}

// ── Artist Detail (MusicBrainz drill-down) ────────────────────────────────────
function ArtistDetail({ mbid, onBack }) {
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    musicBrainzService.getArtist(mbid)
      .then(({ data }) => setArtist(data.artist))
      .catch(() => setArtist(null))
      .finally(() => setLoading(false));
  }, [mbid]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!artist) return (
    <div className="text-center py-20 text-[#b3b3b3]">
      <p>Failed to load artist.</p>
      <button onClick={onBack} className="mt-3 text-[#1DB954] text-sm hover:underline">← Back</button>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <button onClick={onBack} className="flex items-center gap-2 text-[#b3b3b3] hover:text-white text-sm transition-colors">
        <FaArrowLeft size={11} /> Back to results
      </button>

      <div className="flex items-center gap-6 flex-wrap">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#1DB954] to-[#169040] flex items-center justify-center text-black font-black text-4xl shadow-xl flex-shrink-0">
          {artist.name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || <FaUser size={40} />}
        </div>
        <div>
          <p className="text-[#1DB954] text-xs uppercase tracking-widest font-bold mb-1">Artist · MusicBrainz</p>
          <h2 className="text-4xl font-black text-white">{artist.name}</h2>
          {artist.disambiguation && <p className="text-[#b3b3b3] text-sm mt-1 italic">{artist.disambiguation}</p>}
          <div className="flex gap-3 mt-2 flex-wrap text-xs text-[#b3b3b3]">
            {artist.type && <span>{artist.type}</span>}
            {artist.country && <span className="flex items-center gap-1"><FaGlobe size={10} />{artist.country}</span>}
            {artist.lifeSpan?.begin && (
              <span>{artist.lifeSpan.begin}{artist.lifeSpan.ended ? ` — ${artist.lifeSpan.end || '?'}` : ' · Active'}</span>
            )}
          </div>
          {artist.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {artist.tags.map(t => (
                <span key={t} className="flex items-center gap-1 bg-[#1DB954]/10 text-[#1DB954] text-[11px] px-2.5 py-0.5 rounded-full">
                  <FaTag size={8} />{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {artist.albums?.length > 0 ? (
        <section>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FaRecordVinyl className="text-[#1DB954]" /> Discography
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {artist.albums.map((a, i) => <AlbumCard key={a.id} album={a} index={i} />)}
          </div>
        </section>
      ) : (
        <div className="text-center py-12 text-[#535353]">
          <FaCompactDisc size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No release groups found.</p>
        </div>
      )}
    </motion.div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────
const SongSkel = () => (
  <div className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
    <div className="w-10 h-10 rounded-md bg-white/10 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-white/10 rounded w-2/3" />
      <div className="h-2.5 bg-white/10 rounded w-1/2" />
    </div>
    <div className="h-2.5 bg-white/10 rounded w-12 hidden sm:block" />
  </div>
);

const CardSkel = () => (
  <div className="bg-[#181818] rounded-xl p-3 animate-pulse">
    <div className="aspect-square w-full rounded-lg bg-white/10 mb-3" />
    <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
    <div className="h-2.5 bg-white/10 rounded w-1/2" />
  </div>
);

// ── Global Audio Singleton ────────────────────────────────────────────────────
let _audio = null;
function getAudio() {
  if (!_audio) _audio = new Audio();
  return _audio;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'songs', label: 'Songs', icon: FaMusic },
  { id: 'artists', label: 'Artists', icon: FaUser },
];

const SUGGESTIONS = ['The Beatles', 'Taylor Swift', 'Radiohead', 'Daft Punk', 'Kendrick Lamar'];

export default function MusicDiscoverPage() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('songs');
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [playing, setPlaying] = useState(null); // { id, audio }
  const audioRef = useRef(getAudio());

  const dq = useDebounce(query, 400);
  const searched = dq.trim().length > 0;

  // Load featured tracks on mount
  useEffect(() => {
    jamendoService.getFeaturedTracks(20)
      .then(({ data }) => setFeatured(data.results || []))
      .catch(() => {});
  }, []);

  // Search on query/tab change
  useEffect(() => {
    setSelectedArtist(null);
    if (!dq.trim()) { setSongs([]); setArtists([]); setTotal(0); return; }
    setLoading(true);

    const run = tab === 'songs'
      ? jamendoService.searchTracks(dq, 20).then(({ data }) => {
          setSongs(data.results || []);
          setTotal(data.total || 0);
        })
      : musicBrainzService.searchArtists(dq, 20).then(({ data }) => {
          setArtists(data.artists || []);
          setTotal(data.total || 0);
        });

    run.catch(() => { setSongs([]); setArtists([]); }).finally(() => setLoading(false));
  }, [dq, tab]);

  // Audio playback
  const handlePlay = useCallback((track) => {
    const audio = audioRef.current;
    if (playing?.id === track.id) {
      audio.paused ? audio.play() : audio.pause();
      return;
    }
    audio.pause();
    audio.src = track.audio;
    audio.play().catch(() => {});
    setPlaying(track);
    audio.onended = () => setPlaying(null);
  }, [playing]);

  // Cleanup audio on unmount
  useEffect(() => () => { audioRef.current.pause(); setPlaying(null); }, []);

  const displaySongs = searched ? songs : featured;
  const hasResults = tab === 'songs' ? displaySongs.length > 0 : artists.length > 0;

  return (
    <div className="pb-28 overflow-y-auto h-full px-5 md:px-8" id="music-discover-page">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 bg-[#121212]/95 backdrop-blur-sm pt-6 pb-4 z-20">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-[#1DB954] rounded-lg flex items-center justify-center shadow-lg">
            <FaRecordVinyl className="text-black" size={14} />
          </div>
          <h1 className="text-white text-xl font-black tracking-tight">Discover Music</h1>
          <span className="text-[10px] text-[#1DB954] bg-[#1DB954]/10 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
            {tab === 'songs' ? 'Jamendo' : 'MusicBrainz'}
          </span>
        </div>
        <p className="text-[#b3b3b3] text-xs mb-4 ml-11">
          {tab === 'songs' ? 'Real audio streams · Free & open music' : 'World\'s open music encyclopedia'}
        </p>

        <div className="relative max-w-2xl">
          <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b3b3b3]" size={15} />
          <input
            id="discover-search-input"
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={tab === 'songs' ? 'Search songs, artists…' : 'Search artists, bands…'}
            className="w-full bg-[#2a2a2a] text-white pl-11 pr-10 py-3.5 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1DB954] border border-transparent focus:border-[#1DB954] transition-all placeholder-[#6a6a6a] text-sm font-medium"
            autoFocus
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b3b3b3] hover:text-white text-xs" id="clear-discover-btn">✕</button>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`discover-tab-${id}`}
              onClick={() => { setTab(id); setSelectedArtist(null); }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                tab === id ? 'bg-white text-black' : 'bg-[#282828] text-white hover:bg-[#3a3a3a]'
              }`}
            >
              <Icon size={12} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Now Playing Bar ── */}
      <AnimatePresence>
        {playing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-center gap-3 mb-4 px-3 py-2 bg-[#1DB954]/10 border border-[#1DB954]/20 rounded-xl"
          >
            <div className="w-2 h-2 bg-[#1DB954] rounded-full animate-pulse flex-shrink-0" />
            <img src={playing.image || FALLBACK} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" onError={e => { e.target.src = FALLBACK; }} />
            <div className="flex-1 min-w-0">
              <p className="text-[#1DB954] text-xs font-semibold truncate">{playing.title}</p>
              <p className="text-[#b3b3b3] text-[11px] truncate">{playing.artist}</p>
            </div>
            <button onClick={() => { audioRef.current.pause(); setPlaying(null); }} className="text-[#b3b3b3] hover:text-white text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Artist Detail ── */}
      <AnimatePresence mode="wait">
        {selectedArtist && (
          <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ArtistDetail mbid={selectedArtist.id} onBack={() => setSelectedArtist(null)} />
          </motion.div>
        )}

        {/* ── Welcome / Quick Picks ── */}
        {!selectedArtist && !searched && !loading && (
          <motion.div key="welcome" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            {/* Quick search suggestions */}
            <div className="flex flex-wrap gap-2 mb-8">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setQuery(s); setTab('artists'); }}
                  className="bg-[#282828] hover:bg-[#3a3a3a] text-white text-sm px-4 py-2 rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Featured Tracks */}
            {featured.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <FaMusic className="text-[#1DB954]" size={14} /> Trending on Jamendo
                </h2>
                <div className="bg-[#181818] rounded-xl overflow-hidden">
                  {featured.map((t, i) => <AudioRow key={t.id} track={t} index={i} playing={playing} onPlay={handlePlay} />)}
                </div>
              </section>
            )}
          </motion.div>
        )}

        {/* ── Loading ── */}
        {!selectedArtist && loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {tab === 'songs'
              ? <div className="space-y-1">{Array(8).fill(null).map((_, i) => <SongSkel key={i} />)}</div>
              : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">{Array(10).fill(null).map((_, i) => <CardSkel key={i} />)}</div>
            }
          </motion.div>
        )}

        {/* ── Results ── */}
        {!selectedArtist && !loading && searched && (
          <motion.div key={dq + tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {hasResults && (
              <p className="text-[#b3b3b3] text-xs mb-4">
                Showing {tab === 'songs' ? songs.length : artists.length} of {total.toLocaleString()} results
              </p>
            )}

            {!hasResults && (
              <div className="text-center py-20">
                <FaMagnifyingGlass size={40} className="mx-auto mb-4 text-[#535353] opacity-60" />
                <p className="text-xl font-bold text-white mb-2">No results found</p>
                <p className="text-[#b3b3b3] text-sm">Try different keywords for "<strong>{dq}</strong>"</p>
              </div>
            )}

            {tab === 'songs' && songs.length > 0 && (
              <div className="bg-[#181818] rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2 border-b border-white/5 text-[#b3b3b3] text-xs uppercase tracking-widest">
                  <div className="w-10 flex-shrink-0" />
                  <div className="flex-1">Title</div>
                  <div className="hidden sm:flex gap-4 flex-shrink-0 text-right">
                    <span className="w-[120px]">Album</span>
                    <span className="w-10">Year</span>
                    <span className="w-10">Time</span>
                  </div>
                </div>
                {songs.map((s, i) => <AudioRow key={s.id} track={s} index={i} playing={playing} onPlay={handlePlay} />)}
              </div>
            )}

            {tab === 'artists' && artists.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {artists.map((a, i) => (
                  <ArtistCard key={a.id} artist={a} index={i} onClick={setSelectedArtist} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
