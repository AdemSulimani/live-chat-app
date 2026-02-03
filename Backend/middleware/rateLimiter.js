const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

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

// Rate limiter për dërgimin e mesazheve
// Maksimum 30 mesazhe në minutë për çdo përdorues (për të shmangur spam)
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutë
  max: 30, // Maksimum 30 mesazhe në minutë
  message: {
    message: 'Too many messages sent. Please slow down and try again in a moment.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Përdor user ID në vend të IP për rate limiting më të saktë
  keyGenerator: (req) => {
    return req.user ? req.user._id.toString() : ipKeyGenerator(req);
  },
});

// Rate limiter për fshirjen e llogarisë
// Maksimum 2 tentativa çdo 24 orë për çdo përdorues (operacion i rëndësishëm dhe i pakthyeshëm)
const deleteAccountLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 orë
  max: 2, // Maksimum 2 tentativa në 24 orë
  message: {
    message: 'Too many delete account attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Përdor user ID për rate limiting më të saktë
  keyGenerator: (req) => {
    return req.user ? req.user._id.toString() : ipKeyGenerator(req);
  },
  // Skip successful requests në rate limit count (vetëm tentativat e dështuara)
  skipSuccessfulRequests: false, // Numërojmë të gjitha tentativat
});

module.exports = {
  loginLimiter,
  messageLimiter,
  deleteAccountLimiter,
};


