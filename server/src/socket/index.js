const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { jwtSecret } = require('../config');
const { Session, Participant, Message } = require('../db/database');
const { getOrCreateRoom, getRoom, endRoom } = require('../mediasoup/rooms');
const { createWebRtcTransport } = require('../mediasoup');

// socketId -> { sessionId, name, role }
const socketMeta = new Map();

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.on('join-room', (data, cb) => joinRoom(socket, io, data, cb));
    socket.on('create-transport', (data, cb) => createTransport(socket, data, cb));
    socket.on('connect-transport', (data, cb) => connectTransport(socket, data, cb));
    socket.on('produce', (data, cb) => produce(socket, io, data, cb));
    socket.on('consume', (data, cb) => consume(socket, data, cb));
    socket.on('resume-consumer', (data, cb) => resumeConsumer(socket, data, cb));
    socket.on('close-producer', (data, cb) => closeProducer(socket, io, data, cb));
    socket.on('send-message', (data, cb) => sendMessage(socket, io, data, cb));
    socket.on('end-session', (data, cb) => endSession(socket, io, data, cb));
    socket.on('leave-room', (data, cb) => leaveRoom(socket, io, data, cb));
    socket.on('peer-action', (data) => peerAction(socket, io, data));
    socket.on('disconnect', () => handleDisconnect(socket, io));
  });
}

// ─── JOIN ROOM ────────────────────────────────────────────────────────────────
async function joinRoom(socket, io, { sessionId, authToken, inviteToken, name }, cb) {
  try {
    let participantName, participantRole;

    if (authToken) {
      const decoded = jwt.verify(authToken, jwtSecret);
      participantName = decoded.name;
      participantRole = decoded.role === 'admin' ? 'agent' : decoded.role;
    } else if (inviteToken && name) {
      const session = await Session.findOne({ _id: sessionId, invite_token: inviteToken });
      if (!session) return cb({ error: 'Invalid invite token' });
      participantName = name.trim().slice(0, 50);
      participantRole = 'customer';
    } else {
      return cb({ error: 'Authentication required' });
    }

    const session = await Session.findById(sessionId);
    if (!session) return cb({ error: 'Session not found' });
    if (session.status === 'ended') return cb({ error: 'Session has already ended' });

    const room = await getOrCreateRoom(sessionId);

    socket.join(sessionId);
    socket.data = { sessionId, name: participantName, role: participantRole };
    socketMeta.set(socket.id, { sessionId, name: participantName, role: participantRole });

    room.addPeer(socket.id, participantName, participantRole);

    await Participant.create({
      _id: uuidv4(),
      session_id: sessionId,
      name: participantName,
      role: participantRole,
      joined_at: Date.now(),
    });

    if (session.status === 'waiting' && participantRole === 'customer') {
      await Session.findByIdAndUpdate(sessionId, { status: 'active', started_at: Date.now() });
    }

    socket.to(sessionId).emit('peer-joined', {
      peerId: socket.id,
      name: participantName,
      role: participantRole,
    });

    cb({
      success: true,
      peerId: socket.id,
      name: participantName,
      role: participantRole,
      existingProducers: room.getProducers(socket.id),
      routerRtpCapabilities: room.router.rtpCapabilities,
    });
  } catch (err) {
    console.error('[join-room]', err.message);
    cb({ error: err.message });
  }
}

// ─── CREATE TRANSPORT ─────────────────────────────────────────────────────────
async function createTransport(socket, { sessionId, direction }, cb) {
  try {
    const room = getRoom(sessionId);
    if (!room) return cb({ error: 'Room not found' });
    const peer = room.getPeer(socket.id);
    if (!peer) return cb({ error: 'Peer not found in room' });

    const transport = await createWebRtcTransport(room.router);
    peer.transports.set(transport.id, transport);
    if (direction === 'send') peer.sendTransport = transport;
    else peer.recvTransport = transport;

    cb({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    });
  } catch (err) {
    console.error('[create-transport]', err.message);
    cb({ error: err.message });
  }
}

