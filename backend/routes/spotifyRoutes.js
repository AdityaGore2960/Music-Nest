const express = require('express');
const router = express.Router();
const { addTracksToPlaylist, searchSongs, getTrack, getLyrics } = require('../controllers/spotifyController');
const { protect } = require('../middleware/authMiddleware');

router.post('/addTracks', protect, addTracksToPlaylist);
router.get('/search', searchSongs);
router.get('/tracks/:id', getTrack);
router.get('/track_lyrics/:id', getLyrics);

module.exports = router;
