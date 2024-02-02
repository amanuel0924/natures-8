const cachAsync = require('./../utils/catchAsync');
const AppError = require('../utils/AppError');
const APIFeatures = require('./../utils/apiFeatures');

exports.deleteOne = Model => {
  return cachAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) return next(new AppError('no doc found that id', 404));

    res.status(204).json({
      status: 'success',
      data: null
    });
  });
};
exports.updateOne = Model =>
  cachAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!doc) return next(new AppError('no docment found that id', 404));
    res.status(200).json({
      status: 'success',
      data: {
        doc
      }
    });
  });
exports.createOne = Model =>
  cachAsync(async (req, res, next) => {
    const newDoc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: newDoc
      }
    });
  });
exports.getOne = (Model, populatOpt) =>
  cachAsync(async (req, res, next) => {
    // eslint-disable-next-line prefer-const
    let QUERY = Model.findById(req.params.id);
    if (populatOpt) QUERY.populate(populatOpt);
    const doc = await QUERY;
    // Tour.findOne({ _id: req.params.id })
    if (!doc) return next(new AppError('no tour found that id', 404));
    res.status(200).json({
      status: 'success',
      data: {
        doc
      }
    });
  });

exports.getAll = Model =>
  cachAsync(async (req, res, next) => {
    // EXECUTE QUERY
    let filter = {};
    if (req.params.tour_id) filter = { tour: req.params.tour_id };
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    // const doc = await features.query.explain();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        doc
      }
    });
  });
