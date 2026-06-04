const express = require('express');
const router = express.Router();
const {
  getPlaylist, createPlaylist, updatePlaylist, deletePlaylist,
  addSongToPlaylist, removeSongFromPlaylist, reorderPlaylist,
} = require('../controllers/playlistController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { uploadImage } = require('../middleware/uploadMiddleware');

router.get('/:id', optionalAuth, getPlaylist);
router.post('/', protect, uploadImage, createPlaylist);
router.patch('/:id', protect, uploadImage, updatePlaylist);
router.delete('/:id', protect, deletePlaylist);
router.post('/:id/songs', protect, addSongToPlaylist);
router.delete('/:id/songs/:songId', protect, removeSongFromPlaylist);
router.patch('/:id/reorder', protect, reorderPlaylist);

module.exports = router;
