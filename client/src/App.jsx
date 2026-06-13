import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AgentDashboard from './pages/AgentDashboard';
import CustomerJoin from './pages/CustomerJoin';
import CallRoom from './pages/CallRoom';
import AdminDashboard from './pages/AdminDashboard';

function PrivateRoute({ children, role }) {
  // If this tab has a customer-join, it is a customer tab — block ALL agent/admin routes
  // regardless of any agent token that may exist in localStorage (same-browser testing scenario)
  if (sessionStorage.getItem('customer-join')) {
    return <Navigate to="/join-blocked" replace />;
  }

  const token = localStorage.getItem('token');
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  })();

  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

function AccessDenied() {
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#fff1f2 0%,#f7f5f0 60%)' }}>
      <div style={{ textAlign:'center', maxWidth:380, padding:'0 16px' }}>
        <div style={{ width:80, height:80, borderRadius:'20px', background:'linear-gradient(145deg,#ef4444,#dc2626)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 16px 40px rgba(220,38,38,0.35)' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'#1c1917', marginBottom:8 }}>Access Denied</h2>
        <p style={{ color:'#78716c', fontSize:14, marginBottom:28 }}>Customers cannot access this area. Please use your invite link to join a support session.</p>
        <button onClick={() => window.history.back()}
          style={{ padding:'12px 28px', borderRadius:'12px', background:'linear-gradient(135deg,#fbbf24,#f59e0b,#d97706)', color:'#fff', fontWeight:700, fontSize:14, border:'none', cursor:'pointer', boxShadow:'0 6px 20px rgba(245,158,11,0.4)' }}>
          Go Back
        </button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/join" element={<CustomerJoin />} />
      <Route path="/join-blocked" element={<AccessDenied />} />
      <Route
        path="/dashboard"
        element={<PrivateRoute><AgentDashboard /></PrivateRoute>}
      />
      <Route
        path="/admin"
        element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>}
      />
      <Route path="/call/:sessionId" element={<CallRoom />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
