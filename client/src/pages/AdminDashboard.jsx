import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

function formatDuration(ms) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString();
}

function StatCard({ label, value, color }) {
  return (
    <div className="p-5 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: color || 'var(--text)' }}>{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [endingId, setEndingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, st] = await Promise.all([api.adminSessions(), api.adminStats()]);
      setSessions(s);
      setStats(st);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function forceEnd(id) {
    if (!confirm('Force-end this session?')) return;
    setEndingId(id);
    try {
      await api.adminEndSession(id);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setEndingId(null);
    }
  }

  const active = sessions.filter(s => s.status === 'active');
  const waiting = sessions.filter(s => s.status === 'waiting');
  const ended = sessions.filter(s => s.status === 'ended');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="flex items-center justify-between px-6 py-4"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <span className="font-bold text-lg" style={{ color: 'var(--text)' }}>Admin Dashboard</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/dashboard')}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            Agent View
          </button>
          <a href="/api/admin/metrics" target="_blank" rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            📊 Metrics
          </a>
          <button onClick={() => { localStorage.clear(); navigate('/login'); }}
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{ background: 'var(--surface2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Active Sessions" value={stats.activeSessions ?? '—'} color="#4ade80" />
          <StatCard label="Waiting" value={stats.waitingSessions ?? '—'} color="#fbbf24" />
          <StatCard label="Total Sessions" value={stats.totalSessions ?? '—'} />
          <StatCard label="Connected Participants" value={stats.connectedParticipants ?? '—'} color="var(--primary)" />
          <StatCard label="Total Messages" value={stats.totalMessages ?? '—'} />
        </div>

        {/* Active sessions */}
        {active.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#4ade80' }} />
              Active Sessions ({active.length})
            </h2>
            <div className="space-y-3">
              {active.map(s => <SessionRow key={s.id} s={s} onEnd={forceEnd} endingId={endingId} navigate={navigate} />)}
            </div>
          </section>
        )}

        {/* Waiting */}
        {waiting.length > 0 && (
          <section className="mb-8">
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>
              ⏳ Waiting ({waiting.length})
            </h2>
            <div className="space-y-3">
              {waiting.map(s => <SessionRow key={s.id} s={s} onEnd={forceEnd} endingId={endingId} navigate={navigate} />)}
            </div>
          </section>
        )}

        {/* Ended */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>
            History ({ended.length})
          </h2>
          <div className="space-y-3">
            {ended.slice(0, 20).map(s => <SessionRow key={s.id} s={s} onEnd={forceEnd} endingId={endingId} navigate={navigate} />)}
          </div>
        </section>
      </main>
    </div>
  );
}

function SessionRow({ s, onEnd, endingId, navigate }) {
  const statusColor = { waiting: '#fbbf24', active: '#4ade80', ended: '#94a3b8' };
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: statusColor[s.status] }} />
            <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>{s.title}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#{s.id.slice(0, 8)}</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>Agent: {s.agent_name}</span>
            <span>Created: {formatTime(s.created_at)}</span>
            {s.started_at && <span>Started: {formatTime(s.started_at)}</span>}
            {s.duration && <span>Duration: {formatDuration(s.duration)}</span>}
            <span>👥 {s.participants?.length || 0} participants</span>
            <span>💬 {s.messageCount} messages</span>
          </div>
          {s.participants?.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {s.participants.map(p => (
                <span key={p.id} className="text-xs px-2 py-0.5 rounded"
                  style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
                  {p.name} ({p.role})
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {s.status !== 'ended' && (
            <>
              <button onClick={() => navigate(`/call/${s.id}`)}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'var(--primary)', color: '#fff' }}>
                Monitor
              </button>
              <button onClick={() => onEnd(s.id)}
                disabled={endingId === s.id}
                className="px-3 py-1.5 rounded-lg text-sm"
                style={{ background: 'var(--danger)', color: '#fff', opacity: endingId === s.id ? 0.5 : 1 }}>
                {endingId === s.id ? '…' : 'End'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
