const express = require('express');
const router = express.Router();
const {
  getSongs, getTrendingSongs, getSongById,
  uploadSong, deleteSong, likeSong, getNewReleases,
} = require('../controllers/songController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { uploadSong: uploadFiles } = require('../middleware/uploadMiddleware');

// Public routes
router.get('/trending', getTrendingSongs);
router.get('/new-releases', getNewReleases);
router.get('/', getSongs);
router.get('/:id', optionalAuth, getSongById);

// Protected routes
router.post('/', protect, roleMiddleware('artist', 'admin'), uploadFiles, uploadSong);
router.delete('/:id', protect, deleteSong);
router.patch('/:id/like', protect, likeSong);

module.exports = router;
