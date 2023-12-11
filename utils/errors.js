const { validationResult } = require('express-validator');

const error500 = (err) => {
  if (!err.statusCode) {
    err.statusCode = 500;
  }
  return err;
};

const createError = (status, msg) => {
  const error = new Error(msg);
  error.statusCode = status;
  return error;
};

const validate = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.errors[0].msg;
    throw createError(422, msg);
  }
};

module.exports = { error500, createError, validate };
