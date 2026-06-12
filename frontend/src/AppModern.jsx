import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { 
  MessageSquare, RefreshCw, LogOut, CheckCircle2, Smartphone, Shield, 
  Activity, Clock, Edit2, Plus, Search, Trash2, ChevronLeft, ChevronRight, 
  User, BarChart3, Calendar, Brain, Zap, Settings, Power, X
} from 'lucide-react';
import Auth from './Auth';
import Dashboard from './Dashboard';
import Scheduler from './Scheduler';
import AISettings from './AISettings';
import './AppModern.css';
import callIcon from './assets/CalIicon.png';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const socket = io(API);

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  
  const [sessions, setSessions] = useState([]);
  const [editingName, setEditingName] = useState(null);
  
  // Pagination & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Modals
  const [showDashboard, setShowDashboard] = useState(null);
  const [showScheduler, setShowScheduler] = useState(null);
  const [showAISettings, setShowAISettings] = useState(null);

  // Setup Axios Auth Header globally
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchSessions();
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    socket.on('qr', (data) => {
      setSessions(prev => prev.map(s => s.id === data.sessionId ? { ...s, qr: data.qr, status: 'qr' } : s));
    });

    socket.on('status', (data) => {
      setSessions(prev => prev.map(s => s.id === data.sessionId ? { ...s, status: data.status, qr: data.status === 'qr' ? s.qr : null } : s));
    });

    socket.on('update_session', (data) => {
      setSessions(prev => prev.map(s => s.id === data.sessionId ? { ...s, ...data.data } : s));
    });
    
    socket.on('delete_session', (data) => {
      setSessions(prev => prev.filter(s => s.id !== data.sessionId));
    });

    return () => {
      socket.off('qr');
      socket.off('status');
      socket.off('update_session');
      socket.off('delete_session');
    };
  }, [token]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/api/sessions`);
      setSessions(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    }
  };

  const handleUpdate = async (id, payload) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...payload } : s));
    
    try {
      await axios.post(`${API}/api/sessions/${id}/update`, payload);
    } catch (err) {
      console.error('Error updating session:', err);
    }
  };

  const logoutSession = async (id) => {
    if (window.confirm('Disconnect this WhatsApp session?')) {
      try {
        await axios.post(`${API}/api/sessions/${id}/logout`);
      } catch (err) {
        console.error('Error logging out:', err);
      }
    }
  };

  const deleteSession = async (id) => {
    if (window.confirm('⚠️ Permanently delete this agent? This cannot be undone.')) {
      try {
        await axios.post(`${API}/api/sessions/${id}/delete`);
        setSessions(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        console.error('Error deleting:', err);
      }
    }
  };

  const addSession = async () => {
    try {
      const res = await axios.post(`${API}/api/sessions/add`, { name: 'New Agent' });
      setSessions(prev => [...prev, res.data.session]);
    } catch (err) {
      console.error('Error adding session:', err);
    }
  };

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUser);
    setToken(newToken);
    setUsername(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setToken('');
    setUsername('');
    setSessions([]);
  };

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  // Filter and paginate
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sessions, searchQuery]);

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const currentSessions = filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="layout">
      <div className="mesh-gradient"></div>
      
      <main className="container">
        <header className="header">
          <div className="header-top">
            <div className="brand">
              <div className="brand-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={callIcon} alt="Call Anexa Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              </div>
              <div className="brand-text">
                <h1>Call Anexa</h1>
                <p>Multi-Agent Management System</p>
              </div>
            </div>
            
            <div className="user-section">
              <div className="user-badge">
                <div className="user-avatar">{username.charAt(0).toUpperCase()}</div>
                <span className="user-name">{username}</span>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                className="search-box"
                placeholder="Search agents by name or ID..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              />
            </div>
            <button className="add-btn" onClick={addSession}>
              <Plus size={20} /> New Agent
            </button>
          </div>
        </header>

        {currentSessions.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <Smartphone size={64} />
            </div>
            <h3>No Agents Yet</h3>
            <p>Create your first WhatsApp AI agent to get started</p>
            <button className="add-btn" onClick={addSession} style={{ marginTop: '1.5rem' }}>
              <Plus size={20} /> Create First Agent
            </button>
          </div>
        )}

        <div className="bento-grid">
          {currentSessions.map((session, index) => (
            <div key={session.id} className="bento-card" style={{ animationDelay: `${index * 0.05}s` }}>
              
              <div className="card-header">
                <div className="card-header-top">
                  <div className="agent-info">
                    <div className="agent-name-wrapper">
                      <div className="agent-icon">
                        <Smartphone size={20} />
                      </div>
                      {editingName === session.id ? (
                        <input 
                          type="text" 
                          className="name-input"
                          defaultValue={session.name}
                          onBlur={(e) => {
                            setEditingName(null);
                            if(e.target.value.trim() !== session.name) {
                              handleUpdate(session.id, { name: e.target.value.trim() });
                            }
                          }}
                          onKeyDown={(e) => {
                            if(e.key === 'Enter') e.target.blur();
                          }}
                          autoFocus
                        />
                      ) : (
                        <h3 className="agent-name" onClick={() => setEditingName(session.id)}>
                          {session.name} <Edit2 size={14} className="edit-icon" />
                        </h3>
                      )}
                    </div>
                    <p className="agent-id">{session.id}</p>
                  </div>
                  
                  <div className={`status-badge ${session.status}`}>
                    <span className="status-dot"></span>
                    {session.status || 'loading'}
                  </div>
                </div>

                <div className="card-stats">
                  <div className="stat-item">
                    <div className="stat-label">
                      <MessageSquare size={12} /> Messages
                    </div>
                    <div className="stat-value">{session.msgCount}</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">
                      <Clock size={12} /> Delay
                    </div>
                    <div className="stat-value">{session.replyDelay}s</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-label">
                      <Power size={12} /> Status
                    </div>
                    <div className="stat-value" style={{ fontSize: '0.875rem' }}>
                      {session.isActive ? '🟢 ON' : '🔴 OFF'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-body">
                {session.status === 'qr' && session.qr ? (
                  <div className="qr-section">
                    <div className="qr-code">
                      <img src={session.qr} alt="QR Code" />
                    </div>
                    <div className="qr-instructions">
                      <h4>📱 Scan to Connect</h4>
                      <ol>
                        <li>Open WhatsApp on your phone</li>
                        <li>Tap Menu → Linked Devices</li>
                        <li>Scan this QR code</li>
                      </ol>
                    </div>
                  </div>
                ) : session.status === 'ready' ? (
                  <div className="status-display connected">
                    <div className="status-icon">
                      <Shield size={48} />
                    </div>
                    <h4>Connected & Active</h4>
                    <p>Your agent is ready to receive messages</p>
                  </div>
                ) : (
                  <div className="status-display loading">
                    <RefreshCw className="spin" size={36} />
                    <h4>Connecting...</h4>
                    <p>Please wait while we establish connection</p>
                  </div>
                )}
              </div>

              <div className="card-controls">
                <div className="control-group">
                  <label className="control-label">System Prompt</label>
                  <textarea 
                    className="control-textarea"
                    value={session.prompt}
                    onChange={(e) => setSessions(prev => prev.map(s => s.id === session.id ? { ...s, prompt: e.target.value } : s))}
                    placeholder="Define AI personality and behavior..."
                    rows="3"
                  />
                </div>

                <div className="control-row">
                  <div className="control-item">
                    <label className="toggle-label">
                      <input 
                        type="checkbox" 
                        className="toggle-input"
                        checked={session.isActive}
                        onChange={(e) => handleUpdate(session.id, { isActive: e.target.checked })}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-text">Active</span>
                    </label>
                  </div>
                  
                  <div className="control-item">
                    <label className="input-label">Reply Delay (sec)</label>
                    <input 
                      type="number" 
                      className="control-input"
                      min="0"
                      max="60"
                      value={session.replyDelay}
                      onChange={(e) => handleUpdate(session.id, { replyDelay: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button 
                  className="action-btn primary"
                  onClick={() => handleUpdate(session.id, { prompt: session.prompt })}
                >
                  <CheckCircle2 size={16} /> Save
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => setShowAISettings(session)}
                >
                  <Brain size={16} /> AI Config
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => setShowDashboard(session.id)}
                >
                  <BarChart3 size={16} /> Analytics
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => setShowScheduler(session.id)}
                >
                  <Calendar size={16} /> Schedule
                </button>
              </div>

              <div className="card-footer">
                {session.status === 'ready' && (
                  <button className="footer-btn danger-text" onClick={() => logoutSession(session.id)}>
                    <LogOut size={14} /> Disconnect
                  </button>
                )}
                <button className="footer-btn danger-text" onClick={() => deleteSession(session.id)}>
                  <Trash2 size={14} /> Delete Agent
                </button>
              </div>

              {session.aiEnabled && (
                <div className="ai-indicator">
                  <Zap size={14} /> AI: {session.aiProvider}
                </div>
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="pagination-btn" 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              className="pagination-btn" 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

      </main>

      {showDashboard && (
        <Dashboard 
          sessionId={showDashboard} 
          onClose={() => setShowDashboard(null)} 
        />
      )}

      {showScheduler && (
        <Scheduler 
          sessionId={showScheduler} 
          onClose={() => setShowScheduler(null)} 
        />
      )}

      {showAISettings && (
        <AISettings 
          session={showAISettings} 
          onUpdate={handleUpdate}
          onClose={() => setShowAISettings(null)} 
        />
      )}
    </div>
  );
}

export default App;
