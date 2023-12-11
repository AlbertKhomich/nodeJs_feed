const fs = require('fs');
const path = require('path');

const { error500, createError, validate } = require('../utils/errors');

const Post = require('../models/post');
const User = require('../models/user');
const io = require('../socket');

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  try {
    const count = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate('creator')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    res.status(200).json({
      message: 'Fetch Posts successfully.',
      posts: posts,
      totalItems: count,
    });
  } catch (err) {
    next(error500(err));
  }
};

exports.createPost = async (req, res, next) => {
  validate(req);
  if (!req.file) {
    throw createError(422, 'No image provided.');
  }
  const imageUrl = req.file.path.replace('\\', '/');
  const title = req.body.title;
  const content = req.body.content;
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  });
  try {
    await post.save();
    const user = await User.findById(req.userId);
    user.posts.push(post);
    await user.save();
    io.getIO().emit('posts', {
      action: 'create',
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });
    res.status(201).json({
      message: 'Post created successfully!',
      post: post,
      user: { _id: user._id, name: user.name },
    });
  } catch (err) {
    next(error500(err));
  }
};

exports.getPost = async (req, res, next) => {
  postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      throw createError(404, 'Post not found');
    }
    res.status(200).json({ message: 'Post fetched', post: post });
  } catch (err) {
    next(error500(err));
  }
};

exports.updatePost = async (req, res, next) => {
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
  try {
    const post = await Post.findById(postId).populate('creator');
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
    const resultSaving = await post.save();
    io.getIO().emit('posts', { action: 'update', post: resultSaving });
    res.status(200).json({ message: 'Post updated.', post: resultSaving });
  } catch (err) {
    next(error500(err));
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      throw createError(404, 'Post not found');
    }
    checkAuth(post, req);
    clearImage(post.imageUrl);
    const resultDeleting = await Post.findByIdAndDelete(postId);
    console.log(resultDeleting);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();
    io.getIO().emit('posts', { action: 'delete', post: postId });
    res.status(200).json({ message: 'Deleted post.' });
  } catch (err) {
    next(error500(err));
  }
};

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw createError(403, 'Not authorized');
    }
    res.status(200).json({ message: ' Status found.', status: user.status });
  } catch (err) {
    next(error500(err));
  }
};

exports.updateStatus = async (req, res, next) => {
  const updatedStatus = req.body.updatedStatus;
  validate(req);
  try {
    const user = await User.findById(req.userId);
    user.status = updatedStatus;
    await user.save();

    res.status(200).json({
      message: 'Status updated',
      status: updatedStatus,
      userId: req.userId,
    });
  } catch (err) {
    next(error500(err));
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, (err) => console.log(err));
};

const checkAuth = (post, req) => {
  if (post.creator._id.toString() !== req.userId) {
    throw createError(403, 'Not authorized!');
  }
};
