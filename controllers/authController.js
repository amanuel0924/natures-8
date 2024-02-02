const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const sendEmail = require('../utils/email');

const signToken = id => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXP_IN
  });
};
const createAndSendToken = (user, statuscode, res) => {
  const Token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXP_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', Token, cookieOptions);
  //remove password from output
  user.password = undefined;

  return res.status(statuscode).json({
    status: 'success',
    Token,
    data: {
      user: user
    }
  });
};

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    email: req.body.email
  });
  createAndSendToken(newUser, 201, res);
});

exports.logIn = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //check if imail and password exist
  if (!email || !password) {
    return next(new AppError('please provied email and password', 401));
  }
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('incorrect Email or Password', 401));
  }
  createAndSendToken(user, 200, res);
});
exports.protect = catchAsync(async (req, res, next) => {
  //get token and check if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('you are not loged in,please login first', 401));
  }
  //verify token

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //check if user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError('this token user is does no longer exist', 401));
  }
  //check if user changed password after the token was issued

  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('user recently changed password,please login again', 401)
    );
  }

  //grant access to protected route
  req.user = currentUser;
  next();
});
exports.restrictedTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('no permistion to access', 403));
    }
    next();
  };
};
exports.forgotPassword = catchAsync(async (req, res, next) => {
  //get user based on posted email
  console.log('------------------------------------');
  const user = await User.findOne({ email: req.body.email });

  if (!user) next(new AppError('there is no user with this email', 404));
  //generate randome reset token
  const resetToken = user.resetPasswordToken();
  await user.save({ validateBeforeSave: false });
  //send it to user email
  // const resetUrl = `${req.protocol}://${req.get(
  //   'host'
  // )}/api/v1/users/resetpassword/${resetToken}`;
  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetpassword/${resetToken}`;
  const message = `forgot your password? submit a patch request with your new password and passwordConfirm to:${resetUrl}.\n if you didn't forget your password please ignore this email`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'your password reset token (valid for 10 min)',
      message
    });
    res.status(200).json({
      status: 'success',
      message: 'token sent to email'
    });
  } catch (err) {
    user.passwordToken = undefined;
    user.passwordExptime = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('there was an error sending the email try again later', 500)
    );
  }
});
exports.resetpassword = catchAsync(async (req, res, next) => {
  //get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordToken: hashedToken,
    paswordExptime: { $gt: Date.now() }
  });

  if (!user) {
    return next(new AppError('token is invalid or has expired', 400));
  }
  //set new password if token has not expired and there is user
  user.password = req.body.password;
  user.confirmPassword = req.body.confirmPassword;
  user.passwordToken = undefined;
  user.paswordExptime = undefined;
  await user.save();

  createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //get user from collection

  const { passwordCurrent, password, confirmPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.correctPassword(passwordCurrent, user.password))) {
    return next(new AppError('incorrect Password', 401));
  }
  user.password = password;
  user.confirmPassword = confirmPassword;
  await user.save();

  createAndSendToken(user, 200, res);

  // const hashPassword=await user.correctPassword(password, user.password)
  // const user= await User.findOne({password:})
  // check if poseted passwor
});
