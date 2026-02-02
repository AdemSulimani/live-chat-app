const mongoose = require('mongoose');

const blockedUserSchema = new mongoose.Schema(
  {
    blockerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blockedId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    blockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index për të garantuar që një përdorues mund të ketë vetëm një rekord block për një përdorues specifik
// Kjo parandalon duplicate records dhe optimizon queries
// Përdoret në: kontrolli për block para dërgimit të mesazheve ose friend requests
blockedUserSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

// Index për të gjetur të gjithë përdoruesit e bllokuar nga një përdorues
// Përdoret për: GET /api/blocked (lista e përdoruesve të bllokuar)
blockedUserSchema.index({ blockerId: 1, blockedAt: -1 });

// Index për të gjetur të gjithë përdoruesit që kanë bllokuar një përdorues specifik
// Përdoret për: kontrolli nëse një përdorues është i bllokuar nga përdoruesi tjetër
blockedUserSchema.index({ blockedId: 1 });

const BlockedUser = mongoose.model('BlockedUser', blockedUserSchema);

module.exports = BlockedUser;

