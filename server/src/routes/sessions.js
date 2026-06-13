const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Session, Participant, Message } = require('../db/database');
const { requireAgent } = require('../middleware/auth');
const { clientUrl } = require('../config');
const { endRoom } = require('../mediasoup/rooms');

const uploadDir = path.join(__dirname, '../../uploads');
const filesDir = path.join(uploadDir, 'files');
const recordingsDir = path.join(uploadDir, 'recordings');
[uploadDir, filesDir, recordingsDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

const fileStorage = multer.diskStorage({
  destination: filesDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const recordingStorage = multer.diskStorage({
  destination: recordingsDir,
  filename: (req, file, cb) => cb(null, `${req.params.id}-${Date.now()}.webm`),
});
const uploadFile = multer({ storage: fileStorage, limits: { fileSize: 20 * 1024 * 1024 } });
const uploadRecording = multer({ storage: recordingStorage, limits: { fileSize: 500 * 1024 * 1024 } });

// POST /api/sessions — create session
router.post('/', requireAgent, async (req, res) => {
  try {
    const { title } = req.body;
    const agent = req.user;
    const id = uuidv4();
    const invite_token = uuidv4();

    const session = await Session.create({
      _id: id,
      agent_id: agent.userId,
      agent_name: agent.name,
      invite_token,
      title: title || 'Support Session',
    });

    const inviteLink = `${clientUrl}/join?token=${invite_token}`;
    res.json({ session, inviteLink, inviteToken: invite_token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions
router.get('/', requireAgent, async (req, res) => {
  try {
    const { status } = req.query;
    const agent = req.user;
    const filter = agent.role === 'admin' ? {} : { agent_id: agent.userId };
    if (status) filter.status = status;

    const sessions = await Session.find(filter).sort({ created_at: -1 }).limit(100).lean();

    const enriched = await Promise.all(sessions.map(async s => ({
      ...s,
      id: s._id,
      activeParticipants: await Participant.countDocuments({ session_id: s._id, left_at: null }),
      totalParticipants: await Participant.countDocuments({ session_id: s._id }),
      messageCount: await Message.countDocuments({ session_id: s._id }),
      duration: s.ended_at && s.started_at ? s.ended_at - s.started_at : null,
    })));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/join/:token — validate invite (public, no auth)
router.get('/join/:token', async (req, res) => {
  try {
    const session = await Session.findOne({ invite_token: req.params.token }).lean();
    if (!session) return res.status(404).json({ error: 'Invalid or expired invite link' });
    if (session.status === 'ended') return res.status(410).json({ error: 'This session has already ended' });
    res.json({ sessionId: session._id, title: session.title, agentName: session.agent_name, status: session.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id
router.get('/:id', requireAgent, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const participants = await Participant.find({ session_id: req.params.id }).sort({ joined_at: 1 }).lean();
    const messages = await Message.find({ session_id: req.params.id }).sort({ created_at: 1 }).lean();
    res.json({ session: { ...session, id: session._id }, participants, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/end
router.post('/:id/end', requireAgent, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.agent_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to end this session' });
    }
    const now = Date.now();
    await Session.findByIdAndUpdate(req.params.id, { status: 'ended', ended_at: now });
    await Participant.updateMany({ session_id: req.params.id, left_at: null }, { left_at: now });
    endRoom(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/recording
router.post('/:id/recording', requireAgent, uploadRecording.single('recording'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const recordingPath = `/uploads/recordings/${req.file.filename}`;
    await Session.findByIdAndUpdate(req.params.id, { recording_status: 'ready', recording_path: recordingPath });
    res.json({ success: true, recordingPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:id/recording
router.get('/:id/recording', requireAgent, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).lean();
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ status: session.recording_status, path: session.recording_path });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/:id/files
router.post('/:id/files', uploadFile.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ fileUrl: `/uploads/files/${req.file.filename}`, fileName: req.file.originalname });
});

module.exports = router;
