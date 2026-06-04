const express = require('express');
const router = express.Router();
const { getAlbums, getAlbumById, createAlbum, deleteAlbum } = require('../controllers/albumController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { uploadImage } = require('../middleware/uploadMiddleware');

router.get('/', getAlbums);
router.get('/:id', optionalAuth, getAlbumById);
router.post('/', protect, roleMiddleware('artist', 'admin'), uploadImage, createAlbum);
router.delete('/:id', protect, deleteAlbum);

module.exports = router;
