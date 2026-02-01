const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000, // Limit për gjatësinë e mesazhit
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null, // Koha kur mesazhi u lexua
    },
    deliveredAt: {
      type: Date,
      default: null, // Koha kur mesazhi u dorëzua
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt - timestamp do të jetë createdAt
  }
);

// ============================================
// DATABASE INDEXES FOR PERFORMANCE
// ============================================
// Indekse optimale për queries më të shpejta dhe performancë më të mirë
// MongoDB përdor indekset për të optimizuar queries dhe për të shmangur full collection scans

// 1. Index për query kryesore: mesazhet midis dy përdoruesve
// Përdoret në: GET /api/messages/:friendId
// Query: { $or: [{ senderId, receiverId }, { senderId: receiverId, receiverId: senderId }] }
// Sort: createdAt: -1 (më të rejat së pari)
// Kjo është query më e përdorur - compound index për performancë optimale
// Indeksi { senderId: 1, receiverId: 1, createdAt: -1 } optimizon query për drejtimin e parë
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
// Indeksi { receiverId: 1, senderId: 1, createdAt: -1 } optimizon query për drejtimin e dytë
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 });

// 2. Index për mesazhet e palexuara (markAsRead query)
// Përdoret në: PUT /api/messages/read/:friendId (markAsRead)
// Query: { senderId: friendId, receiverId: currentUserId, isRead: false }
// Kjo optimizon updateMany query për të shënuar mesazhet si të lexuara
// Compound index për performancë optimale në updateMany operations
messageSchema.index({ senderId: 1, receiverId: 1, isRead: 1 });
// Index për queries që kërkojnë mesazhet e palexuara për një marrës
messageSchema.index({ receiverId: 1, isRead: 1, createdAt: -1 });

// 3. Index për të gjetur të gjithë mesazhet e një përdoruesi (si dërgues)
// Përdoret për: queries që kërkojnë të gjithë mesazhet e dërguara nga një përdorues
// Sort: createdAt: -1 (më të rejat së pari)
// Kjo është e rëndësishme për analytics dhe reporting
messageSchema.index({ senderId: 1, createdAt: -1 });

// 4. Index për të gjetur të gjithë mesazhet e një përdoruesi (si marrës)
// Përdoret për: queries që kërkojnë të gjithë mesazhet e marra nga një përdorues
// Sort: createdAt: -1 (më të rejat së pari)
// Kjo është e rëndësishme për analytics dhe reporting
messageSchema.index({ receiverId: 1, createdAt: -1 });

// 5. Index për timestamp (createdAt) - për sorting dhe range queries
// Përdoret për: queries që kërkojnë mesazhe në një interval kohor
// Kjo është e rëndësishme për pagination, filtering, dhe time-based queries
// Negative index (-1) për descending sort (më të rejat së pari)
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

