import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket, disconnectSocket, emitAsync } from '../utils/socket';
import { SFUClient } from '../utils/mediasoupClient';
import { api } from '../utils/api';

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const IconMic = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3"/>
    <path d="M5 10a7 7 0 0014 0"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
);
const IconMicOff = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
    <path d="M17 16.95A7 7 0 015 10v-1m14 0v1a7 7 0 01-.11 1.23"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>
);
const IconCamera = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 7l-7 5 7 5V7z"/>
    <rect x="1" y="5" width="15" height="14" rx="2"/>
  </svg>
);
const IconCameraOff = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);
const IconRecord = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none"/>
  </svg>
);
const IconStop = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor"/>
  </svg>
);
const IconEndCall = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.43 9.64a19.86 19.86 0 01-3.07-8.67A2 2 0 012.18 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.18 8.91a16 16 0 002.5 3.4z"/>
    <line x1="23" y1="1" x2="17" y2="7"/>
    <line x1="17" y1="1" x2="23" y2="7"/>
  </svg>
);
const IconChat = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const IconLive = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14"/>
  </svg>
);

// ─── Video Tile ───────────────────────────────────────────────────────────────
function VideoTile({ stream, name, role, muted = false, isLocal = false, videoOff = false, audioOff = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream, videoOff]);

  const showAvatar = !stream || videoOff;

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ background: '#000', width: '100%', height: '100%' }}>
      {/* Always keep video element in DOM so srcObject isn't lost on toggle */}
      <video ref={ref} autoPlay playsInline muted={isLocal || muted}
        className="w-full h-full object-cover"
        style={{ display: showAvatar ? 'none' : 'block' }} />
      {showAvatar && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: '#1e1e2a' }}>
          <div className="text-center">
            <div className="text-5xl mb-2">
              {name ? name.charAt(0).toUpperCase() : '?'}
            </div>
            {videoOff && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Camera off</p>}
          </div>
        </div>
      )}
      {/* Muted badge */}
      {(audioOff || (isLocal && muted)) && (
        <div className="absolute top-2 right-2 p-1.5 rounded-full"
          style={{ background: 'rgba(220,38,38,0.85)', color: '#fff', lineHeight: 0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
            <path d="M17 16.95A7 7 0 015 10v-1m14 0v1a7 7 0 01-.11 1.23"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
            <line x1="8" y1="22" x2="16" y2="22"/>
          </svg>
        </div>
      )}
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium"
        style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
        {name}{isLocal ? ' (You)' : ''} • {role}
      </div>
    </div>
  );
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ messages, onSend, onFileUpload, sessionId, myName }) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendText(e) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { fileUrl, fileName } = await api.uploadFile(sessionId, file);
      onFileUpload(fileUrl, fileName);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const BG        = '#16161f';
  const BG2       = '#1e1e2c';
  const BORDER    = 'rgba(245,158,11,0.18)';
  const AMBER     = '#f59e0b';
  const ME_BG     = 'linear-gradient(135deg,#f59e0b,#d97706)';
  const THEM_BG   = '#252535';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background: BG, borderLeft:`1px solid ${BORDER}` }}>

      {/* Header */}
      <div style={{ padding:'14px 16px', borderBottom:`1px solid ${BORDER}`, background: BG2, display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 6px #22c55e' }} />
        <span style={{ fontWeight:700, fontSize:'13px', color:'#fff', letterSpacing:'0.02em' }}>Live Chat</span>
        <span style={{ marginLeft:'auto', fontSize:'11px', color:'rgba(255,255,255,0.35)', background:'rgba(255,255,255,0.07)', padding:'2px 8px', borderRadius:'999px' }}>
          {messages.length} msg{messages.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px 10px', minHeight:0, display:'flex', flexDirection:'column', gap:'10px' }}>
        {messages.length === 0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'12px' }}>
            <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(245,158,11,0.1)', border:`1px solid rgba(245,158,11,0.25)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={AMBER} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <div style={{ textAlign:'center' }}>
              <p style={{ color:'rgba(255,255,255,0.55)', fontSize:'13px', fontWeight:600, marginBottom:4 }}>No messages yet</p>
              <p style={{ color:'rgba(255,255,255,0.25)', fontSize:'11px' }}>Start the conversation</p>
            </div>
          </div>
        ) : messages.map((m, i) => {
          const isMe = m.senderName === myName;
          const initials = (m.senderName || '?').charAt(0).toUpperCase();
          const time = m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : '';
          return (
            <div key={m.id || i} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap:'3px' }}>
              {/* Sender + time */}
              <div style={{ display:'flex', alignItems:'center', gap:'5px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background: isMe ? AMBER : '#334155', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, color:'#fff', flexShrink:0 }}>
                  {initials}
                </div>
                <span style={{ fontSize:'10px', color:'rgba(255,255,255,0.35)' }}>
                  {isMe ? 'You' : m.senderName}
                  {time ? ` · ${time}` : ''}
                </span>
              </div>

              {/* Bubble */}
              {m.messageType === 'file' ? (
                <a href={m.fileUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:'6px', padding:'8px 12px', borderRadius: isMe ? '14px 4px 14px 14px' : '4px 14px 14px 14px', background: isMe ? ME_BG : THEM_BG, color:'#fff', fontSize:'12px', textDecoration:'none', maxWidth:'82%', border:`1px solid ${isMe ? 'transparent' : 'rgba(255,255,255,0.08)'}` }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                  {m.fileName || m.content}
                </a>
              ) : (
                <div style={{ padding:'8px 12px', borderRadius: isMe ? '14px 4px 14px 14px' : '4px 14px 14px 14px', background: isMe ? ME_BG : THEM_BG, color:'#fff', fontSize:'13px', maxWidth:'82%', wordBreak:'break-word', lineHeight:1.45, border:`1px solid ${isMe ? 'transparent' : 'rgba(255,255,255,0.08)'}`, boxShadow: isMe ? '0 2px 12px rgba(245,158,11,0.25)' : 'none' }}>
                  {m.content}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendText} style={{ padding:'10px', borderTop:`1px solid ${BORDER}`, background: BG2, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', background:'rgba(255,255,255,0.06)', borderRadius:'12px', border:`1.5px solid ${focused ? AMBER : 'rgba(255,255,255,0.1)'}`, padding:'6px 6px 6px 12px', transition:'border-color 0.2s' }}>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Type a message…"
            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'#fff', fontSize:'13px', minWidth:0 }}
          />
          <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleFile}
            accept="image/*,.pdf,.doc,.docx,.txt,.zip" />
          {/* Attach */}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            title="Attach file"
            style={{ width:30, height:30, borderRadius:'8px', background:'rgba(255,255,255,0.08)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.5)', flexShrink:0, transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.08)'}>
            {uploading
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            }
          </button>
          {/* Send */}
          <button type="submit" disabled={!text.trim()}
            style={{ width:32, height:32, borderRadius:'9px', background: text.trim() ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'rgba(255,255,255,0.06)', border:'none', cursor: text.trim() ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', flexShrink:0, transition:'all 0.2s', boxShadow: text.trim() ? '0 2px 10px rgba(245,158,11,0.4)' : 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main CallRoom ────────────────────────────────────────────────────────────
export default function CallRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Identity
  const agentUser = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
  const customerJoin = (() => { try { return JSON.parse(sessionStorage.getItem('customer-join') || 'null'); } catch { return null; } })();

  // customerJoin (sessionStorage) always wins — prevents localStorage agent token
  // from leaking into a customer tab on the same browser
  const myName = customerJoin?.name || agentUser?.name || 'Unknown';
  const myRole = customerJoin ? 'customer' : (agentUser?.role || 'customer');
  const isAgent = !customerJoin && (myRole === 'agent' || myRole === 'admin');
  const inviteToken = customerJoin?.inviteToken;

  // State
  const [status, setStatus] = useState('connecting'); // connecting | in-call | ended | error
  const [errorMsg, setErrorMsg] = useState('');
  const [peers, setPeers] = useState([]); // [{ peerId, name, role, streams: { audio: MediaStream, video: MediaStream }, audioOff, videoOff }]
  const [localStream, setLocalStream] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState(null); // null | 'recording' | 'processing' | 'ready'
  const [callDuration, setCallDuration] = useState(0);

  const sfuRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const callStartRef = useRef(null);
  const durationRef = useRef(null);

  // Peer stream management
  const peerStreamsRef = useRef(new Map()); // peerId -> { audioStream, videoStream }

  const updatePeerStream = useCallback((peerId, peerName, peerRole, kind, track) => {
    setPeers(prev => {
      const existing = prev.find(p => p.peerId === peerId);
      if (existing) {
        const updated = { ...existing };
        if (!updated.stream) updated.stream = new MediaStream();
        updated.stream.addTrack(track);
        if (kind === 'audio') updated.audioOff = false;
        return prev.map(p => p.peerId === peerId ? updated : p);
      } else {
        const stream = new MediaStream();
        stream.addTrack(track);
        return [...prev, {
          peerId,
          name: peerName,
          role: peerRole,
          stream,
          audioOff: kind !== 'audio',
          videoOff: kind !== 'video',
        }];
      }
    });
  }, []);

  // ─── Setup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    if (!agentUser && !customerJoin) {
      navigate('/login');
      return;
    }

    let socket;
    let sfu;
    let cleanedUp = false;

    async function setup() {
      try {
        // Get local media
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (cleanedUp) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Connect socket
        socket = getSocket();
        socketRef.current = socket;

        // Join room
        const authToken = agentUser ? localStorage.getItem('token') : null;
        const joinRes = await emitAsync(socket, 'join-room', {
          sessionId,
          authToken,
          inviteToken,
          name: myName,
        });

        if (cleanedUp) return;

        // Init SFU
        sfu = new SFUClient(socket, sessionId);
        sfuRef.current = sfu;
        await sfu.initialize(joinRes.routerRtpCapabilities);

        // Create transports
        await sfu.createSendTransport();
        await sfu.createRecvTransport();

        // Produce local tracks
        for (const track of stream.getTracks()) {
          await sfu.produceTrack(track);
        }

        // Consume existing remote producers
        for (const prod of joinRes.existingProducers || []) {
          await sfu.consumeProducer(prod.producerId, prod.peerId, prod.peerName, prod.peerRole, prod.kind)
            .then(consumer => {
              updatePeerStream(prod.peerId, prod.peerName, prod.peerRole, prod.kind, consumer.track);
            })
            .catch(console.error);
        }

        // Socket event listeners
        socket.on('peer-joined', ({ peerId, name, role }) => {
          console.log('[CallRoom] Peer joined:', name);
        });

        socket.on('peer-left', ({ peerId }) => {
          setPeers(prev => {
            const leaving = prev.find(p => p.peerId === peerId);
            if (leaving?.stream) leaving.stream.getTracks().forEach(t => t.stop());
            return prev.filter(p => p.peerId !== peerId);
          });
        });

        socket.on('new-producer', async ({ producerId, peerId, peerName, peerRole, kind }) => {
          try {
            const consumer = await sfu.consumeProducer(producerId, peerId, peerName, peerRole, kind);
            updatePeerStream(peerId, peerName, peerRole, kind, consumer.track);
          } catch (err) {
            console.error('[CallRoom] Failed to consume new producer:', err);
          }
        });

        socket.on('consumer-closed', ({ producerId }) => {
          // Track closed by remote peer
        });

        socket.on('producer-state-changed', ({ peerId, kind, paused }) => {
          setPeers(prev => prev.map(p => {
            if (p.peerId !== peerId) return p;
            return {
              ...p,
              audioOff: kind === 'audio' ? paused : p.audioOff,
              videoOff: kind === 'video' ? paused : p.videoOff,
            };
          }));
        });

        socket.on('new-message', (msg) => {
          setMessages(prev => [...prev, msg]);
        });

        socket.on('session-ended', ({ by }) => {
          setStatus('ended');
          setErrorMsg(`Session ended by ${by}`);
          cleanup();
        });

        setStatus('in-call');
        callStartRef.current = Date.now();
        durationRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
        }, 1000);

      } catch (err) {
        if (!cleanedUp) {
          console.error('[CallRoom] Setup error:', err);
          setStatus('error');
          setErrorMsg(err.message);
        }
      }
    }

    function cleanup() {
      cleanedUp = true;
      if (durationRef.current) clearInterval(durationRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (sfuRef.current) sfuRef.current.close();
      if (socketRef.current) {
        socketRef.current.off('peer-joined');
        socketRef.current.off('peer-left');
        socketRef.current.off('new-producer');
        socketRef.current.off('consumer-closed');
        socketRef.current.off('producer-state-changed');
        socketRef.current.off('new-message');
        socketRef.current.off('session-ended');
      }
      disconnectSocket();
    }

    setup();
    return cleanup;
  }, [sessionId]);

  // ─── Controls ─────────────────────────────────────────────────────────────
  async function toggleAudio() {
    const newMuted = !audioMuted;
    setAudioMuted(newMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
    }
    await sfuRef.current?.toggleAudio(newMuted);
  }

  async function toggleVideo() {
    const newOff = !videoOff;
    setVideoOff(newOff);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !newOff; });
    }
    await sfuRef.current?.toggleVideo(newOff);
  }

  async function handleEndOrLeave() {
    if (!confirm('Do you want to end the session?')) return;
    try {
      await emitAsync(socketRef.current, 'end-session', { sessionId });
    } catch {}
    navigate(isAgent ? '/dashboard' : '/');
  }

  function sendMessage(text) {
    if (!socketRef.current) return;
    socketRef.current.emit('send-message', {
      sessionId,
      content: text,
      messageType: 'text',
    }, () => {});
  }

  function sendFileMessage(fileUrl, fileName) {
    if (!socketRef.current) return;
    socketRef.current.emit('send-message', {
      sessionId,
      content: fileName,
      messageType: 'file',
      fileUrl,
      fileName,
    }, () => {});
  }

  // ─── Recording ────────────────────────────────────────────────────────────
  async function startRecording() {
    if (!localStreamRef.current) return;

    const allTracks = [...localStreamRef.current.getTracks()];
    peers.forEach(p => {
      if (p.stream) p.stream.getTracks().forEach(t => allTracks.push(t));
    });

    const combinedStream = new MediaStream(allTracks);
    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm;codecs=vp8,opus' });
    recordingChunksRef.current = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) recordingChunksRef.current.push(e.data);
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setRecording(true);
    setRecordingStatus('recording');
  }

  async function stopRecording() {
    if (!mediaRecorderRef.current) return;
    setRecordingStatus('processing');
    setRecording(false);

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
      try {
        await api.uploadRecording(sessionId, blob);
        setRecordingStatus('ready');
      } catch (err) {
        console.error('Recording upload failed:', err);
        setRecordingStatus(null);
      }
    };

    mediaRecorderRef.current.stop();
  }

  // ─── Duration format ──────────────────────────────────────────────────────
  function formatDur(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  // ─── Render states ─────────────────────────────────────────────────────────
  if (status === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#1a0f00 0%,#2c1a00 50%,#0f1a00 100%)' }}>
        <div className="text-center scale-in">
          <div className="float inline-block text-5xl mb-5">⚡</div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="spin inline-block w-5 h-5 border-2 rounded-full"
              style={{ borderColor: 'rgba(124,92,252,0.2)', borderTopColor: '#7c5cfc' }} />
            <p className="text-lg font-bold" style={{ color: 'var(--text)' }}>Connecting to session…</p>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Setting up encrypted video channel</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'linear-gradient(135deg,#fff1f2 0%,#f7f5f0 60%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', opacity:0.04, backgroundImage:'radial-gradient(circle,#d97706 1px,transparent 1px)', backgroundSize:'34px 34px' }} />
        <div className="text-center scale-in" style={{ maxWidth: 400, width: '100%', position: 'relative', zIndex: 1 }}>
          <div className="float inline-block mb-6">
            <div style={{ width: 88, height: 88, borderRadius: '24px', background: 'linear-gradient(145deg,#ef4444,#dc2626)', boxShadow: '0 16px 48px rgba(220,38,38,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
          </div>
          <h1 className="font-black mb-3" style={{ fontSize: '28px', color: '#1c1917' }}>Connection Failed</h1>
          <p style={{ color: '#78716c', fontSize: '14px', marginBottom: '28px' }}>{errorMsg}</p>
          <button onClick={() => navigate(isAgent ? '/dashboard' : '/')}
            className="w-full rounded-2xl font-bold btn-shine"
            style={{ padding: '14px', fontSize: '15px', background: 'linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)', color: '#fff', border: 'none', boxShadow: '0 8px 28px rgba(245,158,11,0.45)', cursor: 'pointer' }}>
            Go Back →
          </button>
        </div>
      </div>
    );
  }

  if (status === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 page-enter"
        style={{ background: 'linear-gradient(135deg,#fffbeb 0%,#f7f5f0 55%,#fef9ee 100%)', position: 'relative', overflow: 'hidden' }}>

        {/* Ambient blobs */}
        <div style={{ position:'fixed', top:'4%', right:'6%', width:420, height:420, borderRadius:'50%', background:'radial-gradient(circle,#fde68a50 0%,transparent 65%)', pointerEvents:'none', filter:'blur(55px)' }} />
        <div style={{ position:'fixed', bottom:'5%', left:'3%', width:340, height:340, borderRadius:'50%', background:'radial-gradient(circle,#bbf7d040 0%,transparent 65%)', pointerEvents:'none', filter:'blur(50px)' }} />
        <div style={{ position:'fixed', inset:0, pointerEvents:'none', opacity:0.045, backgroundImage:'radial-gradient(circle,#d97706 1px,transparent 1px)', backgroundSize:'34px 34px' }} />

        <div className="text-center scale-in" style={{ maxWidth: 420, width: '100%', position: 'relative', zIndex: 1 }}>

          {/* Icon */}
          <div className="float inline-block mb-6">
            <div style={{ width: 96, height: 96, borderRadius: '28px', background: 'linear-gradient(145deg,#22c55e,#16a34a)', boxShadow: '0 20px 56px rgba(34,197,94,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </div>

          {/* Text */}
          <h1 className="font-black mb-3" style={{ fontSize: '32px', background: 'linear-gradient(135deg,#1c1917 15%,#16a34a 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Session Ended
          </h1>
          <p style={{ color: '#78716c', fontSize: '15px', marginBottom: '36px' }}>
            {errorMsg || 'The support session has concluded.'}
          </p>

          {/* Card */}
          <div className="slide-up" style={{ background: '#fff', border: '1.5px solid #fde68a', borderTop: '5px solid #f59e0b', borderRadius: '24px', padding: '28px 32px', boxShadow: '0 24px 64px rgba(0,0,0,0.09)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '8px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#b45309', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AtomQuest Hackathon 1.0</span>
            </div>
            <p style={{ fontSize: '13px', color: '#a8a29e' }}>Thank you for using Atomberg Video Support</p>
          </div>

          {/* Buttons */}
          {isAgent ? (
            <button onClick={() => navigate('/dashboard')}
              className="w-full rounded-2xl font-bold btn-shine"
              style={{ padding: '15px', fontSize: '15px', background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 45%,#d97706 100%)', color: '#fff', border: 'none', boxShadow: '0 8px 28px rgba(245,158,11,0.5)', cursor: 'pointer', letterSpacing: '0.02em' }}>
              Back to Dashboard →
            </button>
          ) : (
            <button onClick={() => navigate('/')}
              className="w-full rounded-2xl font-bold btn-shine"
              style={{ padding: '15px', fontSize: '15px', background: 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 45%,#d97706 100%)', color: '#fff', border: 'none', boxShadow: '0 8px 28px rgba(245,158,11,0.5)', cursor: 'pointer', letterSpacing: '0.02em' }}>
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── In-Call UI ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen" style={{ background: '#0f0f12' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between shrink-0"
        style={{ background: 'rgba(22,13,0,0.97)', borderBottom: '1px solid rgba(245,158,11,0.2)', backdropFilter: 'blur(16px)', minHeight: '56px', padding: '0 16px' }}>

        {/* Left — branding + timer + status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span style={{ color: '#4ade80', display:'flex' }}><IconLive /></span>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff', letterSpacing: '0.01em' }}>Atomberg Support</span>
          </div>
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
          <span className="glow-pulse" style={{ fontSize: '12px', fontWeight: 700, color: '#4ade80', background: '#052e16', border: '1px solid #16a34a44', padding: '3px 10px', borderRadius: '999px', fontVariantNumeric: 'tabular-nums' }}>
            ● {formatDur(callDuration)}
          </span>
          {recordingStatus === 'recording' && (
            <span className="rec-indicator flex items-center gap-1" style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', background: '#450a0a', padding: '3px 8px', borderRadius: '6px' }}>
              ● REC
            </span>
          )}
          {recordingStatus === 'processing' && (
            <span style={{ fontSize: '11px', color: '#fbbf24', background: '#422006', padding: '3px 8px', borderRadius: '6px' }}>
              ⏳ Processing…
            </span>
          )}
          {recordingStatus === 'ready' && (
            <span style={{ fontSize: '11px', color: '#4ade80', background: '#052e16', padding: '3px 8px', borderRadius: '6px' }}>
              ✓ Saved
            </span>
          )}
        </div>

        {/* Right — participants + big chat button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
            {peers.length + 1} participant{peers.length + 1 !== 1 ? 's' : ''}
          </div>
          <button onClick={() => setChatOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '9px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              color: '#fff',
              background: chatOpen
                ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                : 'rgba(255,255,255,0.09)',
              border: `1.5px solid ${chatOpen ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
              boxShadow: chatOpen ? '0 4px 16px rgba(245,158,11,0.4)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!chatOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { if (!chatOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}>
            <IconChat />
            {chatOpen ? 'Hide Chat' : 'Show Chat'}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Video area */}
        <div className="flex-1 flex flex-col p-2 gap-2 min-w-0">
          {/* Video grid — two equal horizontal halves */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', gap: '8px', minHeight: 0 }}>

            {/* LEFT HALF — remote participant or waiting */}
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              {peers.length > 0 ? peers.map(p => (
                <div key={p.peerId} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                  <VideoTile
                    stream={p.stream}
                    name={p.name}
                    role={p.role}
                    videoOff={p.videoOff}
                    audioOff={p.audioOff}
                  />
                </div>
              )) : (
                <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(245,158,11,0.3)', borderRadius: '16px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px' }}>
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}>Waiting for customer to join…</p>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT HALF — your own video */}
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                <VideoTile
                  stream={localStream}
                  name={myName}
                  role={myRole}
                  muted={true}
                  isLocal={true}
                  videoOff={videoOff}
                  audioOff={audioMuted}
                />
              </div>
            </div>

          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 py-3">
            {/* Mute */}
            <div className="flex flex-col items-center gap-1">
              <button onClick={toggleAudio}
                title={audioMuted ? 'Unmute microphone' : 'Mute microphone'}
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: audioMuted ? '#dc2626' : 'rgba(255,255,255,0.12)',
                  border: `2px solid ${audioMuted ? '#dc2626' : 'rgba(255,255,255,0.18)'}`,
                  color: '#fff',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s',
                }}>
                {audioMuted ? <IconMicOff /> : <IconMic />}
              </button>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>{audioMuted ? 'Unmute' : 'Mute'}</span>
            </div>

            {/* Camera */}
            <div className="flex flex-col items-center gap-1">
              <button onClick={toggleVideo}
                title={videoOff ? 'Turn on camera' : 'Turn off camera'}
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: videoOff ? '#dc2626' : 'rgba(255,255,255,0.12)',
                  border: `2px solid ${videoOff ? '#dc2626' : 'rgba(255,255,255,0.18)'}`,
                  color: '#fff',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s',
                }}>
                {videoOff ? <IconCameraOff /> : <IconCamera />}
              </button>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>{videoOff ? 'Cam On' : 'Cam Off'}</span>
            </div>

            {/* Recording (agent only) */}
            {isAgent && (
              <div className="flex flex-col items-center gap-1">
                <button onClick={recording ? stopRecording : startRecording}
                  title={recording ? 'Stop recording' : 'Start recording'}
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: recording ? '#f59e0b' : 'rgba(255,255,255,0.12)',
                    border: `2px solid ${recording ? '#f59e0b' : 'rgba(255,255,255,0.18)'}`,
                    color: recording ? '#fff' : '#fff',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.2s',
                  }}>
                  {recording ? <IconStop /> : <IconRecord />}
                </button>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>{recording ? 'Stop Rec' : 'Record'}</span>
              </div>
            )}

            {/* End / Leave */}
            <div className="flex flex-col items-center gap-1">
              <button onClick={handleEndOrLeave}
                title={isAgent ? 'End session for everyone' : 'Leave call'}
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
                  border: '2px solid #ef4444',
                  color: '#fff',
                  boxShadow: '0 4px 16px #dc262655',
                  transition: 'all 0.2s',
                }}>
                <IconEndCall />
              </button>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px' }}>{isAgent ? 'End Call' : 'Leave'}</span>
            </div>
          </div>
        </div>

        {/* Chat panel — full height vertical column */}
        {chatOpen && (
          <div className="w-72 shrink-0 flex flex-col min-h-0">
            <ChatPanel
              messages={messages}
              onSend={sendMessage}
              onFileUpload={sendFileMessage}
              sessionId={sessionId}
              myName={myName}
            />
          </div>
        )}
      </div>
    </div>
  );
}
