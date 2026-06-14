import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMicrophone, FaXmark, FaSpinner } from 'react-icons/fa6';
import { spotifyService } from '../services';

export default function LyricsPanel({ song, isOpen, onClose }) {
  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !song) return;

    const fetchLyrics = async () => {
      setLoading(true);
      setError(null);
      setLyrics(null);

      try {
        const title = song.title || song.name;
        const artist = typeof song.artist === 'string' ? song.artist : song.artist?.username || '';
        const query = `${title} ${artist}`.trim();

        // 1. Search for the song on Spotify to get its Spotify ID
        const searchRes = await spotifyService.searchSongs(query);
        const tracks = searchRes.data?.data?.tracks?.items;

        if (!tracks || tracks.length === 0) {
          setError('Lyrics not found (Song not on Spotify)');
          setLoading(false);
          return;
        }

        const spotifyId = tracks[0].data.id;

        // 2. Fetch lyrics using the Spotify ID
        const lyricsRes = await spotifyService.getLyrics(spotifyId);
        
        // The spotify23 API track_lyrics response usually has a specific structure
        // Let's extract the lyrics lines
        const lyricsData = lyricsRes.data?.data?.lyrics;
        
        if (!lyricsData || !lyricsData.lines) {
          setError('Lyrics not available for this track');
        } else {
          setLyrics(lyricsData.lines);
        }
      } catch (err) {
        console.error('Failed to fetch lyrics:', err);
        // Fallback or handle API rate limits (429)
        if (err.response?.status === 429) {
          setError('API Rate limit exceeded. Try again later.');
        } else {
          setError('Could not load lyrics right now.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [isOpen, song]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-20 left-0 right-0 md:left-auto md:right-0 md:w-96 md:top-0 md:bottom-20 bg-spotify-black/95 backdrop-blur-md border-l border-white/10 z-30 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <FaMicrophone className="text-spotify-green" size={18} />
              <h2 className="text-white font-bold text-lg">Lyrics</h2>
            </div>
            <button
              onClick={onClose}
              className="text-spotify-light hover:text-white transition-colors p-1"
            >
              <FaXmark size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-spotify-light space-y-4">
                <FaSpinner className="animate-spin text-spotify-green" size={24} />
                <p className="text-sm font-medium">Finding lyrics...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-spotify-light font-medium">{error}</p>
              </div>
            ) : lyrics && lyrics.length > 0 ? (
              <div className="space-y-4 pb-12">
                {lyrics.map((line, i) => (
                  <p key={i} className="text-xl font-bold text-white hover:text-spotify-green transition-colors cursor-default">
                    {line.words || '♪'}
                  </p>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-spotify-light font-medium">No lyrics to display</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
