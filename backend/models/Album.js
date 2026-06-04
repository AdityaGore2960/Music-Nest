const mongoose = require('mongoose');

/**
 * Album Model
 * Groups songs by a single artist with metadata
 */
const albumSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Album title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Artist is required'],
    },
    coverImage: {
      type: String,
      default: '',
    },
    coverImagePublicId: {
      type: String,
      default: '',
    },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    genre: {
      type: String,
      enum: [
        'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Jazz', 'Classical',
        'Electronic', 'Country', 'Reggae', 'Blues', 'Folk',
        'Metal', 'Indie', 'Soul', 'Latin', 'K-Pop', 'Other'
      ],
      default: 'Other',
    },
    releaseDate: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    isPublic: { type: Boolean, default: true },
    plays: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: total songs count
albumSchema.virtual('songCount').get(function () {
  return this.songs ? this.songs.length : 0;
});

albumSchema.index({ title: 'text' });
albumSchema.index({ artist: 1, createdAt: -1 });

module.exports = mongoose.model('Album', albumSchema);
