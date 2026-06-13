import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';

const AtomIcon = ({ size = 52 }) => (
  <svg width={size} height={size} viewBox="0 0 62 62" fill="none" style={{ display:'block' }}>
    <circle cx="31" cy="31" r="5" fill="white" />
    <ellipse cx="31" cy="31" rx="26" ry="9" stroke="white" strokeWidth="2.8" fill="none" strokeOpacity="0.95" />
    <ellipse cx="31" cy="31" rx="26" ry="9" stroke="white" strokeWidth="2.8" fill="none" strokeOpacity="0.75" transform="rotate(60 31 31)" />
    <ellipse cx="31" cy="31" rx="26" ry="9" stroke="white" strokeWidth="2.8" fill="none" strokeOpacity="0.55" transform="rotate(120 31 31)" />
  </svg>
);

function FloatingNameField({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  const isUp = focused || value.length > 0;

  return (
    <div style={{ position:'relative', paddingTop:'20px' }}>
      <label style={{
        position: 'absolute',
        left: '46px',
        top: isUp ? '2px' : '32px',
        fontSize: isUp ? '10px' : '14px',
        color: isUp ? '#d97706' : '#a8a29e',
        fontWeight: isUp ? 700 : 400,
        letterSpacing: isUp ? '0.08em' : '0',
        textTransform: isUp ? 'uppercase' : 'none',
        transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
        pointerEvents: 'none',
        zIndex: 1,
      }}>
        Your Full Name
      </label>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        border: `1.5px solid ${focused ? '#f59e0b' : '#e5e2dd'}`,
        borderRadius: '14px',
        background: focused ? '#ffffff' : '#f7f5f0',
        boxShadow: focused ? '0 0 0 4px #f59e0b14' : 'none',
        transition: 'all 0.22s ease',
      }}>
        <span style={{ paddingLeft:'14px', fontSize:'17px', color: focused ? '#f59e0b' : '#c4b9ae', transition:'color 0.22s', flexShrink:0 }}>
          👤
        </span>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required
          maxLength={50}
          style={{
            flex: 1,
            padding: '20px 12px 8px 10px',
            border: 'none',
            background: 'transparent',
            outline: 'none',
            color: '#1c1917',
            fontSize: '15px',
            fontFamily: 'inherit',
          }}
        />
      </div>
    </div>
  );
}

