const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  _id: { type: String },
  session_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['agent', 'customer'], required: true },
  joined_at: { type: Number, required: true },
  left_at: { type: Number, default: null },
}, { _id: false, versionKey: false });

module.exports = mongoose.model('Participant', participantSchema);
