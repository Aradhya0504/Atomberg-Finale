import { Device } from 'mediasoup-client';
import { emitAsync } from './socket';

export class SFUClient {
  constructor(socket, sessionId) {
    this.socket = socket;
    this.sessionId = sessionId;
    this.device = null;
    this.sendTransport = null;
    this.recvTransport = null;
    this.producers = new Map(); // 'audio'|'video' -> producer
    this.consumers = new Map(); // producerId -> consumer
    this.onNewTrack = null;   // callback(peerId, peerName, peerRole, kind, track, producerId)
    this.onTrackRemoved = null; // callback(producerId)
    this.onTrackStateChange = null; // callback(producerId, peerId, kind, paused)
  }

  async initialize(routerRtpCapabilities) {
    this.device = new Device();
    await this.device.load({ routerRtpCapabilities });
  }

  async createSendTransport() {
    const params = await emitAsync(this.socket, 'create-transport', {
      sessionId: this.sessionId,
      direction: 'send',
    });

    this.sendTransport = this.device.createSendTransport(params);

    this.sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      emitAsync(this.socket, 'connect-transport', {
        sessionId: this.sessionId,
        transportId: this.sendTransport.id,
        dtlsParameters,
      }).then(callback).catch(errback);
    });

    this.sendTransport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
      emitAsync(this.socket, 'produce', {
        sessionId: this.sessionId,
        transportId: this.sendTransport.id,
        kind,
        rtpParameters,
        appData,
      }).then(({ id }) => callback({ id })).catch(errback);
    });

    this.sendTransport.on('connectionstatechange', (state) => {
      if (state === 'failed') {
        console.error('[SFU] Send transport connection failed');
        this.sendTransport.close();
      }
    });

    return this.sendTransport;
  }

  async createRecvTransport() {
    const params = await emitAsync(this.socket, 'create-transport', {
      sessionId: this.sessionId,
      direction: 'recv',
    });

    this.recvTransport = this.device.createRecvTransport(params);

    this.recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
      emitAsync(this.socket, 'connect-transport', {
        sessionId: this.sessionId,
        transportId: this.recvTransport.id,
        dtlsParameters,
      }).then(callback).catch(errback);
    });

    this.recvTransport.on('connectionstatechange', (state) => {
      if (state === 'failed') {
        console.error('[SFU] Recv transport connection failed');
      }
    });

    return this.recvTransport;
  }

  async produceTrack(track) {
    if (!this.sendTransport) throw new Error('Send transport not created');
    const producer = await this.sendTransport.produce({ track });
    this.producers.set(track.kind, producer);

    producer.on('trackended', () => {
      console.log(`[SFU] ${track.kind} track ended`);
    });

    return producer;
  }

  async consumeProducer(producerId, peerId, peerName, peerRole, kind) {
    if (!this.recvTransport) throw new Error('Recv transport not created');
    if (!this.device.rtpCapabilities) throw new Error('Device not initialized');

    const params = await emitAsync(this.socket, 'consume', {
      sessionId: this.sessionId,
      producerId,
      rtpCapabilities: this.device.rtpCapabilities,
    });

    const consumer = this.recvTransport.consume({
      id: params.id,
      producerId,
      kind: params.kind,
      rtpParameters: params.rtpParameters,
    });

    this.consumers.set(producerId, consumer);

    // Resume the consumer on the server
    await emitAsync(this.socket, 'resume-consumer', {
      sessionId: this.sessionId,
      consumerId: params.id,
    });

    if (this.onNewTrack) {
      this.onNewTrack(peerId, peerName, peerRole, kind, consumer.track, producerId);
    }

    return consumer;
  }

  async toggleAudio(paused) {
    const producer = this.producers.get('audio');
    if (!producer) return;
    if (paused) await producer.pause();
    else await producer.resume();

    await emitAsync(this.socket, 'close-producer', {
      sessionId: this.sessionId,
      producerId: producer.id,
      paused,
    });
  }

  async toggleVideo(paused) {
    const producer = this.producers.get('video');
    if (!producer) return;
    if (paused) await producer.pause();
    else await producer.resume();

    await emitAsync(this.socket, 'close-producer', {
      sessionId: this.sessionId,
      producerId: producer.id,
      paused,
    });
  }

  close() {
    this.producers.forEach(p => { try { p.close(); } catch {} });
    this.consumers.forEach(c => { try { c.close(); } catch {} });
    if (this.sendTransport) { try { this.sendTransport.close(); } catch {} }
    if (this.recvTransport) { try { this.recvTransport.close(); } catch {} }
    this.producers.clear();
    this.consumers.clear();
  }
}
