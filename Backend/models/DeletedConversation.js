const mongoose = require('mongoose');

/**
 * DeletedConversation Model
 * 
 * Ky model ruan rekordet e bisedave të fshira nga përdoruesit.
 * Kur një përdorues fshin bisedën me një përdorues tjetër, krijohet një rekord
 * që tregon se mesazhet para deletedAt nuk duhet të shfaqen për këtë përdorues.
 * 
 * Karakteristika:
 * - Fshirja është vetëm për përdoruesin që e bën (userId)
 * - Përdoruesi tjetër (otherUserId) ende sheh mesazhet e vjetra
 * - Pas fshirjes, vetëm mesazhet e reja (pas deletedAt) shfaqen për userId
 * - Kur dërgohet mesazh i ri, rekordi fshihet automatikisht
 */
const deletedConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    otherUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Other user ID is required'],
      index: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Validim: userId dhe otherUserId nuk duhet të jenë të njëjta
deletedConversationSchema.pre('validate', async function() {
  if (this.userId && this.otherUserId && this.userId.toString() === this.otherUserId.toString()) {
    const error = new Error('User cannot delete conversation with themselves');
    error.name = 'ValidationError';
    throw error;
  }
});

// Index unik për të garantuar që një përdorues mund të ketë vetëm një rekord delete për një bisedë specifike
// Kjo parandalon duplicate records dhe optimizon queries
// Përdoret në: GET /api/messages/:friendId (për të filtruar mesazhet e fshira)
deletedConversationSchema.index({ userId: 1, otherUserId: 1 }, { unique: true });

// Index për të gjetur të gjitha bisedat e fshira nga një përdorues (renditur sipas deletedAt)
// Përdoret për: queries që kërkojnë të gjitha bisedat e fshira nga një përdorues
deletedConversationSchema.index({ userId: 1, deletedAt: -1 });

const DeletedConversation = mongoose.model('DeletedConversation', deletedConversationSchema);

module.exports = DeletedConversation;

