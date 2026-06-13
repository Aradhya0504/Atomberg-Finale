const { createRouter, createWebRtcTransport } = require('./index');

const rooms = new Map(); // sessionId -> Room

// Grace period (ms) to hold disconnected peer state before removing
const RECONNECT_GRACE_MS = 15_000;

class Peer {
  constructor(socketId, name, role) {
    this.socketId = socketId;
    this.name = name;
    this.role = role;
    this.sendTransport = null;
    this.recvTransport = null;
    this.transports = new Map(); // id -> transport
    this.producers = new Map(); // id -> producer
    this.consumers = new Map(); // id -> consumer
    this.reconnectTimer = null;
  }

  close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.transports.forEach(t => { try { t.close(); } catch {} });
    this.transports.clear();
    this.producers.clear();
    this.consumers.clear();
  }
}

class Room {
  constructor(sessionId, router) {
    this.sessionId = sessionId;
    this.router = router;
    this.peers = new Map(); // socketId -> Peer
    this.createdAt = Date.now();
  }

  addPeer(socketId, name, role) {
    const peer = new Peer(socketId, name, role);
    this.peers.set(socketId, peer);
    return peer;
  }

  removePeer(socketId) {
    const peer = this.peers.get(socketId);
    if (peer) {
      peer.close();
      this.peers.delete(socketId);
    }
    return peer;
  }

  getPeer(socketId) {
    return this.peers.get(socketId);
  }

  // Returns all producers from all peers except the requesting one
  getProducers(excludeSocketId) {
    const list = [];
    for (const [sid, peer] of this.peers) {
      if (sid === excludeSocketId) continue;
      for (const [producerId, producer] of peer.producers) {
        list.push({
          producerId,
          peerId: sid,
          peerName: peer.name,
          peerRole: peer.role,
          kind: producer.kind,
        });
      }
    }
    return list;
  }

  close() {
    for (const peer of this.peers.values()) peer.close();
    this.peers.clear();
    try { this.router.close(); } catch {}
  }
}

async function getOrCreateRoom(sessionId) {
  if (rooms.has(sessionId)) return rooms.get(sessionId);
  const router = await createRouter();
  const room = new Room(sessionId, router);
  rooms.set(sessionId, room);
  console.log(`[Room] Created room for session ${sessionId}`);
  return room;
}

function getRoom(sessionId) {
  return rooms.get(sessionId) || null;
}

function getAllRooms() {
  return rooms;
}

function endRoom(sessionId) {
  const room = rooms.get(sessionId);
  if (room) {
    room.close();
    rooms.delete(sessionId);
    console.log(`[Room] Closed room for session ${sessionId}`);
  }
}

module.exports = { getOrCreateRoom, getRoom, getAllRooms, endRoom };
