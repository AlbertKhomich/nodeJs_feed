const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Post = require('../models/post');
const { clearImage } = require('../utils/file');

module.exports = {
  createUser: async function ({ userInput }, req) {
    const errors = [];
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: 'Email is invalid' });
    }
    if (!validator.isLength(userInput.password, { min: 5 })) {
      errors.push({ message: 'Password is too short' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const existingUser = await User.findOne({ email: userInput.email });
    if (existingUser) {
      throw new Error('User exist already');
    }
    const hashedPw = await bcrypt.hash(userInput.password, 12);

    const user = new User({
      email: userInput.email,
      name: userInput.name,
      password: hashedPw,
    });
    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async function ({ email, password }) {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error('User not found.');
      error.code = 401;
      throw error;
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error('Password is incorrect');
      error.code = 401;
      throw error;
    }
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      'secret',
      { expiresIn: '1h' }
    );
    return { token: token, userId: user._id.toString() };
  },
  createPost: async function ({ postInput }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    const errors = [];
    if (!validator.isLength(postInput.title, { min: 5 })) {
      errors.push({ message: 'Title is too short' });
    }
    if (!validator.isLength(postInput.content, { min: 5 })) {
      errors.push({ message: 'Content is too short' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('No such user');
      error.code = 401;
      throw error;
    }
    const post = new Post({
      title: postInput.title,
      imageUrl: postInput.imageUrl,
      content: postInput.content,
      creator: user,
    });
    await post.save();
    user.posts.push(post);
    await user.save();
    return { ...post._doc, createdAt: post.createdAt.toDateString() };
  },
  showPosts: async function ({ page }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    if (!page) page = 1;
    const perPage = 2;
    const postsCount = await Post.find().countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('creator');
    return {
      posts: posts.map((post) => {
        return { ...post._doc, createdAt: post.createdAt.toDateString() };
      }),
      totalPosts: postsCount,
    };
  },
  post: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id).populate('creator');
    if (!post) {
      const error = new Error('No current post');
      error.code = 404;
      throw error;
    }
    return { ...post._doc, createdAt: post.createdAt.toDateString() };
  },
  updatePost: async function ({ id, postInput }, req) {
    // if (!req.isAuth) {
    //   const error = new Error('Not authenticated');
    //   error.code = 401;
    //   throw error;
    // }
    const post = await Post.findById(id).populate('creator');
    if (!post) {
      const error = new Error('No current post');
      error.code = 404;
      throw error;
    }
    // if (post.creator._id.toString() !== req.userId.toString()) {
    //   const error = new Error('Not authorized');
    //   error.code = 403;
    //   throw error;
    // }
    const errors = [];
    if (!validator.isLength(postInput.title, { min: 5 })) {
      errors.push({ message: 'Title is too short' });
    }
    if (!validator.isLength(postInput.content, { min: 5 })) {
      errors.push({ message: 'Content is too short' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    post.title = postInput.title;
    post.content = postInput.content;
    if (postInput.imageUrl) {
      post.imageUrl = postInput.imageUrl;
    } else {
      postInput.imageUrl = post.imageUrl;
    }
    const updatedPost = await post.save();
    return {
      ...updatedPost._doc,
      createdAt: updatedPost.createdAt.toDateString(),
    };
  },
  deletePost: async function ({ id }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    const post = await Post.findById(id);
    if (!post) {
      const error = new Error('Post not found');
      error.code = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error('Not authorized');
      error.code = 403;
      throw error;
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndDelete(id);
    const user = await User.findById(req.userId);
    user.posts.pull(id);
    await user.save();
    return true;
  },
  user: async function (args, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found');
      error.code = 404;
      throw error;
    }
    return user;
  },
  newStatus: async function ({ status }, req) {
    if (!req.isAuth) {
      const error = new Error('Not authenticated');
      error.code = 401;
      throw error;
    }
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found');
      error.code = 404;
      throw error;
    }
    const errors = [];
    if (!validator.isLength(status, { min: 1 })) {
      errors.push({ message: 'Status can not be empty' });
    }
    if (errors.length > 0) {
      const error = new Error('Invalid input');
      error.data = errors;
      error.code = 422;
      throw error;
    }
    user.status = status;
    await user.save();
    return user;
  },
};
