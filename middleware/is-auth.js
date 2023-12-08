const { createError } = require('../utils/errors');

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    throw createError(401, 'Not authenticated');
  }
  const token = authHeader.split(' ')[1];
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, 'secret');
  } catch (err) {
    err.statusCode = 500;
    throw err;
  }
  if (!decodedToken) {
    throw createError(401, 'Not authenticated');
  }
  req.userId = decodedToken.userId;
  next();
};
