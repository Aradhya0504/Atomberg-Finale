import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const TAGLINES = [
  'Real-time video support. Owned by you.',
  'Powered by mediasoup SFU — zero P2P.',
  'No third-party SDKs. 100% your server.',
  'Built for AtomQuest Hackathon 1.0.',
];

function FloatingField({ label, type, value, onChange, autoComplete, icon, required, autoFocus }) {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd]  = useState(false);
  const isUp  = focused || value.length > 0;
  const isPwd = type === 'password';

  return (
    <div style={{ position:'relative', paddingTop:'20px' }}>
      {/* Floating label */}
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
        {label}
      </label>

      {/* Input wrapper */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        border: `1.5px solid ${focused ? '#f59e0b' : '#e5e2dd'}`,
        borderRadius: '14px',
        background: focused ? '#ffffff' : '#f7f5f0',
        boxShadow: focused ? '0 0 0 4px #f59e0b14' : 'none',
        transition: 'all 0.22s ease',
      }}>
        {/* Icon */}
        <span style={{
          paddingLeft: '14px',
          fontSize: '17px',
          color: focused ? '#f59e0b' : '#c4b9ae',
          transition: 'color 0.22s',
          flexShrink: 0,
          userSelect: 'none',
        }}>
          {icon}
        </span>

        <input
          autoFocus={autoFocus}
          type={isPwd && showPwd ? 'text' : type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          required={required}
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

        {/* Password toggle */}
        {isPwd && (
          <button type="button" onClick={() => setShowPwd(v => !v)}
            style={{ paddingRight:'14px', background:'none', border:'none', cursor:'pointer', flexShrink:0, lineHeight:1, display:'flex', alignItems:'center' }}>
            {showPwd ? (
              /* doodle closed eye */
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              /* doodle open eye */
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [tagIdx, setTagIdx]       = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [typing, setTyping]       = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const target = TAGLINES[tagIdx];
    let i = 0; setDisplayed(''); setTyping(true);
    const t = setInterval(() => {
      i++; setDisplayed(target.slice(0, i));
      if (i >= target.length) {
        clearInterval(t);
        setTyping(false);
        setTimeout(() => setTagIdx(x => (x + 1) % TAGLINES.length), 2500);
      }
    }, 38);
    return () => clearInterval(t);
  }, [tagIdx]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { token, user } = await api.login(email, password);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 page-enter"
      style={{ background:'linear-gradient(135deg,#fffbeb 0%,#f7f5f0 55%,#fef9ee 100%)', overflow:'hidden', position:'relative' }}>

      {/* Ambient blobs */}
      <div className="blob1" style={{ position:'fixed', top:'4%', right:'6%', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,#fde68a50 0%,transparent 65%)', pointerEvents:'none', filter:'blur(55px)' }} />
      <div className="blob2" style={{ position:'fixed', bottom:'5%', left:'3%', width:380, height:380, borderRadius:'50%', background:'radial-gradient(circle,#bbf7d045 0%,transparent 65%)', pointerEvents:'none', filter:'blur(50px)' }} />
      <div className="blob3" style={{ position:'fixed', top:'40%', left:'20%', width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,#fde68a30 0%,transparent 70%)', pointerEvents:'none', filter:'blur(40px)' }} />

      {/* Dot grid overlay */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', opacity:0.055, backgroundImage:'radial-gradient(circle,#d97706 1px,transparent 1px)', backgroundSize:'34px 34px' }} />

      <div className="w-full max-w-md relative z-10 scale-in">

        {/* Logo + title */}
        <div className="text-center mb-10">
          <div className="float inline-block mb-5">
            <div className="relative inline-flex items-center justify-center w-28 h-28 rounded-[28px]"
              style={{ background:'linear-gradient(145deg,#fbbf24,#f59e0b,#d97706)', boxShadow:'0 20px 56px #f59e0b60', overflow:'hidden' }}>
              <svg width="62" height="62" viewBox="0 0 62 62" fill="none" style={{ display:'block' }}>
                {/* nucleus */}
                <circle cx="31" cy="31" r="4.5" fill="white" />
                {/* orbit 1 — horizontal */}
                <ellipse cx="31" cy="31" rx="26" ry="9" stroke="white" strokeWidth="2.2" strokeOpacity="0.9" fill="none" />
                {/* orbit 2 — rotated 60° */}
                <ellipse cx="31" cy="31" rx="26" ry="9" stroke="white" strokeWidth="2.2" strokeOpacity="0.75" fill="none"
                  transform="rotate(60 31 31)" />
                {/* orbit 3 — rotated 120° */}
                <ellipse cx="31" cy="31" rx="26" ry="9" stroke="white" strokeWidth="2.2" strokeOpacity="0.6" fill="none"
                  transform="rotate(120 31 31)" />
              </svg>
              <div className="absolute inset-0 rounded-[28px] yellow-glow" />
            </div>
          </div>

          <h1 className="text-4xl font-black mb-3 tracking-tight"
            style={{ background:'linear-gradient(135deg,#1c1917 15%,#d97706 90%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            Atomberg Support
          </h1>

          <div className="h-6 flex items-center justify-center">
            <p className="text-sm font-medium" style={{ color:'#78716c' }}>
              {displayed}
              <span className="cursor-blink inline-block w-0.5 h-4 ml-0.5 rounded-full align-middle"
                style={{ background:'#f59e0b', opacity: typing ? 1 : 0 }} />
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl slide-up"
          style={{
            background: '#fff',
            border: '1.5px solid #fde68a',
            borderTop: '5px solid #f59e0b',
            boxShadow: '0 32px 80px rgba(0,0,0,0.1), 0 8px 24px rgba(245,158,11,0.1)',
            padding: '36px 40px 40px',
          }}>

          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-1 h-7 rounded-full flex-shrink-0"
              style={{ background:'linear-gradient(180deg,#f59e0b,#d97706)' }} />
            <h2 className="text-xl font-black" style={{ color:'#1c1917' }}>Agent Sign In</h2>
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background:'#fef9c3', color:'#b45309', border:'1px solid #fde68a' }}>
              Secure
            </span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <FloatingField
                label="Email Address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                icon="✉️"
                required
                autoFocus
              />
              <FloatingField
                label="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                icon="🔒"
                required
              />
            </div>

            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl text-sm scale-in flex items-center gap-2"
                style={{ background:'#fef2f2', color:'#b91c1c', border:'1px solid #fecaca' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-2xl font-bold btn-shine"
              style={{
                marginTop: '28px',
                padding: '16px',
                fontSize: '15px',
                letterSpacing: '0.03em',
                background: loading ? '#f0ede8' : 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 45%,#d97706 100%)',
                color: loading ? '#b0a898' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none',
                boxShadow: loading ? 'none' : '0 8px 28px #f59e0b55',
              }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="spin inline-block w-4 h-4 border-2 rounded-full"
                    style={{ borderColor:'rgba(255,255,255,0.3)', borderTopColor:'#fff' }} />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign In
                  <span style={{ fontSize:'16px' }}>→</span>
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color:'#c4b9ae' }}>
          AtomQuest Hackathon 1.0 · Grand Finale
        </p>
      </div>
    </div>
  );
}