// ─── CONNECT TRANSPORT ────────────────────────────────────────────────────────
async function connectTransport(socket, { sessionId, transportId, dtlsParameters }, cb) {
  try {
    const room = getRoom(sessionId);
    if (!room) return cb({ error: 'Room not found' });
    const peer = room.getPeer(socket.id);
    if (!peer) return cb({ error: 'Peer not found' });
    const transport = peer.transports.get(transportId);
    if (!transport) return cb({ error: 'Transport not found' });

    await transport.connect({ dtlsParameters });
    cb({ success: true });
  } catch (err) {
    console.error('[connect-transport]', err.message);
    cb({ error: err.message });
  }
}

// ─── PRODUCE ──────────────────────────────────────────────────────────────────
async function produce(socket, io, { sessionId, transportId, kind, rtpParameters, appData }, cb) {
  try {
    const room = getRoom(sessionId);
    if (!room) return cb({ error: 'Room not found' });
    const peer = room.getPeer(socket.id);
    if (!peer) return cb({ error: 'Peer not found' });
    const transport = peer.transports.get(transportId);
    if (!transport) return cb({ error: 'Transport not found' });

    const producer = await transport.produce({ kind, rtpParameters, appData: appData || {} });
    peer.producers.set(producer.id, producer);

    producer.on('score', (score) => socket.emit('producer-score', { producerId: producer.id, score }));

    socket.to(sessionId).emit('new-producer', {
      producerId: producer.id,
      peerId: socket.id,
      peerName: peer.name,
      peerRole: peer.role,
      kind,
    });

    cb({ id: producer.id });
  } catch (err) {
    console.error('[produce]', err.message);
    cb({ error: err.message });
  }
}

// ─── CONSUME ──────────────────────────────────────────────────────────────────
async function consume(socket, { sessionId, producerId, rtpCapabilities }, cb) {
  try {
    const room = getRoom(sessionId);
    if (!room) return cb({ error: 'Room not found' });
    const peer = room.getPeer(socket.id);
    if (!peer) return cb({ error: 'Peer not found' });

    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      return cb({ error: 'Cannot consume this producer' });
    }

    const recvTransport = peer.recvTransport;
    if (!recvTransport) return cb({ error: 'Recv transport not created yet' });

    const consumer = await recvTransport.consume({ producerId, rtpCapabilities, paused: true });
    peer.consumers.set(consumer.id, consumer);

    consumer.on('transportclose', () => peer.consumers.delete(consumer.id));
    consumer.on('producerclose', () => {
      peer.consumers.delete(consumer.id);
      socket.emit('consumer-closed', { consumerId: consumer.id, producerId });
    });
    consumer.on('producerpause', () => socket.emit('consumer-paused', { consumerId: consumer.id }));
    consumer.on('producerresume', () => socket.emit('consumer-resumed', { consumerId: consumer.id }));

    cb({ id: consumer.id, producerId, kind: consumer.kind, rtpParameters: consumer.rtpParameters });
  } catch (err) {
    console.error('[consume]', err.message);
    cb({ error: err.message });
  }
}

// ─── RESUME CONSUMER ──────────────────────────────────────────────────────────
async function resumeConsumer(socket, { sessionId, consumerId }, cb) {
  try {
    const room = getRoom(sessionId);
    if (!room) return cb({ error: 'Room not found' });
    const peer = room.getPeer(socket.id);
    if (!peer) return cb({ error: 'Peer not found' });
    const consumer = peer.consumers.get(consumerId);
    if (!consumer) return cb({ error: 'Consumer not found' });
    await consumer.resume();
    cb({ success: true });
  } catch (err) {
    console.error('[resume-consumer]', err.message);
    cb({ error: err.message });
  }
}

// ─── TOGGLE PRODUCER (mute / video off) ──────────────────────────────────────
async function closeProducer(socket, io, { sessionId, producerId, paused }, cb) {
  try {
    const room = getRoom(sessionId);
    if (!room) return cb({ error: 'Room not found' });
    const peer = room.getPeer(socket.id);
    if (!peer) return cb({ error: 'Peer not found' });
    const producer = peer.producers.get(producerId);
    if (!producer) return cb({ error: 'Producer not found' });

    if (paused) await producer.pause();
    else await producer.resume();

    io.to(sessionId).emit('producer-state-changed', {
      producerId,
      peerId: socket.id,
      paused,
      kind: producer.kind,
    });
    cb({ success: true });
  } catch (err) {
    console.error('[close-producer]', err.message);
    cb({ error: err.message });
  }
}

