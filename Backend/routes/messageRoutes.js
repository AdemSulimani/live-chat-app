const express = require('express');
const {
  getMessages,
  sendMessage,
  markAsRead,
  markMessageAsRead,
  deleteConversation,
  uploadChatPhoto,
  uploadVoiceMessage,
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { messageLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Create uploads directory if it doesn't exist
const chatPhotosDir = path.join(__dirname, '..', 'uploads', 'chat-photos');
if (!fs.existsSync(chatPhotosDir)) {
  fs.mkdirSync(chatPhotosDir, { recursive: true });
}

// Create voice messages directory if it doesn't exist
const voiceMessagesDir = path.join(__dirname, '..', 'uploads', 'voice-messages');
if (!fs.existsSync(voiceMessagesDir)) {
  fs.mkdirSync(voiceMessagesDir, { recursive: true });
}

// Configure multer for chat photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, chatPhotosDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId-timestamp.extension
    const uniqueSuffix = `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  },
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter,
});

// Configure multer for voice message uploads
const voiceStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, voiceMessagesDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: userId-timestamp.extension
    const uniqueSuffix = `${req.user._id}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  },
});

// File filter - only allow audio formats
const voiceFileFilter = (req, file, cb) => {
  // Allow common audio formats
  const allowedTypes = /mp3|webm|ogg|wav|m4a|aac/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype.startsWith('audio/');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed (mp3, webm, ogg, wav, m4a, aac)'));
  }
};

const uploadVoice = multer({
  storage: voiceStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size për audio (më i madh se foto)
  },
  fileFilter: voiceFileFilter,
});

// Error handling middleware për multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      // Kontrollo nëse është voice upload ose photo upload
      const isVoiceUpload = req.route?.path === '/upload-voice';
      const maxSize = isVoiceUpload ? '10MB' : '5MB';
      return res.status(400).json({ message: `File size too large. Maximum size is ${maxSize}` });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message || 'File upload failed' });
  }
  next();
};

// All routes require authentication
router.use(protect);

// Upload chat photo - must be before POST / route to avoid conflicts
router.post('/upload-photo', upload.single('photo'), handleMulterError, uploadChatPhoto);

// Upload voice message - must be before POST / route to avoid conflicts
router.post('/upload-voice', uploadVoice.single('voice'), handleMulterError, uploadVoiceMessage);

// Send a message - me rate limiting për të shmangur spam
router.post('/', messageLimiter, sendMessage);

// Mark messages as read
router.put('/read/:friendId', markAsRead);

// Mark a specific message as read (must be before /:friendId route)
router.put('/:messageId/read', markMessageAsRead);

// Delete conversation with a friend (must be before /:friendId route to avoid conflicts)
router.delete('/conversation/:friendId', deleteConversation);

// Get messages between current user and a friend (must be last to avoid conflicts)
router.get('/:friendId', getMessages);

module.exports = router;

