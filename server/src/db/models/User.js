const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: { type: String },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['agent', 'admin'], required: true },
  created_at: { type: Number, default: Date.now },
}, { _id: false, versionKey: false });

module.exports = mongoose.model('User', userSchema);
