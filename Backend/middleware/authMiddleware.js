const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Verify JWT token and attach user to request
// @access  Protected routes
const protect = async (req, res, next) => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    let token;

    // Check for token in Authorization header (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Alternative: Check for token in cookies (for future use)
    // else if (req.cookies && req.cookies.token) {
    //   token = req.cookies.token;
    // }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token (without password)
      const user = await User.findById(decoded.userId).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Attach user to request object
      req.user = user;
      next();
    } catch (error) {
      // Handle different JWT errors
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token has expired, please login again' });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      } else if (error.name === 'NotBeforeError') {
        return res.status(401).json({ message: 'Token not active yet' });
      }
      return res.status(401).json({ message: 'Not authorized, token verification failed' });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { protect };