// ─── CHAT MESSAGE ─────────────────────────────────────────────────────────────
async function sendMessage(socket, io, { sessionId, content, messageType, fileUrl, fileName }, cb) {
  try {
    const meta = socketMeta.get(socket.id);
    if (!meta) return cb({ error: 'Not in a session' });

    const msg = await Message.create({
      _id: uuidv4(),
      session_id: sessionId,
      sender_name: meta.name,
      sender_role: meta.role,
      content: content || '',
      message_type: messageType || 'text',
      file_url: fileUrl || null,
      file_name: fileName || null,
      created_at: Date.now(),
    });

    const plain = {
      id: msg._id,
      sessionId: msg.session_id,
      senderName: msg.sender_name,
      senderRole: msg.sender_role,
      content: msg.content,
      messageType: msg.message_type,
      fileUrl: msg.file_url,
      fileName: msg.file_name,
      createdAt: msg.created_at,
    };

    io.to(sessionId).emit('new-message', plain);
    cb({ success: true, message: plain });
  } catch (err) {
    console.error('[send-message]', err.message);
    cb({ error: err.message });
  }
}

// ─── END SESSION ──────────────────────────────────────────────────────────────
async function endSession(socket, io, { sessionId }, cb) {
  try {
    const meta = socketMeta.get(socket.id);
    if (!meta || meta.role === 'customer') return cb({ error: 'Not authorized to end session' });

    const now = Date.now();
    await Session.findByIdAndUpdate(sessionId, { status: 'ended', ended_at: now });
    await Participant.updateMany({ session_id: sessionId, left_at: null }, { left_at: now });

    io.to(sessionId).emit('session-ended', { by: meta.name });
    endRoom(sessionId);
    cb({ success: true });
  } catch (err) {
    console.error('[end-session]', err.message);
    cb({ error: err.message });
  }
}

// ─── PEER ACTION ──────────────────────────────────────────────────────────────
function peerAction(socket, io, data) {
  const meta = socketMeta.get(socket.id);
  if (!meta) return;
  socket.to(meta.sessionId).emit('peer-action', { peerId: socket.id, ...data });
}

// ─── LEAVE ROOM (explicit, immediate — no grace window) ───────────────────────
async function leaveRoom(socket, io, _data, cb) {
  const meta = socketMeta.get(socket.id);
  if (!meta) { cb && cb({ success: true }); return; }

  const { sessionId, name, role } = meta;
  socketMeta.delete(socket.id);

  const room = getRoom(sessionId);
  if (room) {
    const peer = room.getPeer(socket.id);
    if (peer && peer.reconnectTimer) clearTimeout(peer.reconnectTimer);
    room.removePeer(socket.id);
    io.to(sessionId).emit('peer-left', { peerId: socket.id, name, role });
    await Participant.findOneAndUpdate(
      { session_id: sessionId, name, left_at: null },
      { left_at: Date.now() }
    );
  }

  cb && cb({ success: true });
}

// ─── DISCONNECT ───────────────────────────────────────────────────────────────
function handleDisconnect(socket, io) {
  const meta = socketMeta.get(socket.id);
  if (!meta) return;

  const { sessionId, name, role } = meta;
  socketMeta.delete(socket.id);

  const room = getRoom(sessionId);
  if (!room) return;

  const peer = room.getPeer(socket.id);
  if (!peer) return;

  // 15s grace window for reconnect
  peer.reconnectTimer = setTimeout(async () => {
    room.removePeer(socket.id);
    io.to(sessionId).emit('peer-left', { peerId: socket.id, name, role });
    await Participant.findOneAndUpdate(
      { session_id: sessionId, name, left_at: null },
      { left_at: Date.now() }
    );
  }, 15_000);
}

module.exports = { setupSocketHandlers };
