const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: 'Invalid email address',
      },
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    // Mund të ruajmë nëse përdoruesi ka pranuar termat gjatë regjistrimit
    acceptTerms: {
      type: Boolean,
      default: false,
    },
    // Profile fields
    username: {
      type: String,
      unique: true,
      sparse: true, // Lejon null values por garanton uniqueness kur ekziston
      trim: true,
      lowercase: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    statusMessage: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    profilePhoto: {
      type: String, // Do të ruajmë URL ose path të fotos
      default: null,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    // Friends array - stores references to other users
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Blocked users array - stores references to blocked users
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Activity status - online, offline, do_not_disturb
    activityStatus: {
      type: String,
      enum: ['online', 'offline', 'do_not_disturb'],
      default: 'offline',
    },
    // Last seen settings
    lastSeenEnabled: {
      type: Boolean,
      default: true, // Default: last seen is enabled
    },
    lastSeenAt: {
      type: Date,
      default: null, // Koha e fundit kur përdoruesi ka lexuar mesazhe
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Hash password-it para se të ruhet në databazë
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Metodë ndihmëse për krahasimin e password-it në login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;


