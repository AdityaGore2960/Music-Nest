const express = require('express');
const router = express.Router();
const {
  getUserProfile, updateProfile, getPlayHistory,
  followUser, getRecentlyPlayed, getLikedSongs,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { uploadImage } = require('../middleware/uploadMiddleware');

router.get('/:id', getUserProfile);
router.patch('/:id', protect, uploadImage, updateProfile);
router.get('/:id/history', protect, getPlayHistory);
router.get('/:id/recently-played', protect, getRecentlyPlayed);
router.get('/:id/liked-songs', protect, getLikedSongs);
router.post('/:id/follow', protect, followUser);

module.exports = router;
