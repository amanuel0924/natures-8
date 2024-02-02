const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'please insert requerd']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      set: val => Math.round(val * 10) / 10
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must belong to a user']
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'review must belong to a tour']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });
reviewSchema.statics.ratingAvgcalculator = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

reviewSchema.post('save', function() {
  this.constructor.ratingAvgcalculator(this.tour);
});

reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});
// reviewSchema.pre(/^findOneAnd/, async function(next) {
//   this.r = await this.findOne().clone();
//   console.log(this.r);
//   next();
// });

// reviewSchema.post(/^findOneAnd/, async function() {
//   // await this.findOne(); does NOT work here, query has already executed
//   await this.r.constructor.ratingAvgcalculator(this.r.tour);
// });
reviewSchema.pre(/^findOneAndUpdate/, function(next) {
  this.findOneAndUpdate({}, {}, { new: true });
  next();
});

reviewSchema.post(/^findOneAndUpdate/, async function(doc, next) {
  if (!doc) {
    return next();
  }
  await doc.constructor.ratingAvgcalculator(doc.tour);
  next();
});
reviewSchema.pre(/^findOneAndDelete/, function(next) {
  this.findOneAndDelete({}, {}, { new: true });
  next();
});

reviewSchema.post(/^findOneAndDelete/, async function(doc, next) {
  if (!doc) {
    return next();
  }
  await doc.constructor.ratingAvgcalculator(doc.tour);
  next();
});

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;
