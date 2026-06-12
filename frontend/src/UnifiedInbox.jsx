// File: d:/Call Anexa/faizan-langar/frontend/src/UnifiedInbox.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { MessageSquare, Users, CheckCircle2, Filter, Search, Tag, FileText, Edit2 } from 'lucide-react';
import WhatsAppInput from './WhatsAppInput';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const api = axios.create({ baseURL: API });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function UnifiedInbox({ sessions, socket }) {
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Aggregated chats from ALL sessions
  const [allChats, setAllChats] = useState([]); // { contact, last_message, last_direction, last_msg_time, sessionId, agentName }
  const [contacts, setContacts] = useState([]); // CRM contacts from all sessions

  const [selectedContact, setSelectedContact] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  
  const selectedContactRef = useRef('');
  const selectedSessionIdRef = useRef('');
  
  useEffect(() => {
    selectedContactRef.current = selectedContact;
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedContact, selectedSessionId]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const scrollerRef = useRef(null);
  const [loadingChats, setLoadingChats] = useState(true);

  // Fetch chats from ALL sessions on mount
  useEffect(() => {
    if (!sessions || sessions.length === 0) return;
    setLoadingChats(true);

    const fetchAll = async () => {
      const chatPromises = sessions.map(s =>
        api.get(`/api/chats/${s.id}`)
          .then(res => res.data.map(ch => ({ ...ch, sessionId: s.id, agentName: s.name })))
          .catch(() => [])
      );
      const contactPromises = sessions.map(s =>
        api.get(`/api/contacts/${s.id}`)
          .then(res => res.data.map(c => ({ ...c, sessionId: s.id, agentName: s.name })))
          .catch(() => [])
      );

      const chatResults = await Promise.all(chatPromises);
      const contactResults = await Promise.all(contactPromises);

      setAllChats(chatResults.flat());
      setContacts(contactResults.flat());
      setLoadingChats(false);
    };

    fetchAll();
  }, [sessions]);

  // Handle socket real-time messages
  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (data) => {
      // 1. If currently inside this conversation, append in real-time
      if (selectedSessionIdRef.current === data.sessionId && selectedContactRef.current === data.contact) {
        setMessages(prev => [...prev, data.message]);
        setTimeout(() => {
          if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
        }, 50);
      }
      
      // 2. Update the sidebar threads list
      setAllChats(prev => {
        let found = false;
        const updated = prev.map(chat => {
          if (chat.sessionId === data.sessionId && chat.contact === data.contact) {
            found = true;
            return {
              ...chat,
              last_message: data.message.message_text,
              last_direction: data.message.direction,
              last_msg_time: data.message.timestamp,
              unread_count: (selectedSessionIdRef.current === data.sessionId && selectedContactRef.current === data.contact) 
                            ? 0 
                            : (chat.unread_count || 0) + (data.message.direction === 'incoming' ? 1 : 0)
            };
          }
          return chat;
        });
        
        if (!found) {
          const agentInfo = sessions.find(s => s.id === data.sessionId);
          updated.push({
            contact: data.contact,
            sessionId: data.sessionId,
            agentName: agentInfo ? agentInfo.name : 'Unknown Agent',
            last_message: data.message.message_text,
            last_direction: data.message.direction,
            last_msg_time: data.message.timestamp,
            unread_count: (selectedSessionIdRef.current === data.sessionId && selectedContactRef.current === data.contact) 
                          ? 0 
                          : (data.message.direction === 'incoming' ? 1 : 0)
          });
        }
        return updated;
      });
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [socket, sessions]);

  // When contact selected, load messages and mark as read
  useEffect(() => {
    if (!selectedSessionId || !selectedContact) return;
    
    // Optimistically clear unread count in UI
    setAllChats(prev => prev.map(chat => 
      (chat.sessionId === selectedSessionId && chat.contact === selectedContact)
        ? { ...chat, unread_count: 0 } 
        : chat
    ));

    api.get(`/api/chats/${selectedSessionId}/${selectedContact}`).then(res => {
      setMessages(res.data);
      setTimeout(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
      }, 50);
    }).catch(console.error);
  }, [selectedSessionId, selectedContact]);

  // Build combined sorted list
  const combinedList = useMemo(() => {
    const items = allChats.map(ch => ({
      contact: ch.contact,
      name: ch.contact.split('@')[0],
      last_message: ch.last_message || '',
      last_direction: ch.last_direction || '',
      last_msg_time: ch.last_msg_time || 0,
      unread_count: ch.unread_count || 0,
      sessionId: ch.sessionId,
      agentName: ch.agentName,
      isGroup: ch.contact.endsWith('@g.us')
    }));

    let filtered = items.filter(item =>
      !item.contact.endsWith('@g.us') &&
      !item.contact.endsWith('@newsletter') &&
      item.contact !== 'status@broadcast' &&
      (item.contact.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()))
    );

    if (unreadOnly) {
      filtered = filtered.filter(item => item.unread_count > 0);
    }

    return filtered.sort((a, b) => b.last_msg_time - a.last_msg_time);
  }, [allChats, search, unreadOnly]);

  // CRM details for selected contact
  const crmDetails = useMemo(() => {
    if (!selectedContact) return null;
    return contacts.find(c => c.phone === selectedContact || c.phone === selectedContact.split('@')[0]);
  }, [contacts, selectedContact]);

  // Handle sending text message
  const handleSendMessage = async () => {
    if (!input.trim() || !selectedContact || !selectedSessionId) return;
    const txt = input.trim();
    setInput('');
    try {
      await api.post('/api/chats/send', {
        sessionId: selectedSessionId,
        contact: selectedContact.includes('@') ? selectedContact : `${selectedContact}@s.whatsapp.net`,
        message: txt
      });
      // Reload messages
      const res = await api.get(`/api/chats/${selectedSessionId}/${selectedContact}`);
      setMessages(res.data);
      setTimeout(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
      }, 50);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send message.');
    }
  };

  // Handle sending media
  const handleSendMedia = async (file, caption) => {
    if (!selectedSessionId || !selectedContact) {
      alert('Please select a contact first.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', selectedSessionId);
      formData.append('contact', selectedContact);
      formData.append('caption', caption || '');
      await api.post('/api/chats/send-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Reload messages
      const res = await api.get(`/api/chats/${selectedSessionId}/${selectedContact}`);
      setMessages(res.data);
      setTimeout(() => {
        if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
      }, 50);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send media.');
    }
  };

  // CRM update handlers
  const handleLeadStageChange = async (e) => {
    if (!crmDetails) return;
    const newStage = e.target.value;
    try {
      await api.post(`/api/contacts/${crmDetails.id}/update`, { lead_stage: newStage });
      setContacts(prev => prev.map(c => c.id === crmDetails.id ? { ...c, lead_stage: newStage } : c));
    } catch (err) { console.error(err); }
  };

  const handleTagsUpdate = async (e) => {
    if (!crmDetails) return;
    const newTags = e.target.value;
    try {
      await api.post(`/api/contacts/${crmDetails.id}/update`, { tags: newTags });
      setContacts(prev => prev.map(c => c.id === crmDetails.id ? { ...c, tags: newTags } : c));
    } catch (err) { console.error(err); }
  };

  const handleNotesUpdate = async (e) => {
    if (!crmDetails) return;
    const newNotes = e.target.value;
    try {
      await api.post(`/api/contacts/${crmDetails.id}/update`, { notes: newNotes });
      setContacts(prev => prev.map(c => c.id === crmDetails.id ? { ...c, notes: newNotes } : c));
    } catch (err) { console.error(err); }
  };

  // Media rendering helper (same logic as existing Live Chat)
  const renderMessageContent = (msg) => {
    const text = msg.message_text;
    if (!text) return null;
    const uploadRegex = /(http:\/\/localhost:3001\/uploads\/.*)/;
    const match = text.match(uploadRegex);
    if (match) {
      const url = match[1].trim();
      let textWithoutUrl = text.replace(match[1], '').trim();
      textWithoutUrl = textWithoutUrl.replace(/\[(IMAGE|AUDIO|VIDEO|DOCUMENT)\](\s*-\s*)?/gi, '').trim();
      const ext = url.split('.').pop().toLowerCase();
      let mediaElement = null;
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        mediaElement = (
          <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
            <img src={url} alt="Media" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '0.25rem', maxHeight: '250px', objectFit: 'contain' }} />
          </a>
        );
      } else if (['mp4', 'webm'].includes(ext)) {
        mediaElement = <video src={url} controls style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '0.25rem', maxHeight: '250px' }} />;
      } else if (['ogg', 'mp3', 'wav', 'oga'].includes(ext)) {
        mediaElement = <audio src={url} controls style={{ maxWidth: '240px', marginTop: '0.25rem', height: '36px' }} />;
      } else {
        mediaElement = <a href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.8rem', borderRadius: '8px', color: '#63caf1', textDecoration: 'none', marginTop: '0.25rem', fontSize: '0.85rem' }}>📄 Download File</a>;
      }
      return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {textWithoutUrl && <span style={{ marginBottom: '0.2rem', whiteSpace: 'pre-wrap', opacity: 0.8, fontSize: '0.85rem' }}>{textWithoutUrl}</span>}
          {mediaElement}
        </div>
      );
    }
    return <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>;
  };

  // Agent session info for selected contact
  const selectedAgentInfo = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find(s => s.id === selectedSessionId);
  }, [sessions, selectedSessionId]);

  return (
    <div>
      <header className="page-header">
        <div className="page-title-area">
          <div className="welcome-chip">📨 Unified Communications</div>
          <h1>Inbox</h1>
          <p>All your WhatsApp conversations from every connected agent — in one unified workspace with CRM insights.</p>
        </div>
      </header>

      {sessions.length === 0 ? (
        <div className="empty-state-cyber">
          <MessageSquare size={64} className="text-muted" />
          <h3>No active agents connected</h3>
          <p>Connect at least one WhatsApp agent to open the Inbox workspace.</p>
        </div>
      ) : (
        <div className="livechat-layout" style={{ gridTemplateColumns: '320px 1fr 300px' }}>

          {/* ===== LEFT PANEL: Contacts/Threads ===== */}
          <div className="livechat-sidebar">
            <div className="livechat-sidebar-header">
              <div className="livechat-sidebar-search">
                <Search className="livechat-search-icon" size={16} />
                <input
                  type="text"
                  className="livechat-search-input"
                  placeholder="Search all contacts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={unreadOnly}
                    onChange={e => setUnreadOnly(e.target.checked)}
                    style={{ accentColor: 'var(--accent)', width: '14px', height: '14px' }}
                  />
                  <Filter size={13} /> Unread Only
                </label>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {combinedList.length} threads
                </span>
              </div>
            </div>

            <div className="livechat-threads-list">
              {loadingChats ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Loading conversations...
                </div>
              ) : combinedList.length === 0 ? (
                <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '3rem 1rem' }}>
                  No conversation threads found.
                </div>
              ) : (
                combinedList.map(chat => {
                  const contactName = chat.contact.split('@')[0];
                  const active = selectedContact === chat.contact && selectedSessionId === chat.sessionId;
                  return (
                    <div
                      key={`${chat.sessionId}-${chat.contact}`}
                      className={`livechat-thread-item ${active ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedContact(chat.contact);
                        setSelectedSessionId(chat.sessionId);
                      }}
                    >
                      <div className={`livechat-avatar ${chat.isGroup ? 'group' : ''}`}>
                        {chat.isGroup ? 'Gp' : contactName.slice(-4)}
                      </div>
                      <div className="livechat-thread-details">
                        <h4>{chat.contact}</h4>
                        <p>{chat.last_message ? String(chat.last_message).slice(0, 40) : 'Empty thread'}</p>
                      </div>
                      <div className="livechat-thread-meta">
                        <span className="livechat-thread-time">
                          {chat.last_msg_time ? new Date(chat.last_msg_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {chat.unread_count > 0 ? (
                          <div style={{ 
                            background: '#25D366', 
                            color: '#fff', 
                            fontSize: '0.72rem', 
                            fontWeight: '600', 
                            borderRadius: '50%',
                            minWidth: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 5px'
                          }}>
                            {chat.unread_count}
                          </div>
                        ) : null}
                        <span style={{ fontSize: '0.6rem', color: 'var(--accent-light)', fontWeight: 600, marginTop: '0.15rem' }}>
                          {chat.agentName}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ===== MIDDLE PANEL: Messages ===== */}
          <div className="livechat-chat-viewport">
            {selectedContact ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <div className="livechat-chat-header">
                  <div>
                    <h3>{selectedContact}</h3>
                    <p>via {selectedAgentInfo?.name || 'Agent'} • Live Sync Active</p>
                  </div>
                  <span className="pill-indicator" style={{ background: 'var(--accent-glow)' }}>
                    {selectedContact.endsWith('@g.us') ? 'WhatsApp Group' : 'Private Conversation'}
                  </span>
                </div>

                <div className="livechat-messages-scroller" ref={scrollerRef}>
                  {messages.map((msg, idx) => {
                    const isAi = msg.direction === 'outgoing' && msg.message_text?.includes(' AI]*');
                    const isRule = msg.direction === 'outgoing' && msg.message_text?.includes(' Rule]*');
                    const badgeText = isAi ? 'AI Bot' : isRule ? 'Keyword Rule' : null;
                    const outClass = isAi ? 'ai-replied' : isRule ? 'rule-replied' : 'manual-replied';

                    return (
                      <div key={idx} className={`livechat-bubble-row ${msg.direction} ${msg.direction === 'outgoing' ? outClass : ''}`}>
                        <div className="livechat-bubble">
                          {msg.direction === 'outgoing' && badgeText && (
                            <span className="livechat-bubble-badge">{badgeText}</span>
                          )}
                          {renderMessageContent(msg)}
                          <span className="livechat-bubble-time">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ padding: '0.5rem' }}>
                  <WhatsAppInput
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onSend={handleSendMessage}
                    onSendMedia={handleSendMedia}
                    placeholder="Type a manual reply message..."
                  />
                </div>
              </div>
            ) : (
              <div className="livechat-empty-chat">
                <MessageSquare size={48} className="text-muted" style={{ opacity: 0.4 }} />
                <h4>Inbox Ready</h4>
                <p>Click on any thread from the list on the left to read messages and reply to customers.</p>
              </div>
            )}
          </div>

          {/* ===== RIGHT PANEL: CRM Details ===== */}
          <div style={{
            borderLeft: '1px solid var(--border)',
            background: 'rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* CRM Header */}
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Users size={16} style={{ color: 'var(--accent-light)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#fff' }}>CRM Details</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              {!selectedContact ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem', fontSize: '0.85rem' }}>
                  <Users size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                  <p>Select a contact to view CRM details.</p>
                </div>
              ) : crmDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Contact Avatar + Name */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="livechat-avatar" style={{ width: '56px', height: '56px', fontSize: '1.1rem' }}>
                      {(crmDetails.name || crmDetails.phone || '').slice(-4)}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{crmDetails.name || 'Anonymous User'}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.25rem 0 0', fontFamily: 'var(--font-mono)' }}>{crmDetails.phone}</p>
                    </div>
                  </div>

                  {/* Lead Stage */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Lead Stage
                    </label>
                    <select
                      value={crmDetails.lead_stage || 'new'}
                      onChange={handleLeadStageChange}
                      className="input-field-glow"
                      style={{ width: '100%', height: '38px', fontSize: '0.88rem' }}
                    >
                      <option value="new">🟢 New</option>
                      <option value="contacted">🟡 Contacted</option>
                      <option value="qualified">🔵 Qualified</option>
                      <option value="lost">🔴 Lost</option>
                      <option value="won">🏆 Won</option>
                    </select>
                  </div>

                  {/* Tags */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <Tag size={13} /> Tags
                    </label>
                    {crmDetails.tags && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
                        {crmDetails.tags.split(',').map((t, idx) => (
                          <span key={idx} className="crm-tag-pill">{t.trim()}</span>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      className="crm-tag-input"
                      placeholder="VIP, Lead, Customer..."
                      defaultValue={crmDetails.tags || ''}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTagsUpdate(e);
                          e.target.blur();
                        }
                      }}
                      style={{ width: '100%' }}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <FileText size={13} /> Notes
                    </label>
                    <textarea
                      className="crm-notes-area"
                      defaultValue={crmDetails.notes || ''}
                      placeholder="Add notes about this client..."
                      onBlur={handleNotesUpdate}
                      style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
                    />
                  </div>

                  {/* Agent Info */}
                  <div style={{
                    background: 'rgba(212, 160, 23, 0.08)',
                    border: '1px solid rgba(212, 160, 23, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Connected via Agent</div>
                    <div style={{ color: 'var(--accent-light)', fontWeight: 700 }}>
                      {selectedAgentInfo?.name || 'Unknown'}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: selectedAgentInfo?.status === 'ready' || selectedAgentInfo?.status === 'authenticated' ? '#22c55e' : '#ef4444' }}>
                        {selectedAgentInfo?.status === 'ready' || selectedAgentInfo?.status === 'authenticated' ? '● Online' : '● Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Last Activity */}
                  {crmDetails.last_message && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Last Activity: {new Date(crmDetails.last_message).toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Show basic info even when not in CRM */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="livechat-avatar" style={{ width: '56px', height: '56px', fontSize: '1.1rem' }}>
                      {selectedContact.split('@')[0].slice(-4)}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: 0 }}>{selectedContact.split('@')[0]}</h4>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.25rem 0 0' }}>Not saved in CRM yet</p>
                    </div>
                  </div>

                  {/* Agent Info */}
                  <div style={{
                    background: 'rgba(212, 160, 23, 0.08)',
                    border: '1px solid rgba(212, 160, 23, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem',
                    fontSize: '0.82rem'
                  }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Connected via Agent</div>
                    <div style={{ color: 'var(--accent-light)', fontWeight: 700 }}>
                      {selectedAgentInfo?.name || 'Unknown'}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.72rem', color: selectedAgentInfo?.status === 'ready' || selectedAgentInfo?.status === 'authenticated' ? '#22c55e' : '#ef4444' }}>
                        {selectedAgentInfo?.status === 'ready' || selectedAgentInfo?.status === 'authenticated' ? '● Online' : '● Offline'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
