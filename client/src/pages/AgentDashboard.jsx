import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

function formatDuration(ms) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}
function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

const STATUS_CFG = {
  active:  { bg:'#dcfce7', color:'#15803d', dot:'#16a34a', label:'Active',  border:'#16a34a' },
  waiting: { bg:'#fef9c3', color:'#b45309', dot:'#f59e0b', label:'Waiting', border:'#f59e0b' },
  ended:   { bg:'#f1f5f9', color:'#475569', dot:'#94a3b8', label:'Ended',   border:'#cbd5e1' },
};

const AtomIcon = ({ size = 18, strokeWidth = 3 }) => (
  <svg width={size} height={size} viewBox="0 0 62 62" fill="none" style={{ display:'block' }}>
    <circle cx="31" cy="31" r="5" fill="white" />
    <ellipse cx="31" cy="31" rx="26" ry="9" stroke="white" strokeWidth={strokeWidth} fill="none" strokeOpacity="0.95" />
    <ellipse cx="31" cy="31" rx="26" ry="9" stroke="white" strokeWidth={strokeWidth} fill="none" strokeOpacity="0.75" transform="rotate(60 31 31)" />
    <ellipse cx="31" cy="31" rx="26" ry="9" stroke="white" strokeWidth={strokeWidth} fill="none" strokeOpacity="0.55" transform="rotate(120 31 31)" />
  </svg>
);

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.ended;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
      style={{ background:c.bg, color:c.color, border:`1px solid ${c.dot}55` }}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'active' ? 'status-blink' : ''}`}
        style={{ background:c.dot }} />
      {c.label}
    </span>
  );
}

function CopyInviteBtn({ token }) {
  const [copied, setCopied] = useState(false);
  function copy(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/join?token=${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold btn-shine flex-shrink-0"
      style={{
        background: copied ? '#dcfce7' : '#fff',
        color: copied ? '#15803d' : '#b45309',
        border: `1px solid ${copied ? '#16a34a55' : '#fcd34d'}`,
        boxShadow: copied ? 'none' : '0 1px 6px rgba(245,158,11,0.15)',
        transition: 'all 0.25s',
        whiteSpace: 'nowrap',
      }}>
      {copied ? '✓ Copied' : '🔗 Invite'}
    </button>
  );
}

function StatCard({ icon, label, value, topColor, iconBg, textColor, delay, active, onClick }) {
  return (
    <div onClick={onClick}
      className={`p-5 rounded-2xl slide-up slide-up-${delay} cursor-pointer select-none`}
      style={{
        background: active ? `${topColor}10` : '#fff',
        border: `1.5px solid ${active ? topColor : '#f0ede8'}`,
        borderTop: `4px solid ${topColor}`,
        boxShadow: active ? `0 8px 28px ${topColor}22` : '0 2px 12px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 16px 40px ${topColor}28, 0 0 0 2px ${topColor}44`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = active ? `0 8px 28px ${topColor}22` : '0 2px 12px rgba(0,0,0,0.05)';
      }}>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background:iconBg }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-4xl font-black leading-none" style={{ color:textColor }}>{value}</p>
          <p className="text-xs font-medium mt-1" style={{ color:'#78716c' }}>{label}</p>
        </div>
        {active && (
          <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
            style={{ background: topColor, color:'#fff', fontSize:'9px', letterSpacing:'0.06em' }}>
            ON
          </span>
        )}
      </div>
      <p className="text-xs mt-3 font-medium" style={{ color: active ? topColor : '#c4b9ae' }}>
        {active ? 'filtering active ×' : 'tap to filter →'}
      </p>
    </div>
  );
}

