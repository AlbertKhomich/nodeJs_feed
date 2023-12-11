const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const { createError, error500, validate } = require('../utils/errors');

exports.signup = async (req, res, next) => {
  validate(req);
  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  try {
    const hashedPw = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      password: hashedPw,
      name: name,
    });
    const resultSaving = await user.save();
    res
      .status(201)
      .json({ message: 'new user created', userId: resultSaving._id });
  } catch (err) {
    next(error500(err));
  }
};

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      throw createError(404, 'User with that email could not be found');
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      throw createError(401, 'Wrong password');
    }
    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
      },
      'secret',
      { expiresIn: '1h' }
    );
    res.status(200).json({ token: token, userId: user._id.toString() });
  } catch {
    next(error500(err));
  }
};
