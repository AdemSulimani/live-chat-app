const express = require('express');
const {
  registerUser,
  loginUser,
  checkEmail,
  checkUsername,
  deleteAccount,
} = require('../controllers/authController');
const { loginLimiter, deleteAccountLimiter } = require('../middleware/rateLimiter');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Register route
router.post('/register', registerUser);

// Login route (me rate limiting)
router.post('/login', loginLimiter, loginUser);

// Check email availability
router.get('/check-email/:email', checkEmail);

// Check username availability
router.get('/check-username/:username', checkUsername);

// Delete account route (protected me rate limiting)
router.delete('/delete-account', protect, deleteAccountLimiter, deleteAccount);

module.exports = router;


