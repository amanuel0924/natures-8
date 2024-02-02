const Review = require('./../models/reviweModel');
//const cachAsync = require('./../utils/catchAsync');
const handlerFactory = require('./handlerFactory');

exports.getAllReviews = handlerFactory.getAll(Review);

exports.setTourUserId = async (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tour_id;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.createReview = handlerFactory.createOne(Review);
exports.getReview = handlerFactory.getOne(Review);
exports.updateReview = handlerFactory.updateOne(Review);
exports.deletReview = handlerFactory.deleteOne(Review);
