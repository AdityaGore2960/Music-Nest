const multer = require('multer');

/**
 * Multer configuration using memory storage
 * Files are stored in memory as Buffer objects (for Cloudinary stream upload)
 */
const storage = multer.memoryStorage();

/**
 * File filter — only allow images and audio
 */
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'];

  if ([...allowedImageTypes, ...allowedAudioTypes].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WEBP, MP3, WAV, OGG, FLAC, AAC`), false);
  }
};

// Single image upload (profile photo, cover)
const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
}).single('image');

// Audio + optional cover image upload
const uploadSong = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for audio
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 },
]);

module.exports = { uploadImage, uploadSong };
