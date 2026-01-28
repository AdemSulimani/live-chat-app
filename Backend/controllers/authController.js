const validator = require('validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, country, password, confirmPassword, acceptTerms } = req.body;

    // Basic validations based on frontend fields
    if (!name || !email || !country || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 6 characters long' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (!acceptTerms) {
      return res
        .status(400)
        .json({ message: 'You must accept terms & policies' });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    // Create and save user (password will be hashed by the model pre-save hook)
    const user = await User.create({
      name,
      email,
      country,
      password,
      acceptTerms,
    });

    // Remove password from response
    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      country: user.country,
      createdAt: user.createdAt,
    };

    return res.status(201).json({
      message: 'User registered successfully',
      user: userResponse,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Login user (me email ose username + password)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // identifier mund të jetë email ose username (name)
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/username and password are required' });
    }

    // Vendosim nëse është email apo username
    const query = validator.isEmail(identifier)
      ? { email: identifier.toLowerCase() }
      : { name: identifier };

    const user = await User.findOne(query);

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Opsionale: krijo JWT token nëse ekziston JWT_SECRET
    let token = null;
    if (process.env.JWT_SECRET) {
      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
    }

    const userResponse = {
      id: user._id,
      name: user.name,
      email: user.email,
      country: user.country,
      createdAt: user.createdAt,
    };

    return res.status(200).json({
      message: 'Login successful',
      user: userResponse,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if email exists
// @route   GET /api/auth/check-email/:email
// @access  Public
const checkEmail = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ exists: false, message: 'Invalid email address' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });

    return res.status(200).json({ exists: !!existing });
  } catch (error) {
    console.error('Check email error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Check if username exists
// @route   GET /api/auth/check-username/:username
// @access  Public
const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ exists: false, message: 'Username is required' });
    }

    const existing = await User.findOne({ name: username });

    return res.status(200).json({ exists: !!existing });
  } catch (error) {
    console.error('Check username error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  checkEmail,
  checkUsername,
};

