const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Model
 * Supports roles: user, artist, admin
 * Handles password hashing via pre-save hook
 */
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries by default
    },
    role: {
      type: String,
      enum: ['user', 'artist', 'admin'],
      default: 'user',
    },
    profileImage: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    // Social follows
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Music preferences
    likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Song' }],
    likedPlaylists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Playlist' }],
    savedAlbums: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Album' }],

    // Auth fields
    refreshToken: { type: String, select: false },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    verificationTokenExpire: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },

    // Status
    isActive: { type: Boolean, default: true },
    lastSeen: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: full follower/following count
userSchema.virtual('followersCount').get(function () {
  return this.followers ? this.followers.length : 0;
});

// Pre-save: hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method: compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Index for faster search
userSchema.index({ username: 'text', email: 'text' });

module.exports = mongoose.model('User', userSchema);
