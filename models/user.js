const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: { type: String, required: true },
  password: { type: String, requires: true },
  name: { type: String, requires: true },
  status: { type: String, default: "I'm new." },
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
});

module.exports = mongoose.model('User', userSchema);