export default function AgentDashboard() {
  const navigate  = useNavigate();
  const user      = JSON.parse(localStorage.getItem('user') || '{}');

  const [sessions, setSessions]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [newTitle, setNewTitle]     = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [copied, setCopied]         = useState(false);

  const fetchSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { const data = await api.getSessions(); setSessions(data); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchSessions();
    const iv = setInterval(() => fetchSessions(true), 10000);
    return () => clearInterval(iv);
  }, [fetchSessions]);

  async function manualRefresh() {
    setRefreshing(true);
    await fetchSessions(true);
    setTimeout(() => setRefreshing(false), 600);
  }

  async function createSession() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { session, inviteLink } = await api.createSession(newTitle.trim());
      setInviteInfo({ session, inviteLink });
      setShowCreate(false); setNewTitle('');
      fetchSessions(true);
    } catch (err) { alert(err.message); }
    finally { setCreating(false); }
  }

  function logout() { localStorage.clear(); navigate('/login'); }

  function toggleFilter(key) {
    setFilter(f => f === key ? 'all' : key);
  }

  const activeCt  = sessions.filter(s => s.status === 'active').length;
  const waitingCt = sessions.filter(s => s.status === 'waiting').length;
  const endedCt   = sessions.filter(s => s.status === 'ended').length;

  const filtered = sessions
    .filter(s => filter === 'all' || s.status === filter)
    .filter(s => !search.trim() || s.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-screen overflow-hidden flex flex-col page-enter" style={{ background:'#f7f5f0' }}>

      {/* ── Header ── */}
      <header className="shrink-0 z-20"
        style={{ background:'#fff', borderBottom:'1px solid #f0ede8', boxShadow:'0 1px 16px rgba(0,0,0,0.07)', padding:'0 40px', height:'72px', display:'flex', alignItems:'center', gap:'16px' }}>

        {/* Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow:'0 3px 12px #f59e0b44' }}>
            <AtomIcon size={20} strokeWidth={3} />
          </div>
          <div>
            <p className="font-black text-sm leading-tight" style={{ color:'#1c1917' }}>Atomberg Support</p>
            <p className="text-xs leading-tight" style={{ color:'#a8a29e' }}>Real-Time Video Support Platform</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold flex-shrink-0"
            style={{ background:'#fef9c3', color:'#b45309', border:'1px solid #fcd34d', fontSize:'10px', letterSpacing:'0.06em' }}>
            <span className="w-1.5 h-1.5 rounded-full status-blink" style={{ background:'#f59e0b' }} /> LIVE
          </span>
        </div>

        {/* Divider */}
        <div style={{ width:1, height:36, background:'#f0ede8', flexShrink:0 }} />

        {/* ── Stat chips (filter) ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {[
            { key:'active',  label:'Active Sessions', value:activeCt,  dot:'#16a34a', activeBg:'#dcfce7', activeColor:'#15803d', activeBorder:'#16a34a44' },
            { key:'waiting', label:'Waiting',          value:waitingCt, dot:'#f59e0b', activeBg:'#fef9c3', activeColor:'#b45309', activeBorder:'#f59e0b44' },
            { key:'ended',   label:'Completed',        value:endedCt,   dot:'#94a3b8', activeBg:'#f1f5f9', activeColor:'#475569', activeBorder:'#94a3b844' },
          ].map(c => {
            const on = filter === c.key;
            return (
              <button key={c.key} onClick={() => toggleFilter(c.key)}
                style={{
                  display:'flex', alignItems:'center', gap:'8px',
                  padding:'8px 16px', borderRadius:'12px', cursor:'pointer',
                  background: on ? c.activeBg : '#f7f5f0',
                  border: `1.5px solid ${on ? c.activeBorder : '#ede9e2'}`,
                  transition:'all 0.2s',
                }}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.key === 'active' && activeCt > 0 ? 'status-blink' : ''}`}
                  style={{ background: c.dot }} />
                <span style={{ fontSize:'22px', fontWeight:900, color: on ? c.activeColor : '#1c1917', lineHeight:1 }}>{c.value}</span>
                <span style={{ fontSize:'11px', fontWeight:600, color: on ? c.activeColor : '#78716c', whiteSpace:'nowrap' }}>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div style={{ flex:1 }} />

        {/* Search */}
        <div className="relative hidden md:block flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round"
            style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sessions…"
            style={{ paddingLeft:'34px', paddingRight:'12px', paddingTop:'8px', paddingBottom:'8px', border:'1.5px solid #e5e2dd', borderRadius:'10px', background:'#f7f5f0', color:'#1c1917', outline:'none', fontSize:'13px', width:'200px', transition:'border-color 0.2s, width 0.3s' }}
            onFocus={e => { e.target.style.borderColor='#f59e0b'; e.target.style.width='240px'; }}
            onBlur={e  => { e.target.style.borderColor='#e5e2dd'; e.target.style.width='200px'; }} />
        </div>

        {/* Refresh */}
        <button onClick={manualRefresh} title="Refresh"
          style={{ width:36, height:36, borderRadius:'10px', background:'#f7f5f0', border:'1.5px solid #e5e2dd', color:'#78716c', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            className={refreshing ? 'spin' : ''}>
            <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
        </button>

        {/* User pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
          style={{ background:'#f7f5f0', border:'1.5px solid #e5e2dd' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
            style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff' }}>
            {(user.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold" style={{ color:'#1c1917' }}>{user.name}</p>
            <p className="text-xs font-semibold capitalize" style={{ color:'#d97706' }}>{user.role}</p>
          </div>
        </div>

        {user.role === 'admin' && (
          <button onClick={() => navigate('/admin')} className="btn-shine flex-shrink-0"
            style={{ background:'#fff', color:'#b45309', border:'1.5px solid #fcd34d', fontWeight:700, fontSize:'13px', padding:'8px 16px', borderRadius:'10px', cursor:'pointer' }}>
            ⚙ Admin
          </button>
        )}

        {/* New Session — big prominent CTA */}
        <button onClick={() => setShowCreate(true)} className="btn-shine flex-shrink-0"
          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 22px', borderRadius:'12px', background:'linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)', color:'#fff', border:'none', fontWeight:800, fontSize:'14px', boxShadow:'0 6px 24px rgba(245,158,11,0.5)', cursor:'pointer', letterSpacing:'0.01em' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New Session
        </button>

        <button onClick={logout} className="btn-shine flex-shrink-0"
          onMouseEnter={e => { e.currentTarget.style.background='#fef2f2'; e.currentTarget.style.borderColor='#fca5a5'; e.currentTarget.style.color='#dc2626'; }}
          onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#e5e2dd'; e.currentTarget.style.color='#78716c'; }}
          style={{ background:'#fff', color:'#78716c', border:'1.5px solid #e5e2dd', fontWeight:700, fontSize:'13px', padding:'8px 16px', borderRadius:'10px', cursor:'pointer', transition:'all 0.2s' }}>
          Sign out
        </button>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col" style={{ padding:'32px 40px' }}>

        {/* ── Invite banner ── */}
        {inviteInfo && (
          <div className="mb-6 p-5 rounded-2xl scale-in"
            style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderLeft:'4px solid #16a34a', boxShadow:'0 4px 16px rgba(22,163,74,0.1)' }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color:'#15803d' }}>
                  <span className="w-2 h-2 rounded-full status-blink flex-shrink-0" style={{ background:'#22c55e' }} />
                  Session ready: {inviteInfo.session.title}
                </p>
                <p className="text-xs mb-3" style={{ color:'#4d7c5e' }}>Share this invite link with your customer:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-xl text-xs truncate"
                    style={{ background:'#dcfce7', color:'#166534', border:'1px solid #bbf7d0' }}>
                    {inviteInfo.inviteLink}
                  </code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteInfo.inviteLink); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
                    className="px-4 py-2 rounded-xl text-xs font-bold btn-shine whitespace-nowrap"
                    style={{ background: copied ? '#dcfce7' : '#16a34a', color: copied ? '#15803d' : '#fff', border: copied ? '1px solid #bbf7d0' : 'none', boxShadow: copied ? 'none' : '0 4px 16px #16a34a44' }}>
                    {copied ? '✓ Copied' : 'Copy Link'}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => navigate(`/call/${inviteInfo.session.id}`)}
                  className="px-4 py-2 rounded-xl text-sm font-bold btn-shine whitespace-nowrap"
                  style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', border:'none', boxShadow:'0 4px 16px #f59e0b44' }}>
                  Join Call →
                </button>
                <button onClick={() => setInviteInfo(null)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ background:'#fff', color:'#78716c', border:'1px solid #e5e2dd' }}>×</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Session list — cards bleed to left edge ── */}
        <div className="flex flex-col gap-3" style={{ marginLeft: '-48px' }}>
          {loading ? (
            <>
              {[1,2,3,4].map(i => (
                <div key={i} className="shimmer" style={{ height:'76px', borderRadius:'0 16px 16px 0' }} />
              ))}
            </>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 scale-in">
              <div className="float inline-block text-5xl mb-4">📋</div>
              <p className="font-semibold mb-1" style={{ color:'#1c1917' }}>No sessions found</p>
              <p className="text-sm" style={{ color:'#78716c' }}>
                {search ? `No sessions matching "${search}"` : filter !== 'all' ? `No ${filter} sessions right now.` : 'Create a new session to get started.'}
              </p>
              {search && (
                <button onClick={() => setSearch('')} className="mt-3 text-xs px-4 py-2 rounded-lg btn-shine"
                  style={{ background:'#fff', color:'#d97706', border:'1px solid #fcd34d' }}>
                  Clear search
                </button>
              )}
            </div>
          ) : (
            filtered.map((s, i) => {
              const sc = STATUS_CFG[s.status] || STATUS_CFG.ended;
              return (
                <div key={s.id}
                  className={`rounded-2xl slide-up slide-up-${Math.min(i+1,5)}`}
                  style={{
                    background: '#fff',
                    border: '1.5px solid #f0ede8',
                    borderLeft: `6px solid ${sc.border}`,
                    borderRadius: '0 16px 16px 0',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    transition: 'box-shadow 0.18s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow=`0 6px 24px rgba(0,0,0,0.09), 0 0 0 1.5px #fcd34d`; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)'; }}>

                  <div className="flex items-center gap-5 py-4" style={{ paddingLeft:'52px', paddingRight:'24px' }}>

                    {/* Status badge + Title block */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusBadge status={s.status} />
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color:'#1c1917' }}>{s.title}</p>
                        <p className="text-xs mt-0.5" style={{ color:'#a8a29e' }}>{formatTime(s.created_at)}</p>
                      </div>
                    </div>

                    {/* Meta pills */}
                    <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
                      {s.duration && (
                        <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
                          style={{ background:'#f7f5f0', color:'#78716c', border:'1px solid #ede9e2' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {formatDuration(s.duration)}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
                        style={{ background:'#f7f5f0', color:'#78716c', border:'1px solid #ede9e2' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
                        </svg>
                        {s.totalParticipants}
                      </span>
                      <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl"
                        style={{ background:'#f7f5f0', color:'#78716c', border:'1px solid #ede9e2' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                        </svg>
                        {s.messageCount}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.status !== 'ended' && s.invite_token && <CopyInviteBtn token={s.invite_token} />}
                      {s.status !== 'ended' && (
                        <button onClick={() => navigate(`/call/${s.id}`)}
                          className="px-4 py-2 rounded-xl text-xs font-bold btn-shine whitespace-nowrap"
                          style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#fff', border:'none', boxShadow:'0 3px 12px #f59e0b44' }}>
                          {s.status === 'active' ? '↩ Rejoin' : '→ Join'}
                        </button>
                      )}
                      {s.recording_path && (
                        <a href={s.recording_path} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-2 rounded-xl text-xs btn-shine whitespace-nowrap flex items-center gap-1.5"
                          style={{ background:'#f7f5f0', color:'#78716c', border:'1.5px solid #e5e2dd', textDecoration:'none' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                          Recording
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Mobile meta */}
                  <div className="lg:hidden flex gap-3 pb-3 text-xs" style={{ color:'#a8a29e', paddingLeft:'52px' }}>
                    <span>👥 {s.totalParticipants} participants</span>
                    <span>💬 {s.messageCount} messages</span>
                    {s.duration && <span>⏱ {formatDuration(s.duration)}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* ── Create modal ── */}
      {showCreate && (
        <div onClick={e => e.target === e.currentTarget && setShowCreate(false)}
          style={{ position:'fixed', inset:0, zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px', background:'rgba(15,10,5,0.6)', backdropFilter:'blur(10px)' }}>

          <div className="scale-in" style={{ width:'100%', maxWidth:'460px', background:'#ffffff', borderRadius:'24px', borderTop:'5px solid #f59e0b', border:'1.5px solid #fde68a', borderTopWidth:'5px', boxShadow:'0 40px 100px rgba(0,0,0,0.25), 0 8px 32px rgba(245,158,11,0.15)', overflow:'hidden' }}>

            {/* Header */}
            <div style={{ padding:'28px 32px 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'8px' }}>
                <div style={{ width:'4px', height:'28px', borderRadius:'4px', background:'linear-gradient(180deg,#fbbf24,#d97706)', flexShrink:0 }} />
                <h2 style={{ fontSize:'20px', fontWeight:900, color:'#1c1917', margin:0 }}>New Support Session</h2>
              </div>
              <p style={{ fontSize:'13px', color:'#a8a29e', margin:'0 0 0 16px' }}>Enter a title so the customer knows what the call is about</p>
            </div>

            {/* Body */}
            <div style={{ padding:'20px 32px 28px' }}>
              {/* Icon + input row */}
              <div style={{ display:'flex', alignItems:'center', border:'1.5px solid #e5e2dd', borderRadius:'14px', background:'#f7f5f0', transition:'all 0.2s', marginBottom:'24px', overflow:'hidden' }}
                onFocus={() => {}} >
                <span style={{ paddingLeft:'14px', fontSize:'18px', flexShrink:0, color:'#c4b9ae' }}>📋</span>
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createSession()}
                  placeholder="e.g. Fan installation issue, Remote setup help…"
                  style={{ flex:1, padding:'16px 14px', border:'none', background:'transparent', outline:'none', color:'#1c1917', fontSize:'14px', fontFamily:'inherit' }}
                  onFocus={e => { e.currentTarget.parentElement.style.borderColor='#f59e0b'; e.currentTarget.parentElement.style.boxShadow='0 0 0 4px #f59e0b14'; e.currentTarget.parentElement.style.background='#fff'; }}
                  onBlur={e  => { e.currentTarget.parentElement.style.borderColor='#e5e2dd'; e.currentTarget.parentElement.style.boxShadow='none'; e.currentTarget.parentElement.style.background='#f7f5f0'; }}
                />
              </div>

              {/* Info strip */}
              <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', borderRadius:'10px', background:'#fef9eb', border:'1px solid #fde68a', marginBottom:'24px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span style={{ fontSize:'12px', color:'#b45309' }}>An invite link will be generated — share it with your customer to let them join.</span>
              </div>

              {/* Buttons */}
              <div style={{ display:'flex', gap:'12px', justifyContent:'flex-end' }}>
                <button onClick={() => setShowCreate(false)}
                  style={{ padding:'12px 20px', borderRadius:'12px', fontSize:'14px', fontWeight:600, background:'#f7f5f0', color:'#78716c', border:'1.5px solid #e5e2dd', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f0ede8'}
                  onMouseLeave={e => e.currentTarget.style.background='#f7f5f0'}>
                  Cancel
                </button>
                <button onClick={createSession} disabled={creating || !newTitle.trim()}
                  style={{
                    padding:'12px 24px', borderRadius:'12px', fontSize:'14px', fontWeight:800,
                    background: creating || !newTitle.trim() ? '#f0ede8' : 'linear-gradient(135deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)',
                    color: creating || !newTitle.trim() ? '#b0a898' : '#fff',
                    border:'none', cursor: creating || !newTitle.trim() ? 'not-allowed' : 'pointer',
                    boxShadow: creating || !newTitle.trim() ? 'none' : '0 6px 24px rgba(245,158,11,0.5)',
                    transition:'all 0.2s', display:'flex', alignItems:'center', gap:'8px',
                  }}>
                  {creating ? (
                    <>
                      <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />
                      Creating…
                    </>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                      </svg>
                      Create &amp; Get Link
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
