const mongoose = require('mongoose');

/**
 * Playlist Model
 * User-curated collections of songs with collaboration support
 */
const playlistSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Playlist title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    coverImage: {
      type: String,
      default: '',
    },
    coverImagePublicId: {
      type: String,
      default: '',
    },
    isPublic: { type: Boolean, default: true },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    plays: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

playlistSchema.virtual('songCount').get(function () {
  return this.songs ? this.songs.length : 0;
});

playlistSchema.virtual('followersCount').get(function () {
  return this.followers ? this.followers.length : 0;
});

playlistSchema.index({ title: 'text', description: 'text' });

module.exports = mongoose.model('Playlist', playlistSchema);
