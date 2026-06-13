const mediasoup = require('mediasoup');
const config = require('../config');

let worker = null;

async function createWorker() {
  worker = await mediasoup.createWorker({
    logLevel: config.mediasoup.worker.logLevel,
    logTags: config.mediasoup.worker.logTags,
    rtcMinPort: config.mediasoup.worker.rtcMinPort,
    rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
  });

  console.log(`[mediasoup] Worker created (pid: ${worker.pid})`);

  worker.on('died', (error) => {
    console.error('[mediasoup] Worker died — restarting process', error);
    process.exit(1);
  });

  return worker;
}

async function createRouter() {
  if (!worker) throw new Error('mediasoup worker not initialized');
  return worker.createRouter({ mediaCodecs: config.mediasoup.router.mediaCodecs });
}

async function createWebRtcTransport(router) {
  const transport = await router.createWebRtcTransport({
    listenIps: config.mediasoup.webRtcTransport.listenIps,
    enableUdp: config.mediasoup.webRtcTransport.enableUdp,
    enableTcp: config.mediasoup.webRtcTransport.enableTcp,
    preferUdp: config.mediasoup.webRtcTransport.preferUdp,
    initialAvailableOutgoingBitrate: config.mediasoup.webRtcTransport.initialAvailableOutgoingBitrate,
  });

  if (config.mediasoup.webRtcTransport.maxIncomingBitrate) {
    await transport.setMaxIncomingBitrate(config.mediasoup.webRtcTransport.maxIncomingBitrate);
  }

  return transport;
}

module.exports = { createWorker, createRouter, createWebRtcTransport };
