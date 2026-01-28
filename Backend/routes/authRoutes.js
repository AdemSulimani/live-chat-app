const express = require('express');
const {
  registerUser,
  loginUser,
  checkEmail,
  checkUsername,
} = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Register route
router.post('/register', registerUser);

// Login route (me rate limiting)
router.post('/login', loginLimiter, loginUser);

// Check email availability
router.get('/check-email/:email', checkEmail);

// Check username availability
router.get('/check-username/:username', checkUsername);

module.exports = router;


