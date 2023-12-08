exports.error500 = (err) => {
  if (!err.statusCode) {
    err.statusCode = 500;
  }
  return err;
};

exports.createError = (status, msg) => {
  const error = new Error(msg);
  error.statusCode = status;
  return error;
};
