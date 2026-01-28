const rateLimit = require('express-rate-limit');

// Rate limiter specifik për login
// p.sh. maksimum 15 tentativa çdo 15 minuta nga i njëjti IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuta
  max: 15,
  message: {
    message: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
};


