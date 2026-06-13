const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  _id: { type: String },
  agent_id: { type: String, required: true },
  agent_name: { type: String, required: true },
  invite_token: { type: String, required: true, unique: true },
  status: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
  title: { type: String, default: 'Support Session' },
  recording_status: { type: String, default: null },
  recording_path: { type: String, default: null },
  created_at: { type: Number, default: Date.now },
  started_at: { type: Number, default: null },
  ended_at: { type: Number, default: null },
}, { _id: false, versionKey: false });

module.exports = mongoose.model('Session', sessionSchema);
