// File: d:/Call Anexa/faizan-langar/frontend/src/UnifiedInbox.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { MessageSquare, Users, CheckCircle2, Filter, Search, Tag, FileText, Edit2, X, Info, Plus, Trash2, ChevronDown, MoreVertical } from 'lucide-react';
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
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [customLabels, setCustomLabels] = useState([]);
  const [manageLabelsModalOpen, setManageLabelsModalOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');
  const [labelSearch, setLabelSearch] = useState('');
  const labelColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editContactModalOpen, setEditContactModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState(null);
  const [editContactName, setEditContactName] = useState('');

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
      const labelPromises = sessions.map(s =>
        api.get(`/api/labels/${s.id}`)
          .then(res => res.data)
          .catch(() => [])
      );

      const chatResults = await Promise.all(chatPromises);
      const contactResults = await Promise.all(contactPromises);
      const labelResults = await Promise.all(labelPromises);

      setAllChats(chatResults.flat());
      setContacts(contactResults.flat());
      setCustomLabels(labelResults.flat());
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
            contact_name: data.contact_name,
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

      // 3. Update the CRM contacts list so it's instantly available without refresh
      setContacts(prev => {
        let foundContact = prev.find(c => c.session_id === data.sessionId && c.phone === data.contact);
        if (!foundContact) {
          const agentInfo = sessions.find(s => s.id === data.sessionId);
          return [...prev, {
            id: `contact-${Date.now()}`,
            session_id: data.sessionId,
            phone: data.contact,
            name: data.contact_name || data.contact,
            agentName: agentInfo ? agentInfo.name : 'Unknown Agent',
            last_message: data.message.timestamp
          }];
        }
        return prev.map(c => c.session_id === data.sessionId && c.phone === data.contact ? { ...c, last_message: data.message.timestamp, name: data.contact_name || c.name } : c);
      });
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, sessions]);

  // Handle socket contact updates (e.g. for avatar_url)
  useEffect(() => {
    if (!socket) return;
    const handleContactUpdated = (data) => {
      setAllChats(prev => prev.map(chat => 
        (chat.sessionId === data.sessionId && chat.contact === data.contact)
          ? { ...chat, avatar_url: data.avatar_url }
          : chat
      ));
      setContacts(prev => prev.map(c => 
        (c.session_id === data.sessionId && c.phone === data.contact)
          ? { ...c, avatar_url: data.avatar_url }
          : c
      ));
    };
    socket.on('contact_updated', handleContactUpdated);
    return () => socket.off('contact_updated', handleContactUpdated);
  }, [socket]);

  // When contact selected, load messages and mark as read
  useEffect(() => {
    setShowNoteEditor(false);
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
    const items = allChats.map(ch => {
      const crmContact = contacts.find(c => c.phone === ch.contact && c.session_id === ch.sessionId);
      const savedName = crmContact?.name || ch.contact_name;
      const effectiveName = (savedName && savedName !== ch.contact) ? savedName : ch.contact.split('@')[0];
      
      return {
        ...ch,
        contact: ch.contact,
        name: effectiveName,
        last_message: ch.last_message || '',
        last_direction: ch.last_direction || '',
        last_msg_time: ch.last_msg_time || 0,
        unread_count: ch.unread_count || 0,
        sessionId: ch.sessionId,
        agentName: ch.agentName,
        isGroup: ch.contact.endsWith('@g.us'),
        contact_name: savedName
      };
    });

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
  }, [allChats, search, unreadOnly, contacts]);

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

  const saveTagsBtn = async () => {
    if (!crmDetails) return;
    const el = document.getElementById('crm-tags-input');
    if (!el) return;
    const newTags = el.value;
    try {
      await api.post(`/api/contacts/${crmDetails.id}/update`, { tags: newTags });
      setContacts(prev => prev.map(c => c.id === crmDetails.id ? { ...c, tags: newTags } : c));
    } catch (err) { console.error(err); }
  };

  const clearTagsBtn = async () => {
    if (!crmDetails) return;
    const el = document.getElementById('crm-tags-input');
    if (el) el.value = '';
    try {
      await api.post(`/api/contacts/${crmDetails.id}/update`, { tags: '' });
      setContacts(prev => prev.map(c => c.id === crmDetails.id ? { ...c, tags: '' } : c));
    } catch (err) { console.error(err); }
  };

  const saveNotesBtn = async () => {
    if (!crmDetails) return;
    const el = document.getElementById('crm-notes-input');
    if (!el) return;
    const newNotes = el.value;
    try {
      await api.post(`/api/contacts/${crmDetails.id}/update`, { notes: newNotes });
      setContacts(prev => prev.map(c => c.id === crmDetails.id ? { ...c, notes: newNotes } : c));
    } catch (err) { console.error(err); }
  };

  const clearNotesBtn = async () => {
    if (!crmDetails) return;
    const el = document.getElementById('crm-notes-input');
    if (el) el.value = '';
    try {
      await api.post(`/api/contacts/${crmDetails.id}/update`, { notes: '' });
      setContacts(prev => prev.map(c => c.id === crmDetails.id ? { ...c, notes: '' } : c));
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
                      <div className={`livechat-avatar`}>
                        {(() => {
                          const avatar = chat.avatar_url || contacts.find(c => c.phone === chat.contact && c.session_id === chat.sessionId)?.avatar_url;
                          if (avatar && avatar !== 'none' && avatar !== '') {
                            return <img src={avatar} alt="DP" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} />;
                          }
                          return contactName.slice(-4);
                        })()}
                      </div>
                      <div className="livechat-thread-details">
                        <h4>{(() => {
                          const cname = chat.contact_name || contacts.find(c => c.phone === chat.contact && c.session_id === chat.sessionId)?.name;
                          return (cname && cname !== chat.contact) ? cname : contactName;
                        })()}</h4>
                        <p>{chat.last_message ? String(chat.last_message).slice(0, 40) : 'Empty thread'}</p>
                      </div>
                      <div className="livechat-thread-meta">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <span className="livechat-thread-time">
                            {chat.last_msg_time ? new Date(chat.last_msg_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' }) : ''}
                          </span>
                          <div 
                            style={{ cursor: 'pointer', color: 'var(--text-muted)', position: 'relative' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === `${chat.sessionId}-${chat.contact}` ? null : `${chat.sessionId}-${chat.contact}`);
                            }}
                          >
                            <MoreVertical size={14} />
                            {activeMenuId === `${chat.sessionId}-${chat.contact}` && (
                              <div style={{ position: 'absolute', right: 0, top: '20px', background: '#252525', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', zIndex: 50, padding: '0.25rem 0', minWidth: '120px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', textAlign: 'left' }}>
                                <div 
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#fff', cursor: 'pointer' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    setContactToEdit({
                                      sessionId: chat.sessionId,
                                      contact: chat.contact,
                                      crmId: contacts.find(c => c.phone === chat.contact && c.session_id === chat.sessionId)?.id
                                    });
                                    const cname = chat.contact_name || contacts.find(c => c.phone === chat.contact && c.session_id === chat.sessionId)?.name;
                                    setEditContactName((cname && cname !== chat.contact) ? cname : contactName);
                                    setEditContactModalOpen(true);
                                  }}
                                >
                                  {contacts.find(c => c.phone === chat.contact && c.session_id === chat.sessionId)?.name && contacts.find(c => c.phone === chat.contact && c.session_id === chat.sessionId)?.name !== chat.contact ? 'Edit Contact' : 'Save Contact'}
                                </div>
                                <div 
                                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#ef4444', cursor: 'pointer' }}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(null);
                                    if (window.confirm('Are you sure you want to delete this chat?')) {
                                      try {
                                        await api.delete(`/api/chats/${chat.sessionId}/${chat.contact}`);
                                        setAllChats(prev => prev.filter(c => !(c.sessionId === chat.sessionId && c.contact === chat.contact)));
                                        if (selectedContact === chat.contact && selectedSessionId === chat.sessionId) {
                                          setSelectedContact('');
                                          setSelectedSessionId('');
                                        }
                                      } catch (err) { alert('Failed to delete chat'); }
                                    }
                                  }}
                                >
                                  Delete Chat
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
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
                    <h3>{(() => {
                      const cname = contacts.find(c => c.phone === selectedContact && c.session_id === selectedSessionId)?.name;
                      return (cname && cname !== selectedContact) ? cname : selectedContact.split('@')[0];
                    })()}</h3>
                    <p>via {selectedAgentInfo?.name || 'Agent'} • Live Sync Active</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="pill-indicator" style={{ background: 'var(--accent-glow)' }}>
                      {selectedContact}
                    </span>
                    <button 
                      onClick={() => { setSelectedContact(''); setSelectedSessionId(''); }} 
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem', borderRadius: '4px' }}
                      title="Close Chat"
                    >
                      <X size={18} />
                    </button>
                  </div>
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
                            {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' })}
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
                <img src="/callfavicon.svg" alt="Call Anexa" style={{ width: '250px', filter: 'brightness(0) invert(1)', opacity: 0.15 }} />
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
                      {(() => {
                        if (crmDetails.avatar_url && crmDetails.avatar_url !== 'none' && crmDetails.avatar_url !== '') {
                          return <img src={crmDetails.avatar_url} alt="DP" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} />;
                        }
                        return (crmDetails.name || crmDetails.phone || '').slice(-4);
                      })()}
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

                  {/* Labels (Previously Tags) */}
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#fff' }}>
                        Labels <Info size={14} style={{ color: 'var(--text-muted)' }} />
                      </h3>
                      <a href="#" onClick={(e) => { e.preventDefault(); setManageLabelsModalOpen(true); }} style={{ color: '#007bff', textDecoration: 'none', fontSize: '0.85rem' }}>Manage labels</a>
                    </div>
                    
                    {crmDetails.tags && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
                        {crmDetails.tags.split(',').map((t, idx) => {
                          const tag = t.trim();
                          if (!tag) return null;
                          return (
                            <span key={idx} style={{ background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              {tag}
                              <X size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={async () => {
                                let arr = crmDetails.tags.split(',').map(x=>x.trim()).filter(Boolean);
                                arr = arr.filter(x => x !== tag);
                                const newTags = arr.join(', ');
                                try {
                                  await api.post(`/api/contacts/${crmDetails.id}/update`, { tags: newTags });
                                  setContacts(prev => prev.map(c => c.id === crmDetails.id ? { ...c, tags: newTags } : c));
                                } catch (err) { console.error(err); }
                              }} />
                            </span>
                          )
                        })}
                      </div>
                    )}
                    
                    <div style={{ position: 'relative' }}>
                      <input
                        id="crm-tags-input"
                        key={`tags-${crmDetails.id}`}
                        type="text"
                        placeholder="Add label"
                        onFocus={() => setShowLabelDropdown(true)}
                        onBlur={() => setTimeout(() => setShowLabelDropdown(false), 200)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = e.target.value.trim();
                            if(val) {
                              let arr = crmDetails.tags ? crmDetails.tags.split(',').map(t=>t.trim()).filter(Boolean) : [];
                              if(!arr.includes(val)) arr.push(val);
                              const newTags = arr.join(', ');
                              api.post(`/api/contacts/${crmDetails.id}/update`, { tags: newTags }).then(() => {
                                setContacts(prev => prev.map(c => c.id === crmDetails.id ? { ...c, tags: newTags } : c));
                                e.target.value = '';
                                setShowLabelDropdown(false);
                              }).catch(console.error);
                            }
                          }
                        }}
                        style={{ width: '100%', padding: '0.5rem', marginBottom: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                      />
                      
                      {showLabelDropdown && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', zIndex: 100, padding: '0.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.5)', marginTop: '-0.5rem' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Available labels</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                            {customLabels.filter(l => l.session_id === crmDetails.session_id).map(label => (
                              <label key={label.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={(crmDetails.tags || '').includes(label.name)}
                                  onChange={async (e) => {
                                    let currentTags = crmDetails.tags ? crmDetails.tags.split(',').map(t=>t.trim()).filter(Boolean) : [];
                                    if(e.target.checked) { if(!currentTags.includes(label.name)) currentTags.push(label.name); }
                                    else { currentTags = currentTags.filter(t => t !== label.name); }
                                    const newTags = currentTags.join(', ');
                                    try {
                                      await api.post(`/api/contacts/${crmDetails.id}/update`, { tags: newTags });
                                      setContacts(prev => prev.map(c => c.id === crmDetails.id ? { ...c, tags: newTags } : c));
                                    } catch (err) { console.error(err); }
                                  }}
                                />
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: label.color || '#888' }}></span>
                                  <span style={{ color: '#fff', fontSize: '0.85rem' }}>{label.name}</span>
                                </span>
                              </label>
                            ))}
                            {customLabels.filter(l => l.session_id === crmDetails.session_id).length === 0 && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No labels created yet.</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem', color: '#fff' }}>Notes</h3>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Keep track of important customer interactions.</p>
                    
                    {crmDetails.notes && !showNoteEditor && (
                      <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: '#ddd' }}>
                        {crmDetails.notes}
                      </div>
                    )}

                    {!showNoteEditor ? (
                      <button 
                        onClick={() => setShowNoteEditor(true)}
                        style={{ border: '1px solid var(--border)', background: 'transparent', color: '#fff', padding: '0.4rem 0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                      >
                        {crmDetails.notes ? <Edit2 size={16} /> : <Plus size={16} />} {crmDetails.notes ? 'Edit note' : 'Add note'}
                      </button>
                    ) : (
                      <>
                        <textarea
                          id="crm-notes-input"
                          key={`notes-${crmDetails.id}`}
                          className="crm-notes-area"
                          defaultValue={crmDetails.notes || ''}
                          placeholder="Add notes about this client..."
                          style={{ width: '100%', minHeight: '100px', resize: 'vertical', marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => { saveNotesBtn(); setShowNoteEditor(false); }} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', flex: 1, background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Save note</button>
                          <button onClick={() => setShowNoteEditor(false)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', flex: 1, background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Cancel</button>
                        </div>
                      </>
                    )}
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
                      Last Activity: {new Date(crmDetails.last_message).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}
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

      {manageLabelsModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
          <div style={{ background: '#1e1e24', width: '90%', maxWidth: '400px', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>Manage custom labels</h2>
              <button onClick={() => setManageLabelsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={20} /></button>
            </div>
            
            <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Use labels to help you describe and organize people. Labels can be about anything, such as customer type or previous orders.
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowColorPicker(!showColorPicker)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: newLabelColor }}></div>
                    <ChevronDown size={14} color="#fff" />
                  </button>
                  {showColorPicker && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, background: '#2a2a35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.5rem', display: 'flex', gap: '0.25rem', zIndex: 10, marginTop: '4px' }}>
                      {labelColors.map(c => (
                        <div key={c} onClick={() => { setNewLabelColor(c); setShowColorPicker(false); }} style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: c, cursor: 'pointer', border: newLabelColor === c ? '2px solid #fff' : 'none' }}></div>
                      ))}
                    </div>
                  )}
                </div>
                <input 
                  type="text" 
                  placeholder="Name a label..." 
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
                <button 
                  onClick={async () => {
                    if (!newLabelName.trim() || !selectedSessionId) return;
                    try {
                      const res = await api.post('/api/labels/add', { sessionId: selectedSessionId, name: newLabelName.trim(), color: newLabelColor });
                      setCustomLabels(prev => [...prev, { id: res.data.id, session_id: selectedSessionId, name: res.data.name, color: res.data.color }]);
                      setNewLabelName('');
                    } catch (e) { console.error('Failed to add label', e); }
                  }}
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Add label
                </button>
              </div>

              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="Search" 
                  value={labelSearch}
                  onChange={e => setLabelSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {customLabels.filter(l => l.session_id === selectedSessionId && l.name.toLowerCase().includes(labelSearch.toLowerCase())).map(label => (
                  <div key={label.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: label.color || '#888' }}></div>
                      <span style={{ color: '#fff', fontSize: '0.9rem' }}>{label.name}</span>
                    </div>
                    <button 
                      onClick={async () => {
                        try {
                          await api.delete(`/api/labels/${label.id}`);
                          setCustomLabels(prev => prev.filter(l => l.id !== label.id));
                        } catch (e) { console.error('Failed to delete label', e); }
                      }}
                      style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.25rem', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setManageLabelsModalOpen(false)} style={{ background: '#fff', color: '#000', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Save Contact Modal */}
      {editContactModalOpen && contactToEdit && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>{contacts.find(c => c.id === contactToEdit.crmId)?.name && contacts.find(c => c.id === contactToEdit.crmId)?.name !== contactToEdit.contact ? 'Edit Contact' : 'Save Contact'}</h2>
              <button className="close-btn" onClick={() => setEditContactModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem 2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Contact Name
                </label>
                <div style={{ position: 'relative' }}>
                  <Edit2 size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    className="livechat-search-input" 
                    value={editContactName} 
                    onChange={(e) => setEditContactName(e.target.value)} 
                    placeholder="Enter a custom name"
                    style={{ width: '100%', paddingLeft: '2.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', height: '44px', fontSize: '0.95rem' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '2rem' }}>
                <button 
                  onClick={() => setEditContactModalOpen(false)}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600, background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    if (!editContactName.trim()) return;
                    try {
                      if (contactToEdit.crmId) {
                        await api.post(`/api/contacts/${contactToEdit.crmId}/update`, { name: editContactName });
                        setContacts(prev => prev.map(c => c.id === contactToEdit.crmId ? { ...c, name: editContactName } : c));
                        setAllChats(prev => prev.map(ch => (ch.sessionId === contactToEdit.sessionId && ch.contact === contactToEdit.contact) ? { ...ch, contact_name: editContactName } : ch));
                      } else {
                        alert('Contact CRM ID not found. Please wait or send a message first.');
                      }
                      setEditContactModalOpen(false);
                    } catch (err) {
                      alert('Failed to save contact name');
                    }
                  }}
                  style={{ padding: '0.6rem 1.5rem', borderRadius: '6px', fontSize: '0.88rem', fontWeight: 600, background: 'linear-gradient(135deg, #d4a017 0%, #9c7611 100%)', color: '#000', border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(212, 160, 23, 0.25)' }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
