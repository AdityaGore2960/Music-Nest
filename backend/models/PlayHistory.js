const mongoose = require('mongoose');

/**
 * Play History Model
 * Tracks every song play for recommendations and analytics
 */
const playHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      required: true,
    },
    playedAt: {
      type: Date,
      default: Date.now,
    },
    // How many seconds of the song were actually listened to
    listenDuration: {
      type: Number,
      default: 0,
    },
    completedPlay: {
      type: Boolean,
      default: false, // True if user listened to at least 80%
    },
  },
  {
    timestamps: false, // playedAt serves as the timestamp
  }
);

// Composite index for efficient history queries
playHistorySchema.index({ user: 1, playedAt: -1 });
playHistorySchema.index({ song: 1, playedAt: -1 });

module.exports = mongoose.model('PlayHistory', playHistorySchema);
