/**
 * Jamendo Routes
 * Proxy routes to the Jamendo API — exposes search, featured, and artist endpoints.
 * All routes live under /api/jamendo
 */

const express = require('express');
const router = express.Router();
const {
  searchTracks,
  searchArtists,
  getFeaturedTracks,
  getArtistTracks,
} = require('../services/jamendoService');

// ── Track routes ──────────────────────────────────────────────────────────────

/**
 * @desc  Search tracks by name
 * @route GET /api/jamendo/tracks/search?q=<query>&limit=20&offset=0
 * @access Public
 */
router.get('/tracks/search', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Query parameter q is required.' });
    }
    const result = await searchTracks(q.trim(), Number(limit), Number(offset));
    res.json({ success: true, query: q, ...result });
  } catch (err) {
    console.error('Jamendo track search error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @desc  Get featured / trending tracks (for the landing state)
 * @route GET /api/jamendo/tracks/featured?limit=20&order=popularity_total
 * @access Public
 */
router.get('/tracks/featured', async (req, res) => {
  try {
    const { limit = 20, order = 'popularity_total' } = req.query;
    const result = await getFeaturedTracks(Number(limit), order);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Jamendo featured tracks error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @desc  Get tracks for a specific artist
 * @route GET /api/jamendo/tracks/artist/:artistId?limit=10
 * @access Public
 */
router.get('/tracks/artist/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;
    const { limit = 10 } = req.query;
    const tracks = await getArtistTracks(artistId, Number(limit));
    res.json({ success: true, results: tracks });
  } catch (err) {
    console.error('Jamendo artist tracks error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Artist routes ─────────────────────────────────────────────────────────────

/**
 * @desc  Search artists by name
 * @route GET /api/jamendo/artists/search?q=<query>&limit=20
 * @access Public
 */
router.get('/artists/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || !q.trim()) {
      return res.status(400).json({ success: false, message: 'Query parameter q is required.' });
    }
    const result = await searchArtists(q.trim(), Number(limit));
    res.json({ success: true, query: q, ...result });
  } catch (err) {
    console.error('Jamendo artist search error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
