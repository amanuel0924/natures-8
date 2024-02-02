const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'user must have name'],
    maxlength: [20, 'A  name must have less or equal then 20 characters'],
    minlength: [3, 'A  name must have more or equal then 3 characters']
  },
  photo: {
    type: String
  },
  email: {
    type: String,
    required: [true, 'you must have email'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'provied correct email']
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },

  password: {
    type: String,
    required: [true, 'please provied password'],
    minlength: 8,
    select: false
  },
  confirmPassword: {
    type: String,
    required: [true, 'please comfirm your password'],
    minlength: 8,
    validate: {
      validator: function(el) {
        return el === this.password;
      },
      message: 'passwords are not the same'
    }
  },
  passwordChangedAt: {
    type: Date
  },
  passwordToken: String,
  passwordExptime: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});
userSchema.pre('save', async function(next) {
  //only run this if this paswword modified or creae users
  if (!this.isModified('password')) return next;
  //hashing password
  this.password = await bcrypt.hash(this.password, 12);
  //
  this.confirmPassword = undefined;

  next();
});
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;

  next();
});
userSchema.methods.changePasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimeStamp;
  }
  return false;
};
userSchema.methods.resetPasswordToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordExptime = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
const User = mongoose.model('User', userSchema);

module.exports = User;
