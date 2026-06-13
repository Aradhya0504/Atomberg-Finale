const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  _id: { type: String },
  session_id: { type: String, required: true, index: true },
  sender_name: { type: String, required: true },
  sender_role: { type: String, required: true },
  content: { type: String, required: true },
  message_type: { type: String, enum: ['text', 'file'], default: 'text' },
  file_url: { type: String, default: null },
  file_name: { type: String, default: null },
  created_at: { type: Number, default: Date.now },
}, { _id: false, versionKey: false });

module.exports = mongoose.model('Message', messageSchema);
