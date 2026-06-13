require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT) || 3001,
  jwtSecret: process.env.JWT_SECRET || 'atomberg-secret-change-in-prod',
  clientUrl: (process.env.CLIENT_URL || 'https://localhost:5173').split(',').map(s => s.trim()),
  mediasoup: {
    worker: {
      rtcMinPort: parseInt(process.env.MEDIASOUP_MIN_PORT) || 10000,
      rtcMaxPort: parseInt(process.env.MEDIASOUP_MAX_PORT) || 10200,
      logLevel: 'warn',
      logTags: ['rtp', 'srtp', 'rtcp'],
    },
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: { 'x-google-start-bitrate': 1000 },
        },
        {
          kind: 'video',
          mimeType: 'video/VP9',
          clockRate: 90000,
          parameters: { 'profile-id': 2, 'x-google-start-bitrate': 1000 },
        },
        {
          kind: 'video',
          mimeType: 'video/h264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1',
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1_000_000,
      maxIncomingBitrate: 1_500_000,
    },
  },
};