export default function CustomerJoin() {
  const [params]  = useSearchParams();
  const navigate  = useNavigate();
  const token     = params.get('token');

  const [sessionInfo, setSessionInfo] = useState(null);
  const [name, setName]               = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [joining, setJoining]         = useState(false);

  useEffect(() => {
    if (!token) { setError('No invite token found. Ask your agent for a valid link.'); setLoading(false); return; }
    const timeout = setTimeout(() => { setError('Connection timed out. Make sure you are on the same network and try again.'); setLoading(false); }, 8000);
    api.validateInvite(token)
      .then(info => { clearTimeout(timeout); setSessionInfo(info); setLoading(false); })
      .catch(err  => { clearTimeout(timeout); setError(err.message || 'Invalid or expired invite link.'); setLoading(false); });
    return () => clearTimeout(timeout);
  }, [token]);

  function join(e) {
    e.preventDefault();
    if (!name.trim() || !sessionInfo) return;
    setJoining(true);
    sessionStorage.setItem('customer-join', JSON.stringify({
      sessionId: sessionInfo.sessionId, inviteToken: token, name: name.trim(), role: 'customer'
    }));
    navigate(`/call/${sessionInfo.sessionId}`);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background:'linear-gradient(135deg,#fffbeb 0%,#f7f5f0 60%)' }}>
      <div className="text-center scale-in">
        <div className="float inline-block mb-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl"
            style={{ background:'linear-gradient(145deg,#fbbf24,#f59e0b,#d97706)', boxShadow:'0 16px 40px #f59e0b55' }}>
            <AtomIcon size={44} />
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="spin inline-block w-5 h-5 border-2 rounded-full"
            style={{ borderColor:'rgba(245,158,11,0.2)', borderTopColor:'#f59e0b' }} />
          <p className="font-medium" style={{ color:'#78716c' }}>Validating invite…</p>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background:'linear-gradient(135deg,#fff1f2 0%,#f7f5f0 60%)' }}>
      <div className="text-center max-w-md p-8 rounded-2xl scale-in"
        style={{ background:'#fff', border:'1.5px solid #fecaca', borderTop:'4px solid #dc2626', boxShadow:'0 24px 64px rgba(0,0,0,0.1)' }}>
        <div className="float inline-block text-5xl mb-4">⚠️</div>
        <h2 className="text-lg font-bold mb-2" style={{ color:'#1c1917' }}>Cannot Join Session</h2>
        <p className="text-sm" style={{ color:'#78716c' }}>{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 page-enter"
      style={{ background:'linear-gradient(135deg,#fffbeb 0%,#f7f5f0 55%,#fef9ee 100%)', overflow:'hidden', position:'relative' }}>

      {/* Ambient blobs */}
      <div className="blob1" style={{ position:'fixed', top:'4%', right:'6%', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,#fde68a50 0%,transparent 65%)', pointerEvents:'none', filter:'blur(55px)' }} />
      <div className="blob2" style={{ position:'fixed', bottom:'5%', left:'3%', width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,#bbf7d045 0%,transparent 65%)', pointerEvents:'none', filter:'blur(50px)' }} />
      <div className="blob3" style={{ position:'fixed', top:'40%', left:'20%', width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,#fde68a30 0%,transparent 70%)', pointerEvents:'none', filter:'blur(40px)' }} />

      {/* Dot grid */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', opacity:0.055, backgroundImage:'radial-gradient(circle,#d97706 1px,transparent 1px)', backgroundSize:'34px 34px' }} />

      <div className="w-full max-w-md relative z-10 scale-in">

        {/* Logo + title */}
        <div className="text-center mb-10">
          <div className="float inline-block mb-5">
            <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-[28px]"
              style={{ background:'linear-gradient(145deg,#fbbf24,#f59e0b,#d97706)', boxShadow:'0 20px 56px #f59e0b60', overflow:'hidden' }}>
              <AtomIcon size={62} />
              <div className="absolute inset-0 rounded-[28px] yellow-glow" />
            </div>
          </div>
          <h1 className="text-4xl font-black mb-3 tracking-tight"
            style={{ background:'linear-gradient(135deg,#1c1917 15%,#d97706 90%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Join Support Call
          </h1>
          <p className="text-sm font-medium" style={{ color:'#78716c' }}>Atomberg Video Support</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl slide-up"
          style={{
            background: '#fff',
            border: '1.5px solid #fde68a',
            borderTop: '5px solid #f59e0b',
            boxShadow: '0 32px 80px rgba(0,0,0,0.1), 0 8px 24px rgba(245,158,11,0.1)',
            padding: '32px 40px 36px',
          }}>

          {/* Live session banner */}
          <div className="mb-6 p-4 rounded-2xl"
            style={{ background:'#f0fdf4', border:'1.5px solid #bbf7d0' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full status-blink flex-shrink-0" style={{ background:'#22c55e' }} />
              <p className="text-xs font-black uppercase tracking-widest" style={{ color:'#16a34a' }}>Live Session</p>
            </div>
            <p className="font-black text-base mb-0.5" style={{ color:'#1c1917' }}>{sessionInfo.title}</p>
            <p className="text-sm" style={{ color:'#78716c' }}>
              with <strong style={{ color:'#d97706' }}>{sessionInfo.agentName}</strong>
            </p>
          </div>

          <form onSubmit={join}>
            <FloatingNameField value={name} onChange={e => setName(e.target.value)} />

            <button type="submit" disabled={joining || !name.trim()}
              className="w-full rounded-2xl font-bold btn-shine"
              style={{
                marginTop: '24px',
                padding: '16px',
                fontSize: '15px',
                letterSpacing: '0.03em',
                background: joining || !name.trim() ? '#f0ede8' : 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 45%,#d97706 100%)',
                color: joining || !name.trim() ? '#b0a898' : '#fff',
                cursor: joining || !name.trim() ? 'not-allowed' : 'pointer',
                border: 'none',
                boxShadow: joining || !name.trim() ? 'none' : '0 8px 28px #f59e0b55',
              }}>
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spin inline-block w-4 h-4 border-2 rounded-full"
                    style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'#fff' }} />
                  Joining call…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Join Call <span style={{ fontSize:'16px' }}>→</span>
                </span>
              )}
            </button>
          </form>

          <p className="text-xs text-center mt-4" style={{ color:'#c4b9ae' }}>
            🎥 Camera &amp; microphone access required
          </p>
        </div>
      </div>
    </div>
  );
}
