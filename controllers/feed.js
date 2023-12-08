const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const { error500, createError } = require('../utils/errors');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  Post.find()
    .countDocuments()
    .then((count) => {
      totalItems = count;
      return Post.find()
        .skip((currentPage - 1) * perPage)
        .limit(perPage);
    })
    .then((posts) => {
      res.status(200).json({
        message: 'Fetch Posts successfully.',
        posts: posts,
        totalItems: totalItems,
      });
    })
    .catch((err) => next(error500(err)));
};

exports.createPost = (req, res, next) => {
  validate(req);
  if (!req.file) {
    throw createError(422, 'No image provided.');
  }
  const imageUrl = req.file.path.replace('\\', '/');
  const title = req.body.title;
  const content = req.body.content;
  let creator;
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  });
  post
    .save()
    .then(() => {
      return User.findById(req.userId);
    })
    .then((user) => {
      creator = user;
      user.posts.push(post);
      return user.save();
    })
    .then(() => {
      res.status(201).json({
        message: 'Post created successfully!',
        post: post,
        creator: { _id: creator._id, name: creator.name },
      });
    })
    .catch((err) => {
      next(error500(err));
    });
};

exports.getPost = (req, res, next) => {
  postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        throw createError(404, 'Post not found');
      }
      res.status(200).json({ message: 'Post fetched', post: post });
    })
    .catch((err) => next(error500(err)));
};

exports.updatePost = (req, res, next) => {
  validate(req);
  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path.replace('\\', '/');
  }
  if (!imageUrl) {
    throw createError(422, 'No file picked');
  }
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        throw createError(404, 'Post not found');
      }
      checkAuth(post, req);
      if (imageUrl !== post.imageUrl) {
        clearImage(post.imageUrl);
      }
      post.title = title;
      post.content = content;
      post.imageUrl = imageUrl;
      return post.save();
    })
    .then((result) => {
      res.status(200).json({ message: 'Post updated.', post: result });
    })
    .catch((err) => next(error500(err)));
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        throw createError(404, 'Post not found');
      }
      checkAuth(post, req);
      clearImage(post.imageUrl);
      return Post.findByIdAndDelete(postId);
    })
    .then((result) => {
      console.log(result);
      return User.findById(req.userId);
    })
    .then((user) => {
      user.posts.pull(postId);
      return user.save();
    })
    .then(() => {
      res.status(200).json({ message: 'Deleted post.' });
    })
    .catch((err) => {
      next(error500(err));
    });
};

exports.getStatus = (req, res, next) => {
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        throw createError(403, 'Not authorized');
      }
      res.status(200).json({ message: ' Status found.', status: user.status });
    })
    .catch((err) => {
      next(error500(err));
    });
};

exports.updateStatus = (req, res, next) => {
  const updatedStatus = req.body.updatedStatus;
  validate(req);
  User.findById(req.userId)
    .then((user) => {
      user.status = updatedStatus;
      user.save();
    })
    .then(() => {
      res.status(200).json({
        message: 'Status updated',
        status: updatedStatus,
        userId: req.userId,
      });
    })
    .catch((err) => {
      next(error500(err));
    });
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, (err) => console.log(err));
};

const checkAuth = (post, req) => {
  if (post.creator.toString() !== req.userId) {
    throw createError(403, 'Not authorized!');
  }
};

const validate = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.errors[0].msg;
    throw createError(422, msg);
  }
};
