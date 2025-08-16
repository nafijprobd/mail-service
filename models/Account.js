const mongoose = require('mongoose');

/**
 * MongoDB Schema for storing Gmail account information
 * - email: Gmail address of the connected account
 * - refreshToken: OAuth2 refresh token for API access
 * - isPremium: Boolean flag for premium account status (locked to owner/admin only)
 */
const accountSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Add indexes for better performance
accountSchema.index({ email: 1 });
accountSchema.index({ isPremium: 1 });
accountSchema.index({ createdAt: -1 });
module.exports = mongoose.model('Account', accountSchema);
