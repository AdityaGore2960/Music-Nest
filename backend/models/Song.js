const mongoose = require('mongoose');

/**
 * Song Model
 * Stores metadata and Cloudinary URLs for audio and cover images
 */
const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Song title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Artist is required'],
    },
    album: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Album',
      default: null,
    },
    genre: {
      type: String,
      enum: [
        'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Jazz', 'Classical',
        'Electronic', 'Country', 'Reggae', 'Blues', 'Folk',
        'Metal', 'Indie', 'Soul', 'Latin', 'K-Pop', 'Other'
      ],
      default: 'Other',
    },
    mood: {
      type: String,
      enum: ['Happy', 'Sad', 'Energetic', 'Calm', 'Romantic', 'Angry', 'Other'],
      default: 'Other',
    },
    duration: {
      type: Number, // Duration in seconds
      required: [true, 'Duration is required'],
      min: 0,
    },
    // Cloudinary URLs
    audioUrl: {
      type: String,
      required: [true, 'Audio URL is required'],
    },
    audioPublicId: {
      type: String, // Cloudinary public_id for deletion
      required: true,
    },
    coverImage: {
      type: String,
      default: '',
    },
    coverImagePublicId: {
      type: String,
      default: '',
    },
    // Engagement stats
    plays: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    lyrics: { type: String, default: '' },

    // Visibility
    isPublic: { type: Boolean, default: true },

    // Release year
    releaseYear: { type: Number, default: () => new Date().getFullYear() },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Text index for full-text search
songSchema.index({ title: 'text', genre: 'text' });
// Index for trending (sorted by plays)
songSchema.index({ plays: -1 });
songSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Song', songSchema);
