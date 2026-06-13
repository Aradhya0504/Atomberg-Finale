const express = require('express');
const router = express.Router();
const { Session, Participant, Message } = require('../db/database');
const { requireAdmin, requireAgent } = require('../middleware/auth');
const { endRoom } = require('../mediasoup/rooms');

// GET /api/admin/sessions
router.get('/sessions', requireAgent, async (req, res) => {
  try {
    const sessions = await Session.find().sort({ created_at: -1 }).lean();
    const enriched = await Promise.all(sessions.map(async s => ({
      ...s,
      id: s._id,
      participants: await Participant.find({ session_id: s._id }).sort({ joined_at: 1 }).lean(),
      messageCount: await Message.countDocuments({ session_id: s._id }),
      duration: s.ended_at && s.started_at ? s.ended_at - s.started_at : null,
    })));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats
router.get('/stats', requireAgent, async (req, res) => {
  try {
    const [activeSessions, waitingSessions, totalSessions, connectedParticipants, totalMessages] = await Promise.all([
      Session.countDocuments({ status: 'active' }),
      Session.countDocuments({ status: 'waiting' }),
      Session.countDocuments(),
      Participant.countDocuments({ left_at: null }),
      Message.countDocuments(),
    ]);
    res.json({ activeSessions, waitingSessions, totalSessions, connectedParticipants, totalMessages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/sessions/:id/end
router.post('/sessions/:id/end', requireAdmin, async (req, res) => {
  try {
    const now = Date.now();
    await Session.findByIdAndUpdate(req.params.id, { status: 'ended', ended_at: now });
    await Participant.updateMany({ session_id: req.params.id, left_at: null }, { left_at: now });
    endRoom(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/metrics — Prometheus format
router.get('/metrics', async (req, res) => {
  try {
    const [active, participants, total, messages] = await Promise.all([
      Session.countDocuments({ status: 'active' }),
      Participant.countDocuments({ left_at: null }),
      Session.countDocuments(),
      Message.countDocuments(),
    ]);
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(
      `# HELP active_sessions Currently active sessions\n# TYPE active_sessions gauge\nactive_sessions ${active}\n\n` +
      `# HELP connected_participants Connected participants\n# TYPE connected_participants gauge\nconnected_participants ${participants}\n\n` +
      `# HELP total_sessions_created Total sessions created\n# TYPE total_sessions_created counter\ntotal_sessions_created ${total}\n\n` +
      `# HELP total_chat_messages Total messages sent\n# TYPE total_chat_messages counter\ntotal_chat_messages ${messages}\n`
    );
  } catch (err) {
    res.status(500).send('# error fetching metrics\n');
  }
});

module.exports = router;
