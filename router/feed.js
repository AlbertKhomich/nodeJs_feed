const express = require('express');
const { check } = require('express-validator');

const feedController = require('../controllers/feed');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// GET /feed/posts
router.get('/posts', isAuth, feedController.getPosts);

router.post(
  '/post',
  isAuth,
  check('title').trim().isLength({ min: 5 }),
  check('content').trim().isLength({ min: 5 }),
  feedController.createPost
);

router.get('/post/:postId', isAuth, feedController.getPost);

router.put(
  '/post/:postId',
  isAuth,
  check('title').trim().isLength({ min: 5 }),
  check('content').trim().isLength({ min: 5 }),
  feedController.updatePost
);

router.delete('/post/:postId', isAuth, feedController.deletePost);

router.get('/status', isAuth, feedController.getStatus);

router.put(
  '/status',
  isAuth,
  check('updatedStatus')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("Can't be empty or langer than 20 characters."),
  feedController.updateStatus
);

module.exports = router;
