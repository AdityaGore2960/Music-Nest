/**
 * Search Page
 * Real-time debounced search across songs, albums, artists, playlists
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { searchService } from '../services';
import usePlayerStore from '../store/playerStore';
import SongRow from '../components/SongRow';
import { SongCardSkeleton } from '../components/Skeletons';
import { FaMagnifyingGlass, FaFire, FaUser, FaMusic, FaCompactDisc, FaListUl } from 'react-icons/fa6';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'song', label: 'Songs', icon: FaMusic },
  { id: 'album', label: 'Albums', icon: FaCompactDisc },
  { id: 'artist', label: 'Artists', icon: FaUser },
  { id: 'playlist', label: 'Playlists', icon: FaListUl },
];

// Debounce hook
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchPage() {
  const { playSong } = usePlayerStore();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [results, setResults] = useState(null);
  const [trending, setTrending] = useState({ terms: [], genres: [] });
  const [isLoading, setIsLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  // Load trending searches on mount
  useEffect(() => {
    searchService.getTrending()
      .then(({ data }) => setTrending(data.data || { terms: [], genres: [] }))
      .catch(() => {});
  }, []);

  // Perform search when query or tab changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    const params = { q: debouncedQuery };
    if (activeTab !== 'all') params.type = activeTab;

    searchService.search(params)
      .then(({ data }) => setResults(data.data))
      .catch(() => setResults(null))
      .finally(() => setIsLoading(false));
  }, [debouncedQuery, activeTab]);

  const hasSongs = results?.songs?.length > 0;
  const hasAlbums = results?.albums?.length > 0;
  const hasArtists = results?.artists?.length > 0;
  const hasPlaylists = results?.playlists?.length > 0;
  const hasResults = hasSongs || hasAlbums || hasArtists || hasPlaylists;

  return (
    <div className="pb-24 overflow-y-auto h-full px-6 md:px-8">
      {/* Search Header */}
      <div className="sticky top-0 bg-spotify-black/95 backdrop-blur-sm pt-6 pb-4 z-10">
        <div className="relative max-w-xl">
          <FaMagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-spotify-light" size={16} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to listen to?"
            className="w-full bg-spotify-card text-white pl-12 pr-12 py-3.5 rounded-full
              focus:outline-none focus:ring-2 focus:ring-spotify-green border border-transparent
              focus:border-spotify-green transition-all placeholder-spotify-light text-sm font-medium"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-spotify-light hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tabs — only show when searching */}
        {query && (
          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-black'
                    : 'bg-spotify-card text-white hover:bg-spotify-hover'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trending (when no query) */}
      {!query && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-5">
            <FaFire className="text-orange-400" />
            <h2 className="text-xl font-bold text-white">Trending Searches</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-8">
            {trending.terms.map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="bg-spotify-card hover:bg-spotify-hover text-white px-4 py-2 rounded-full text-sm transition-colors"
              >
                {term}
              </button>
            ))}
          </div>

          <h2 className="text-xl font-bold text-white mb-4">Browse Genres</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Classical', 'Indie'].map((genre, i) => {
              const colors = [
                'from-pink-500 to-rose-600',
                'from-orange-500 to-red-600',
                'from-yellow-500 to-orange-600',
                'from-purple-500 to-indigo-600',
                'from-cyan-500 to-blue-600',
                'from-green-500 to-emerald-600',
                'from-blue-500 to-violet-600',
                'from-teal-500 to-cyan-600',
              ];
              return (
                <motion.button
                  key={genre}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setQuery(genre)}
                  className={`bg-gradient-to-br ${colors[i % colors.length]} rounded-lg p-4 text-left h-24 relative overflow-hidden`}
                >
                  <span className="text-white font-bold text-lg">{genre}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
          {Array(8).fill(null).map((_, i) => <SongCardSkeleton key={i} />)}
        </div>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {!isLoading && results && (
          <motion.div
            key={debouncedQuery + activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-8 mt-4"
          >
            {!hasResults && (
              <div className="text-center py-20">
                <p className="text-2xl font-bold text-white mb-2">No results found</p>
                <p className="text-spotify-light">Try different keywords or check for typos.</p>
              </div>
            )}

            {/* Songs */}
            {(activeTab === 'all' || activeTab === 'song') && hasSongs && (
              <section>
                <h3 className="text-lg font-bold text-white mb-4">Songs</h3>
                <div className="space-y-1">
                  {results.songs.map((song, i) => (
                    <SongRow
                      key={song._id}
                      song={song}
                      index={i}
                      queue={results.songs}
                      showAlbum
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Artists */}
            {(activeTab === 'all' || activeTab === 'artist') && hasArtists && (
              <section>
                <h3 className="text-lg font-bold text-white mb-4">Artists</h3>
                <div className="flex gap-4 flex-wrap">
                  {results.artists.map((artist) => (
                    <Link
                      key={artist._id}
                      to={`/artist/${artist._id}`}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-spotify-card transition-colors w-28 text-center"
                    >
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-spotify-hover">
                        {artist.profileImage ? (
                          <img src={artist.profileImage} alt={artist.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-spotify-green">
                            {artist.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <p className="text-white text-sm font-medium truncate w-full">{artist.username}</p>
                      <p className="text-spotify-light text-xs">Artist</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Albums */}
            {(activeTab === 'all' || activeTab === 'album') && hasAlbums && (
              <section>
                <h3 className="text-lg font-bold text-white mb-4">Albums</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {results.albums.map((album) => (
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
                      <p className="text-spotify-light text-xs truncate">{album.artist?.username}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Playlists */}
            {(activeTab === 'all' || activeTab === 'playlist') && hasPlaylists && (
              <section>
                <h3 className="text-lg font-bold text-white mb-4">Playlists</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {results.playlists.map((playlist) => (
                    <Link
                      key={playlist._id}
                      to={`/playlist/${playlist._id}`}
                      className="music-card group block"
                    >
                      <img
                        src={playlist.coverImage || '/default-cover.png'}
                        alt={playlist.title}
                        className="w-full aspect-square object-cover rounded-md mb-3"
                      />
                      <p className="text-white text-sm font-semibold truncate">{playlist.title}</p>
                      <p className="text-spotify-light text-xs truncate">by {playlist.owner?.username}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
