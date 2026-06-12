import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import {
  MessageSquare, Smartphone, Activity, Clock, Plus, Trash2, Settings, BarChart3,
  Users, Bot, Calendar, X, Send, ChevronDown, ChevronUp, LogOut, CheckCircle2,
  Brain, Zap, Power, Play, Sparkles, BookOpen, Sliders, Edit2, ShieldCheck, RefreshCw, Key, Tag, FileText, LayoutGrid, Eye, EyeOff, ArrowLeft, Inbox
} from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import WhatsAppInput from './WhatsAppInput';
import TemplateBuilder from './TemplateBuilder';
import './App.css';
import UnifiedInbox from './UnifiedInbox';
import callIcon from './assets/CalIicon.png';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const socket = io(API);

// Axios setup
const api = axios.create({ baseURL: API });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Premium Prompt Templates
const PRESET_TEMPLATES = [
  {
    id: 'customer_care',
    name: 'Professional Support Agent',
    description: 'Perfect for business, customer support, and answering product queries politely.',
    prompt: 'You are a professional customer support representative. Keep answers polite, helpful, and precise. Guide customers to book a call or purchase on our website.'
  },
  {
    id: 'sales_closer',
    name: 'High-Converting Sales Closer',
    description: 'Trained to generate leads, close deals, and handle objections smoothly.',
    prompt: 'You are an expert sales representative. Your goal is to identify customer pain points, present our pricing plans confidently, and overcome sales objections dynamically.'
  },
  {
    id: 'urdu_sales',
    name: '🇵🇰 Roman Urdu Sales Assistant',
    description: 'Answers naturally in friendly Roman Urdu to close sales and guide customers.',
    prompt: 'You are an expert sales assistant who speaks in Roman Urdu. Guide Pakistani customers, explain product benefits, and try to close sales.'
  },
  {
    id: 'hindi_support',
    name: '🇮🇳 Roman Hindi Helpdesk',
    description: 'Answers in polite Roman Hindi for support queries and step-by-step assistance.',
    prompt: 'You are a customer support specialist who speaks in Roman Hindi. Resolve customer doubts politely and help them step-by-step.'
  },
  {
    id: 'urdu_translator',
    name: 'Urdu/Hindi General Bot',
    description: 'Answers naturally in friendly Roman Urdu / Hindi language.',
    prompt: 'You are a friendly assistant. Speak in Roman Urdu and Hindi. Keep the conversation natural, helpful, and respectful.'
  },
  {
    id: 'wit_bot',
    name: 'Witty & Banter Host',
    description: 'Engages users with humor, light banter, and witty jokes.',
    prompt: 'You are a witty, extremely funny AI assistant. Reply with intelligent humor, light banter, and funny analogies while still providing correct information.'
  },
  {
    id: 'tutor_bot',
    name: 'Smart Academic Tutor',
    description: 'Explains complex topics in easy, structured bullet points.',
    prompt: 'You are a highly knowledgeable academic tutor. Explain complex concepts in simple bullet points with clear, real-life examples.'
  },
  {
    id: 'helpdesk_tech',
    name: 'Tech Helpdesk Troubleshooter',
    description: 'Troubleshoots customer issues step-by-step.',
    prompt: 'You are a technical support engineer. Troubleshoot customer queries methodically, ask clarifying questions, and resolve issues step-by-step with clear instructions.'
  }
];

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [activeTab, setActiveTab] = useState(localStorage.getItem('activeTab') || 'agents'); // agents, templates, crm, rules, analytics, broadcast, sandbox

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  const [role, setRole] = useState(localStorage.getItem('role') || 'user');
  const [users, setUsers] = useState([]);
  const [resellerUsers, setResellerUsers] = useState([]);
  const [myMaxAgents, setMyMaxAgents] = useState(-1);
  const [limitModalUser, setLimitModalUser] = useState(null);
  const [limitModalValue, setLimitModalValue] = useState(1);

  // Sessions / Agents states
  const [sessions, setSessions] = useState([]);
  const [editingName, setEditingName] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Auth states
  const [authMode, setAuthMode] = useState('login');
  const [authUser, setAuthUser] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // CRM states
  const [contacts, setContacts] = useState([]);
  const [crmSearch, setCrmSearch] = useState('');
  const [crmSelectedContact, setCrmSelectedContact] = useState(null);

  // Rules states
  const [selectedAgentForRule, setSelectedAgentForRule] = useState('');
  const [rules, setRules] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newReply, setNewReply] = useState('');
  const [newMatchType, setNewMatchType] = useState('contains');

  useEffect(() => {
    if (activeTab === 'rules') {
      // User requested manual selection
    }
  }, [activeTab]);

  // Analytics states
  const [selectedAgentForAnalytics, setSelectedAgentForAnalytics] = useState('');
  const [analyticsData, setAnalyticsData] = useState(null);

  // Broadcast & Schedule states
  const [selectedAgentForBroadcast, setSelectedAgentForBroadcast] = useState('');
  const [broadcastNumbers, setBroadcastNumbers] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [scheduledList, setScheduledList] = useState([]);
  const [schedContact, setSchedContact] = useState('');
  const [schedMessage, setSchedMessage] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');

  // Sandbox states
  const [selectedAgentForSandbox, setSelectedAgentForSandbox] = useState('');
  const [sandboxMessages, setSandboxMessages] = useState([]);
  const [sandboxInput, setSandboxInput] = useState('');
  const [sandboxTyping, setSandboxTyping] = useState(false);
  const chatScrollerRef = useRef(null);

  // Live Chat CRM states
  const [livechatChats, setLivechatChats] = useState([]);
  const [livechatSelectedAgent, setLivechatSelectedAgent] = useState('');
  const [livechatSelectedContact, setLivechatSelectedContact] = useState('');
  const [livechatMessages, setLivechatMessages] = useState([]);
  const [livechatInput, setLivechatInput] = useState('');
  const [livechatSearch, setLivechatSearch] = useState('');
  const livechatScrollerRef = useRef(null);

  // Bulk Sender states
  const [selectedAgentForBulk, setSelectedAgentForBulk] = useState('');
  const [bulkPhones, setBulkPhones] = useState(''); // multiple numbers comma/newline separated
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkCount, setBulkCount] = useState(1);
  const [bulkDelay, setBulkDelay] = useState(1);
  const [bulkDelayMax, setBulkDelayMax] = useState(2);
  const [useRandomDelay, setUseRandomDelay] = useState(true);
  const [bulkStatus, setBulkStatus] = useState('idle'); // idle, sending, paused, stopped, completed
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotalMessages, setBulkTotalMessages] = useState(0);
  const [bulkLogs, setBulkLogs] = useState([]);
  const [appendCounter, setAppendCounter] = useState(false);
  const bulkCancelRef = useRef(false);
  const [waTemplates, setWaTemplates] = useState([]);
  const [selectedWaTemplate, setSelectedWaTemplate] = useState('');

  // Email Bulk Sender states
  const [emailSmtpHost, setEmailSmtpHost] = useState('smtp.gmail.com');
  const [emailSmtpPort, setEmailSmtpPort] = useState('465');
  const [emailSmtpUser, setEmailSmtpUser] = useState(localStorage.getItem('emailSmtpUser') || '');
  const [emailSmtpPass, setEmailSmtpPass] = useState(localStorage.getItem('emailSmtpPass') || '');
  const [emailSmtpConnected, setEmailSmtpConnected] = useState(localStorage.getItem('emailSmtpConnected') === 'true');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle'); // idle, sending, completed
  const [emailProgress, setEmailProgress] = useState({ success: 0, fail: 0, total: 0 });
  const [emailLogs, setEmailLogs] = useState([]);
  const [broadcastStatus, setBroadcastStatus] = useState('idle');
  const [broadcastProgress, setBroadcastProgress] = useState(0);
  const [broadcastTotalMessages, setBroadcastTotalMessages] = useState(0);
  const [broadcastLogs, setBroadcastLogs] = useState([]);

  // Refs for socket subscription callbacks to avoid closure traps
  const selectedAgentRef = useRef(livechatSelectedAgent);
  const selectedContactRef = useRef(livechatSelectedContact);
  useEffect(() => { selectedAgentRef.current = livechatSelectedAgent; }, [livechatSelectedAgent]);
  useEffect(() => { selectedContactRef.current = livechatSelectedContact; }, [livechatSelectedContact]);

  useEffect(() => {
    if (token && role !== 'viewer') {
      fetchSessions();
      fetchWaTemplates();
      if (role !== 'admin') fetchMyLimit();
      // Setup socket listeners
      socket.on('qr', (data) => {
        setSessions(prev => prev.map(s => s.id === data.sessionId ? { ...s, qr: data.qr, status: 'qr' } : s));
      });

      socket.on('status', (data) => {
        setSessions(prev => prev.map(s => s.id === data.sessionId ? {
          ...s,
          status: data.status,
          qr: data.status === 'qr' ? s.qr : null,
          ...(data.whatsappName ? { whatsappName: data.whatsappName } : {}),
          ...(data.whatsappAvatar ? { whatsappAvatar: data.whatsappAvatar } : {})
        } : s));
      });

      socket.on('update_session', (data) => {
        setSessions(prev => prev.map(s => s.id === data.sessionId ? { ...s, ...data.data } : s));
      });

      socket.on('new_session', (data) => {
        setSessions(prev => [...prev, { ...data, status: 'initializing' }]);
      });

      socket.on('delete_session', (data) => {
        setSessions(prev => prev.filter(s => s.id !== data.sessionId));
      });

      socket.on('new_message', (data) => {
        // 1. If currently inside this conversation, append in real-time
        if (selectedAgentRef.current === data.sessionId && selectedContactRef.current === data.contact) {
          setLivechatMessages(prev => [...prev, data.message]);
          setTimeout(() => {
            if (livechatScrollerRef.current) {
              livechatScrollerRef.current.scrollTop = livechatScrollerRef.current.scrollHeight;
            }
          }, 50);
        }

        // 2. Adjust live thread preview and bump to top of active lists
        setLivechatChats(prev => {
          const index = prev.findIndex(c => c.contact === data.contact);
          if (index > -1) {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              last_message: data.message.message_text,
              last_direction: data.message.direction,
              last_msg_time: data.message.timestamp
            };
            return updated.sort((a, b) => b.last_msg_time - a.last_msg_time);
          } else {
            return [{
              contact: data.contact,
              last_message: data.message.message_text,
              last_direction: data.message.direction,
              last_msg_time: data.message.timestamp
            }, ...prev];
          }
        });
      });

      // Real-time scheduled message status updates
      socket.on('scheduled_update', (data) => {
        setScheduledList(prev => prev.map(item =>
          item.id === data.id ? { ...item, status: data.status } : item
        ));
      });
    }

    return () => {
      socket.off('qr');
      socket.off('status');
      socket.off('update_session');
      socket.off('new_session');
      socket.off('delete_session');
      socket.off('new_message');
      socket.off('scheduled_update');
    };
  }, [token]);

  // Load contextual sub-data when tabs change
  useEffect(() => {
    if (!token) return;
    if (activeTab === 'crm' && sessions.length > 0) {
      fetchCRMContacts(sessions[0].id);
    }
    if (activeTab === 'livechat') {
      if (sessions.length > 0) {
        const defaultId = livechatSelectedAgent || sessions[0].id;
        setLivechatSelectedAgent(defaultId);
        fetchLivechatThreads(defaultId);
      }
    }
    if (activeTab === 'rules') {
      if (sessions.length > 0) {
        const defaultId = selectedAgentForRule || sessions[0].id;
        setSelectedAgentForRule(defaultId);
        fetchRules(defaultId);
      }
    }
    if (activeTab === 'analytics') {
      if (sessions.length > 0) {
        const defaultId = selectedAgentForAnalytics || sessions[0].id;
        setSelectedAgentForAnalytics(defaultId);
        fetchAnalytics(defaultId);
      }
    }
    if (activeTab === 'broadcast') {
      if (sessions.length > 0) {
        const defaultId = selectedAgentForBroadcast || sessions[0].id;
        setSelectedAgentForBroadcast(defaultId);
        fetchScheduled(defaultId);
      }
    }
    if (activeTab === 'bulksender') {
      if (sessions.length > 0 && !selectedAgentForBulk) {
        setSelectedAgentForBulk(sessions[0].id);
      }
    }
    if (activeTab === 'sandbox') {
      if (sessions.length > 0 && !selectedAgentForSandbox) {
        setSelectedAgentForSandbox(sessions[0].id);
        setSandboxMessages([
          { sender: 'agent', text: `Hello! I am ${sessions[0].name}. Test chat with me here to see how I reply based on my prompts or rules!` }
        ]);
        // Seed default sandbox data so history queries don't crash
        api.post(`/api/sessions/${sessions[0].id}/test`, { message: 'hi' }).catch(() => { });
      }
    }
    if (activeTab === 'admin' && role === 'admin') {
      fetchUsers();
    }
    if (activeTab === 'reseller' && role === 'admin') {
      fetchResellerUsers();
    }
  }, [activeTab, token, sessions.length, role]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/sessions');
      setSessions(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchResellerUsers = async () => {
    try {
      const res = await api.get('/api/admin/resellers');
      setResellerUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWaTemplates = async () => {
    try {
      const res = await api.get('/api/templates');
      setWaTemplates(res.data);
    } catch (err) {
      console.error('Error fetching WA templates:', err);
    }
  };

  const fetchMyLimit = async () => {
    try {
      const res = await api.get('/api/admin/users');
      const me = res.data.find(u => u.username === username);
      if (me) setMyMaxAgents(me.maxAgents !== undefined ? me.maxAgents : -1);
    } catch (err) { }
  };

  const handleUpdateLimit = async (userId, newLimit) => {
    try {
      await api.post(`/api/admin/users/${userId}/limits`, { maxAgents: newLimit });
      await fetchResellerUsers();
      setLimitModalUser(null);
      alert('Plan updated successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update limit');
    }
  };

  const handleAssignSession = async (sessionId, userId) => {
    try {
      const res = await api.post('/api/admin/assign-session', { sessionId, userId });
      setSessions(prev => prev.map(s => s.id === sessionId ? res.data.session : s));
    } catch (err) {
      console.error('Error assigning session:', err);
      alert(err.response?.data?.error || 'Failed to assign session');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        await axios.post(`${API}/api/auth/register`, { username: authUser, password: authPass });
        setAuthMode('login');
        setAuthError('');
        setAuthUser('');
        setAuthPass('');
        setAuthLoading(false);
        alert('Registration successful! Please login.');
        return;
      }
      const res = await axios.post(`${API}/api/auth/login`, { username: authUser, password: authPass });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      localStorage.setItem('role', res.data.role);
      setToken(res.data.token);
      setUsername(res.data.username);
      setRole(res.data.role);
    } catch (err) {
      setAuthError(err.response?.data?.error || 'Something went wrong');
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('activeTab');
    setToken('');
    setUsername('');
    setRole('user');
    setActiveTab('agents');
    setSessions([]);
  };

  const handleUpdate = async (id, payload) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...payload } : s));
    try {
      await api.post(`/api/sessions/${id}/update`, payload);
    } catch (err) {
      console.error('Error updating session:', err);
    }
  };

  const addSession = async () => {
    try {
      await api.post('/api/sessions/add', { name: `Agent ${sessions.length + 1}` });
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Error adding agent';
      console.error('Error adding session:', err);
      alert(errMsg);
    }
  };

  const deleteSession = async (id) => {
    if (confirm('Permanently delete this AI agent? This cannot be undone.')) {
      try {
        await api.post(`/api/sessions/${id}/delete`);
        setSessions(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        console.error('Error deleting session:', err);
      }
    }
  };

  const logoutSession = async (id) => {
    if (confirm('Disconnect this agent from WhatsApp?')) {
      try {
        await api.post(`/api/sessions/${id}/logout`);
      } catch (err) {
        console.error('Error disconnecting:', err);
      }
    }
  };

  // Preset prompt loader
  const applyPreset = async (sessionId, promptText) => {
    await handleUpdate(sessionId, { prompt: promptText });
    alert('AI prompt template loaded successfully!');
  };

  // Rules management
  const fetchRules = async (sessId) => {
    try {
      const res = await api.get(`/api/rules/${sessId}`);
      setRules(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!selectedAgentForRule) return alert('Please select an agent from the list above first.');
    if (!newKeyword.trim() || !newReply.trim()) return;
    try {
      await api.post('/api/rules/add', {
        sessionId: selectedAgentForRule,
        keyword: newKeyword.trim(),
        reply: newReply.trim(),
        matchType: newMatchType
      });
      setNewKeyword('');
      setNewReply('');
      fetchRules(selectedAgentForRule);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.message || 'Error adding rule');
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      await api.delete(`/api/rules/${id}`);
      fetchRules(selectedAgentForRule);
    } catch (err) {
      console.error(err);
    }
  };

  // CRM Contacts management
  const fetchCRMContacts = async (sessId) => {
    try {
      const res = await api.get(`/api/contacts/${sessId}`);
      setContacts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleContactUpdate = async (id, field, value) => {
    try {
      await api.post(`/api/contacts/${id}/update`, { [field]: value });
      setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    } catch (err) {
      console.error(err);
    }
  };

  // Live Chat management
  const fetchLivechatThreads = async (sessId) => {
    try {
      const res = await api.get(`/api/chats/${sessId}`);
      setLivechatChats(res.data);
      if (res.data.length > 0) {
        const firstContact = res.data[0].contact;
        setLivechatSelectedContact(firstContact);
        fetchLivechatMessages(sessId, firstContact);
      } else {
        setLivechatSelectedContact('');
        setLivechatMessages([]);
      }
    } catch (err) {
      console.error('Error loading chat threads:', err);
    }
  };

  const fetchLivechatMessages = async (sessId, contactJid) => {
    try {
      const res = await api.get(`/api/chats/${sessId}/${contactJid}`);
      setLivechatMessages(res.data);
      setTimeout(() => {
        if (livechatScrollerRef.current) {
          livechatScrollerRef.current.scrollTop = livechatScrollerRef.current.scrollHeight;
        }
      }, 50);
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };

  const handleSendLivechatMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!livechatInput.trim() || !livechatSelectedAgent || !livechatSelectedContact) return;
    const txt = livechatInput.trim();
    setLivechatInput('');
    try {
      await api.post('/api/chats/send', {
        sessionId: livechatSelectedAgent,
        contact: livechatSelectedContact,
        message: txt
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send message.');
    }
  };

  const handleSendLivechatMedia = async (file, caption) => {
    if (!livechatSelectedAgent || !livechatSelectedContact) {
      alert('Please select an agent and a contact first.');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', livechatSelectedAgent);
      formData.append('contact', livechatSelectedContact);
      formData.append('caption', caption || '');
      await api.post('/api/chats/send-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send media.');
    }
  };

  // Bulk Message Sender Handlers
  const handleStartBulkSend = async () => {
    if (!selectedAgentForBulk) {
      alert('Please select an agent first!');
      return;
    }
    if (!bulkPhones.trim()) {
      alert('Please enter at least one phone number!');
      return;
    }
    if (!bulkMessage.trim()) {
      alert('Please enter a message!');
      return;
    }
    if (bulkCount <= 0) {
      alert('Quantity must be 1 or more!');
      return;
    }

    // Parse all phone numbers (comma, newline, or space separated)
    const phoneList = bulkPhones
      .split(/[,\n\r]+/)
      .map(n => n.replace(/[^0-9]/g, ''))
      .filter(n => n.length >= 8);

    if (phoneList.length === 0) {
      alert('No valid phone numbers found!');
      return;
    }

    const totalMessages = phoneList.length * bulkCount;
    const selectedAgentName = sessions.find(s => s.id === selectedAgentForBulk)?.name || selectedAgentForBulk;

    setBulkStatus('sending');
    setBulkProgress(0);
    setBulkTotalMessages(totalMessages);
    setBulkLogs([{ time: new Date().toLocaleTimeString(), text: `🚀 Starting bulk send via Agent: [${selectedAgentName}]`, type: 'info' },
    { time: new Date().toLocaleTimeString(), text: `📋 ${phoneList.length} numbers × ${bulkCount} msgs = ${totalMessages} total messages`, type: 'info' }]);
    bulkCancelRef.current = false;

    let sent = 0;

    for (let numIdx = 0; numIdx < phoneList.length; numIdx++) {
      if (bulkCancelRef.current) break;

      const rawPhone = phoneList[numIdx];
      const phone = rawPhone + '@s.whatsapp.net';

      setBulkLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `──── Number ${numIdx + 1}/${phoneList.length}: ${rawPhone} ────`, type: 'info' }]);

      for (let msgIdx = 0; msgIdx < bulkCount; msgIdx++) {
        if (bulkCancelRef.current) break;

        const countSuffix = appendCounter ? ` (${msgIdx + 1}/${bulkCount})` : '';

        let textToSend = '';
        let mediaUrlToSend = null;
        let buttonsToSend = null;

        if (selectedWaTemplate) {
          const template = waTemplates.find(t => t.id === selectedWaTemplate);
          if (template) {
            const components = typeof template.components === 'string' ? JSON.parse(template.components) : template.components;
            const header = components.header;
            const bodyTextRaw = components.body;
            const footer = components.footer;

            if (components.buttons && components.buttons.length > 0) {
              buttonsToSend = components.buttons;
            }

            if (header && header.text) textToSend += `*${header.text}*\n\n`;
            if (header && header.mediaUrl) mediaUrlToSend = header.mediaUrl;
            if (bodyTextRaw) {
              let bodyText = bodyTextRaw.replace(/<br\s*[\/]?>/gi, '\n')
                .replace(/<\/p>\s*<p>/gi, '\n\n')
                .replace(/<p[^>]*>/gi, '')
                .replace(/<\/p>/gi, '')
                .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
                .replace(/<b>(.*?)<\/b>/gi, '*$1*')
                .replace(/<em>(.*?)<\/em>/gi, '_$1_')
                .replace(/<i>(.*?)<\/i>/gi, '_$1_')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/<[^>]+>/g, '');
              textToSend += `${bodyText}\n\n`;
            }
            if (footer) textToSend += `_${footer}_\n`;
          }
        } else {
          let formattedMessage = bulkMessage;
          // Convert HTML to WhatsApp Markdown if it comes from ReactQuill
          if (formattedMessage.includes('<')) {
            formattedMessage = formattedMessage.replace(/<br\s*[\/]?>/gi, '\n')
              .replace(/<\/p>\s*<p>/gi, '\n\n')
              .replace(/<p[^>]*>/gi, '')
              .replace(/<\/p>/gi, '')
              .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
              .replace(/<b>(.*?)<\/b>/gi, '*$1*')
              .replace(/<em>(.*?)<\/em>/gi, '_$1_')
              .replace(/<i>(.*?)<\/i>/gi, '_$1_')
              .replace(/<s>(.*?)<\/s>/gi, '~$1~')
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
          }
          textToSend = formattedMessage;
        }

        textToSend = `${textToSend.trim()}${countSuffix}`;

        try {
          setBulkLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `→ Sending to ${rawPhone} [${msgIdx + 1}/${bulkCount}]...`, type: 'sending' }]);

          await api.post('/api/chats/send', {
            sessionId: selectedAgentForBulk,
            contact: phone,
            message: textToSend,
            mediaUrl: mediaUrlToSend,
            buttons: buttonsToSend
          });

          sent++;
          setBulkProgress(sent);
          setBulkLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `✅ Sent to ${rawPhone} [${msgIdx + 1}/${bulkCount}]`, type: 'success' }]);
        } catch (error) {
          const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
          setBulkLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `❌ Failed ${rawPhone} [${msgIdx + 1}]: ${errorMsg}`, type: 'error' }]);

          if (errorMsg.toLowerCase().includes('not ready') || errorMsg.toLowerCase().includes('connect') || errorMsg.toLowerCase().includes('client')) {
            setBulkStatus('stopped');
            setBulkLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: '🔴 Aborting: WhatsApp client disconnected!', type: 'error' }]);
            return;
          }
        }

        // Delay between messages (random or fixed)
        if (!bulkCancelRef.current && !(numIdx === phoneList.length - 1 && msgIdx === bulkCount - 1)) {
          const actualDelayMins = useRandomDelay
            ? Math.floor(Math.random() * (bulkDelayMax - bulkDelay + 1)) + bulkDelay
            : bulkDelay;
          setBulkLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `⏳ Waiting ${actualDelayMins}m before next message...`, type: 'info' }]);
          await new Promise(resolve => setTimeout(resolve, actualDelayMins * 60000));
        }
      }
    }

    if (!bulkCancelRef.current && sent === totalMessages) {
      setBulkStatus('completed');
      setBulkLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `🎉 All ${totalMessages} messages sent successfully!`, type: 'info' }]);
    }
  };

  const handlePauseBulkSend = () => {
    bulkCancelRef.current = true;
    setBulkStatus('paused');
    setBulkLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: '⏸️ Bulk sending paused.', type: 'warn' }]);
  };

  const handleStopBulkSend = () => {
    bulkCancelRef.current = true;
    setBulkStatus('stopped');
    setBulkLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: '⏹️ Bulk sending stopped.', type: 'warn' }]);
  };

  const handleResetBulkSend = () => {
    bulkCancelRef.current = true;
    setBulkStatus('idle');
    setBulkProgress(0);
    setBulkTotalMessages(0);
    setBulkLogs([]);
  };

  // --- BULK EMAIL LOGIC ---
  const handleSaveSmtp = async (e) => {
    e.preventDefault();
    if (!emailSmtpUser || !emailSmtpPass) {
      alert("Please enter both Email and App Password.");
      return;
    }

    setEmailStatus('sending');
    try {
      await api.post('/api/email/verify-smtp', {
        smtpHost: emailSmtpHost,
        smtpPort: emailSmtpPort,
        smtpUser: emailSmtpUser,
        smtpPass: emailSmtpPass
      });

      localStorage.setItem('emailSmtpUser', emailSmtpUser);
      localStorage.setItem('emailSmtpPass', emailSmtpPass);
      localStorage.setItem('emailSmtpConnected', 'true');
      setEmailSmtpConnected(true);
      alert("SMTP Connected Successfully!");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to verify SMTP credentials");
      setEmailSmtpConnected(false);
    }
    setEmailStatus('idle');
  };

  const handleDeactivateSmtp = () => {
    localStorage.setItem('emailSmtpConnected', 'false');
    setEmailSmtpConnected(false);
  };

  const handleStartEmailBulkSend = async () => {
    if (!emailSmtpHost || !emailSmtpUser || !emailSmtpPass || !emailSubject || !emailBody || !emailRecipients.trim()) {
      alert("Please fill in all email configuration, composer, and recipient fields.");
      return;
    }

    const recipients = emailRecipients.split(/[,\n\r]+/).map(e => e.trim()).filter(e => e && e.includes('@'));
    if (recipients.length === 0) {
      alert("No valid email addresses found!");
      return;
    }

    setEmailStatus('sending');
    setEmailProgress({ success: 0, fail: 0, total: recipients.length });
    setEmailLogs([{ time: new Date().toLocaleTimeString(), text: `Starting bulk email to ${recipients.length} recipients...`, type: 'info' }]);

    try {
      const res = await api.post('/api/email/bulk-send', {
        smtpHost: emailSmtpHost,
        smtpPort: emailSmtpPort,
        smtpUser: emailSmtpUser,
        smtpPass: emailSmtpPass,
        subject: emailSubject,
        htmlBody: emailBody,
        recipients
      });

      setEmailStatus('completed');
      setEmailProgress({ success: res.data.results.successCount, fail: res.data.results.failCount, total: recipients.length });
      setEmailLogs(prev => [
        ...prev,
        { time: new Date().toLocaleTimeString(), text: `✅ Successfully sent: ${res.data.results.successCount}`, type: 'success' },
        { time: new Date().toLocaleTimeString(), text: `❌ Failed: ${res.data.results.failCount}`, type: res.data.results.failCount > 0 ? 'error' : 'info' }
      ]);

      if (res.data.results.errors.length > 0) {
        res.data.results.errors.forEach(err => {
          setEmailLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `Error sending to ${err.email}: ${err.error}`, type: 'error' }]);
        });
      }

    } catch (err) {
      setEmailStatus('completed');
      const errMsg = err.response?.data?.error || err.message;
      setEmailLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `Error: ${errMsg}`, type: 'error' }]);
      alert(`Failed to send emails: ${errMsg}`);
    }
  };

  const handleResetEmailBulkSend = () => {
    setEmailStatus('idle');
    setEmailProgress({ success: 0, fail: 0, total: 0 });
    setEmailLogs([]);
  };

  // ─── XLSX Import: Phone Numbers ───
  const handleExcelUploadPhones = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const phones = [];
        rows.forEach((row, i) => {
          row.forEach(cell => {
            if (cell === null || cell === undefined) return;
            const val = String(cell).trim().replace(/[^0-9]/g, '');
            if (val.length >= 8) phones.push(val);
          });
        });
        if (phones.length === 0) {
          alert('کوئی valid phone number نہیں ملا۔ Column کا نام یا data check کریں!');
          return;
        }
        setBulkPhones(phones.join('\n'));
        alert(`✅ ${phones.length} phone numbers import ہو گئے Excel سے!`);
      } catch (err) {
        alert('File read error: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ─── XLSX Import: Email Addresses ───
  const handleExcelUploadEmails = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const emails = [];
        rows.forEach(row => {
          row.forEach(cell => {
            if (cell === null || cell === undefined) return;
            const val = String(cell).trim();
            if (val.includes('@') && val.includes('.')) emails.push(val);
          });
        });
        if (emails.length === 0) {
          alert('No valid email address found. Please check the column name or data');
          return;
        }
        setEmailRecipients(emails.join('\n'));
        alert(`✅ ${emails.length} email addresses import successfully from Excel!`);
      } catch (err) {
        alert('File read error: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // ─── XLSX Import: Broadcast Numbers ───
  const handleExcelUploadBroadcast = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const phones = [];
        rows.forEach(row => {
          row.forEach(cell => {
            if (cell === null || cell === undefined) return;
            const val = String(cell).trim().replace(/[^0-9]/g, '');
            if (val.length >= 8) phones.push(val);
          });
        });
        if (phones.length === 0) {
          alert('No valid Phone number found. Please check the column name or data');
          return;
        }
        setBroadcastNumbers(prev => {
          const existing = prev.trim();
          return existing ? existing + ',\n' + phones.join(',\n') : phones.join(',\n');
        });
        alert(`✅ ${phones.length} phone numbers import successfully from Excel to Broadcast!`);
      } catch (err) {
        alert('File read error: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Analytics management
  const fetchAnalytics = async (sessId) => {
    try {
      const res = await api.get(`/api/analytics/${sessId}`);
      setAnalyticsData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Broadcast & Scheduler
  const fetchScheduled = async (sessId) => {
    try {
      const res = await api.get(`/api/scheduled/${sessId}`);
      setScheduledList(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleScheduleMessage = async (e) => {
    e.preventDefault();
    if (!schedContact || !schedMessage || !schedDate || !schedTime) {
      alert('Please fill in all scheduled message details.');
      return;
    }
    const scheduledTime = new Date(`${schedDate}T${schedTime}`).getTime();
    if (scheduledTime < Date.now()) {
      alert('Please select a future time.');
      return;
    }
    try {
      let phone = schedContact.trim();
      if (!phone.includes('@')) phone += '@s.whatsapp.net';
      await api.post('/api/scheduled/add', {
        sessionId: selectedAgentForBroadcast,
        contact: phone,
        message: schedMessage,
        scheduledTime
      });
      setSchedContact('');
      setSchedMessage('');
      setSchedDate('');
      setSchedTime('');
      fetchScheduled(selectedAgentForBroadcast);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteScheduled = async (id) => {
    try {
      await api.delete(`/api/scheduled/${id}`);
      fetchScheduled(selectedAgentForBroadcast);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastNumbers.trim() || (!bulkMessage.trim() && !selectedWaTemplate)) return;
    const nums = broadcastNumbers.split(/[,\n\r]+/).map(n => n.replace(/[^0-9]/g, '')).filter(n => n.length >= 8);
    if (nums.length === 0) {
      alert('No valid phone numbers found!');
      return;
    }

    if (confirm(`Blast message to ${nums.length} numbers? Messages will be sent with safe delays.`)) {
      try {
        setBroadcastStatus('sending');
        setBroadcastTotalMessages(nums.length);
        setBroadcastProgress(0);
        setBroadcastLogs([{ time: new Date().toLocaleTimeString(), text: `🚀 Starting broadcast queue...`, type: 'info' }]);
        
        let textToSend = '';
        let mediaUrlToSend = null;
        let buttonsToSend = null;

        if (selectedWaTemplate) {
          const template = waTemplates.find(t => t.id === selectedWaTemplate);
          if (template) {
            const components = typeof template.components === 'string' ? JSON.parse(template.components) : template.components;
            const header = components.header;
            const bodyTextRaw = components.body;
            const footer = components.footer;

            if (components.buttons && components.buttons.length > 0) {
              buttonsToSend = components.buttons;
            }

            if (header && header.text) textToSend += `*${header.text}*\n\n`;
            if (header && header.mediaUrl) mediaUrlToSend = header.mediaUrl;
            if (bodyTextRaw) {
              let bodyText = bodyTextRaw.replace(/<br\s*[\/]?>/gi, '\n')
                .replace(/<\/p>\s*<p>/gi, '\n\n')
                .replace(/<p[^>]*>/gi, '')
                .replace(/<\/p>/gi, '')
                .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
                .replace(/<b>(.*?)<\/b>/gi, '*$1*')
                .replace(/<em>(.*?)<\/em>/gi, '_$1_')
                .replace(/<i>(.*?)<\/i>/gi, '_$1_')
                .replace(/<[^>]+>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
              textToSend += `${bodyText}\n\n`;
            }
            if (footer) textToSend += `_${footer}_\n`;
          }
        } else {
          let formattedMessage = bulkMessage;
          if (formattedMessage.includes('<')) {
            formattedMessage = formattedMessage.replace(/<br\s*[\/]?>/gi, '\n')
              .replace(/<\/p>\s*<p>/gi, '\n\n')
              .replace(/<p[^>]*>/gi, '')
              .replace(/<\/p>/gi, '')
              .replace(/<strong>(.*?)<\/strong>/gi, '*$1*')
              .replace(/<b>(.*?)<\/b>/gi, '*$1*')
              .replace(/<em>(.*?)<\/em>/gi, '_$1_')
              .replace(/<i>(.*?)<\/i>/gi, '_$1_')
              .replace(/<s>(.*?)<\/s>/gi, '~$1~')
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
          }
          textToSend = formattedMessage;
        }

        textToSend = textToSend.trim();

        let accumulatedDelay = 1000;

        for (let i = 0; i < nums.length; i++) {
          let phone = nums[i];
          if (!phone.includes('@')) phone += '@s.whatsapp.net';
          
          if (i > 0) {
             const actualDelayMins = useRandomDelay
                ? Math.floor(Math.random() * (bulkDelayMax - bulkDelay + 1)) + bulkDelay
                : bulkDelay;
             accumulatedDelay += (actualDelayMins * 60000);
             setBroadcastLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `⏳ Waiting ${actualDelayMins}m before next message...`, type: 'info' }]);
          }

          const staggeredTime = Date.now() + accumulatedDelay;

          setBroadcastLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `⏳ Queuing message for ${phone.replace('@s.whatsapp.net','')}`, type: 'info' }]);

          await api.post('/api/scheduled/add', {
            sessionId: selectedAgentForBroadcast,
            contact: phone,
            message: textToSend,
            scheduledTime: staggeredTime,
            isBroadcast: true
          });

          setBroadcastProgress(i + 1);
          setBroadcastLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: `✅ Queued successfully for ${phone.replace('@s.whatsapp.net','')}`, type: 'success' }]);
        }
        setBroadcastNumbers('');
        setBroadcastMessage('');
        setBroadcastStatus('completed');
        fetchScheduled(selectedAgentForBroadcast);
        alert(`✅ ${nums.length} messages queued! They will send automatically with safe delays.`);
      } catch (err) {
        setBroadcastStatus('stopped');
        console.error(err);
        alert('Error queuing broadcast messages: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  // Sandbox Live Test Simulator
  const handleSandboxSend = async (e) => {
    e.preventDefault();
    if (!sandboxInput.trim() || !selectedAgentForSandbox) return;

    const userMsg = sandboxInput.trim();
    setSandboxMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setSandboxInput('');
    setSandboxTyping(true);

    // Scroll to bottom
    setTimeout(() => {
      if (chatScrollerRef.current) chatScrollerRef.current.scrollTop = chatScrollerRef.current.scrollHeight;
    }, 50);

    try {
      const res = await api.post(`/api/sessions/${selectedAgentForSandbox}/test`, { message: userMsg });

      // Simulate typing speed for wow factor
      setTimeout(() => {
        setSandboxTyping(false);
        setSandboxMessages(prev => [...prev, { sender: 'agent', text: res.data.reply }]);
        setTimeout(() => {
          if (chatScrollerRef.current) chatScrollerRef.current.scrollTop = chatScrollerRef.current.scrollHeight;
        }, 50);
      }, 800);
    } catch (err) {
      setSandboxTyping(false);
      setSandboxMessages(prev => [...prev, { sender: 'agent', text: 'Error simulating bot reply. Make sure backend server is running.' }]);
    }
  };

  // Pagination & Search in Agent Hub
  const filteredSessions = useMemo(() => {
    return sessions.filter(s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sessions, searchQuery]);

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const currentSessions = filteredSessions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // CRM Contact filtering
  const filteredContacts = useMemo(() => {
    return contacts.filter(c =>
      c.phone.toLowerCase().includes(crmSearch.toLowerCase()) ||
      (c.name && c.name.toLowerCase().includes(crmSearch.toLowerCase())) ||
      (c.tags && c.tags.toLowerCase().includes(crmSearch.toLowerCase()))
    );
  }, [contacts, crmSearch]);

  // Auth screen loader
  if (!token) {
    return (
      <div className="auth-container">
        <div className="mesh-gradient"></div>
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon-ring" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}><img src={callIcon} alt="Call Anexa Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
            <h2>Call Anexa</h2>
            <p>{authMode === 'login' ? 'Manage your automated agents in a premium dashboard' : 'Join and deploy smart auto-reply bots'}</p>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {authError && <div className="auth-error">{authError}</div>}

            <div className="input-group">
              <label>Username</label>
              <div className="input-wrapper">
                <Users size={18} className="input-icon" />
                <input
                  type="text"
                  placeholder="Enter username"
                  value={authUser}
                  onChange={e => setAuthUser(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="input-group">
              <label>Password</label>
              <div className="input-wrapper">
                <ShieldCheck size={18} className="input-icon" />
                <input
                  type="password"
                  placeholder="Enter password"
                  value={authPass}
                  onChange={e => setAuthPass(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="auth-btn" disabled={authLoading}>
              {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Access Workspace' : 'Register Account')}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {authMode === 'login' ? "New to the platform?" : "Already registered?"}
              <button className="text-btn" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); }}>
                {authMode === 'login' ? 'Create one now' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <div className="mesh-gradient"></div>

      {/* PERSISTENT SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-glow" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={callIcon} alt="Call Anexa Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h2>CALL ANEXA</h2>
        </div>

        <nav className="sidebar-menu">
          <button
            className={`menu-item ${activeTab === 'agents' ? 'active' : ''}`}
            onClick={() => setActiveTab('agents')}
          >
            <Smartphone size={18} className="menu-item-icon" />
            <span>Agent Hub</span>
          </button>

          {/* <button
            className={`menu-item ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <Sparkles size={18} className="menu-item-icon" />
            <span>AI Prompts</span>
          </button> */}

          <button
            className={`menu-item ${activeTab === 'inbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('inbox')}
          >
            <Inbox size={18} className="menu-item-icon" />
            <span>Inbox</span>
          </button>

          {/* <button
            className={`menu-item ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <Sliders size={18} className="menu-item-icon" />
            <span>Keyword Rules</span>
          </button> */}

          {/* <button
            className={`menu-item ${activeTab === 'crm' ? 'active' : ''}`}
            onClick={() => setActiveTab('crm')}
          >
            <Users size={18} className="menu-item-icon" />
            <span>Smart CRM</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'livechat' ? 'active' : ''}`}
            onClick={() => setActiveTab('livechat')}
          >
            <MessageSquare size={18} className="menu-item-icon" />
            <span>Live Chat</span>
          </button> */}

          <button
            className={`menu-item ${activeTab === 'broadcast' ? 'active' : ''}`}
            onClick={() => setActiveTab('broadcast')}
          >
            <Calendar size={18} className="menu-item-icon" />
            <span>Broadcaster</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'bulksender' ? 'active' : ''}`}
            onClick={() => setActiveTab('bulksender')}
          >
            <Send size={18} className="menu-item-icon" />
            <span>Bulk Sender</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'email-sender' ? 'active' : ''}`}
            onClick={() => setActiveTab('email-sender')}
          >
            <MessageSquare size={18} className="menu-item-icon" />
            <span>Email Sender</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={18} className="menu-item-icon" />
            <span>Dashboard</span>
          </button>

          <button
            className={`menu-item ${activeTab === 'sandbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('sandbox')}
          >
            <Play size={18} className="menu-item-icon" />
            <span>Sandbox Test</span>
          </button>

          {role === 'admin' && (
            <button
              className={`menu-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <ShieldCheck size={18} className="menu-item-icon" />
              <span>Admin Control</span>
            </button>
          )}

          {role === 'admin' && (
            <button
              className={`menu-item ${activeTab === 'reseller' ? 'active' : ''}`}
              onClick={() => { setActiveTab('reseller'); fetchResellerUsers(); }}
            >
              <LayoutGrid size={18} className="menu-item-icon" />
              <span>Reseller Panel</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar-initial">{username.charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <h4>{username}</h4>
              <p>{role === 'admin' ? 'System Administrator' : 'Manager Account'}</p>
            </div>
          </div>
          <button className="logout-action-btn" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="main-content">

        {/* ======================== TAB: AGENT HUB ======================== */}
        {activeTab === 'agents' && (
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <div className="welcome-chip">⚡ Welcome to your Workspace</div>
                <h1>WhatsApp Agents Hub</h1>
                <p>Manage your linked WhatsApp numbers, customize system prompts, set reply delays and providers.</p>
              </div>
              <div className="header-action-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                {role !== 'admin' && myMaxAgents !== -1 && (
                  <div style={{ fontSize: '0.78rem', color: sessions.length >= myMaxAgents ? 'var(--danger, #f87171)' : 'var(--cyber-blue, #38bdf8)', background: 'rgba(56,189,248,0.08)', border: '1px solid', borderColor: sessions.length >= myMaxAgents ? 'rgba(248,113,113,0.3)' : 'rgba(56,189,248,0.25)', borderRadius: '8px', padding: '0.3rem 0.8rem', fontWeight: 600 }}>
                    🤖 Agents: {sessions.length} / {myMaxAgents}
                  </div>
                )}
                <button className="btn-premium primary" onClick={addSession}>
                  <Plus size={18} /> Add New Agent
                </button>
              </div>
            </header>

            <div className="toolbar-flex">
              <div className="search-box-wrapper">
                <MessageSquare className="search-icon-inside" size={18} />
                <input
                  type="text"
                  className="search-box"
                  placeholder="Search agents by name or id..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>

            {currentSessions.length === 0 ? (
              <div className="empty-state-cyber">
                <Smartphone size={64} className="text-muted" />
                <h3>No active agents found</h3>
                <p>Add your first agent to connect your WhatsApp account via QR code.</p>
                <button className="btn-premium primary" onClick={addSession} style={{ marginTop: '1.25rem' }}>
                  <Plus size={18} /> Add First Agent
                </button>
              </div>
            ) : (
              <div className="bento-grid">
                {currentSessions.map((session) => (
                  <div key={session.id} className="bento-card">

                    <div className="card-top">
                      <div className="agent-profile">
                        <div className="avatar-box" style={session.whatsappAvatar ? { padding: 0, overflow: 'hidden', background: 'transparent', border: '2px solid var(--accent)' } : {}}>
                          {session.whatsappAvatar ? (
                            <img
                              src={session.whatsappAvatar}
                              alt={session.whatsappName || session.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }}
                              onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'; }}
                            />
                          ) : (
                            <MessageSquare size={22} />
                          )}
                        </div>
                        <div className="agent-info">
                          {editingName === session.id ? (
                            <input
                              type="text"
                              className="input-field-glow"
                              defaultValue={session.name}
                              onBlur={(e) => {
                                setEditingName(null);
                                if (e.target.value.trim() && e.target.value.trim() !== session.name) {
                                  handleUpdate(session.id, { name: e.target.value.trim() });
                                }
                              }}
                              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                              autoFocus
                            />
                          ) : (
                            <h3 onClick={() => setEditingName(session.id)}>
                              {session.name} <Edit2 size={12} className="edit-btn-icon" />
                            </h3>
                          )}
                          {session.whatsappName && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--cyber-green)', fontWeight: '600', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <span style={{ fontSize: '0.7rem' }}>✅</span> {session.whatsappName}
                            </p>
                          )}
                          <p style={{ marginTop: session.whatsappName ? '0.1rem' : undefined }}>{session.id}</p>
                          {role === 'admin' && (
                            <p className="owner-tag" style={{ fontSize: '0.75rem', color: 'var(--accent)', marginTop: '0.25rem' }}>
                              Owner: {session.ownerName || 'Unassigned'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`status-pill-badge ${session.status}`}>
                        <span className="pulse-dot"></span>
                        {session.status === 'authenticated' || session.status === 'ready' ? 'Connected' :
                          session.status === 'qr' ? 'Pending Scan' : 'Waking up'}
                      </div>
                    </div>

                    <div className="card-options-list">
                      <div className="option-row">
                        <div className="option-title">
                          <Activity size={14} className="cyber-green" />
                          <span>Auto-Reply Active</span>
                        </div>
                        <label className="glowing-toggle">
                          <input
                            type="checkbox"
                            checked={!!session.isActive}
                            onChange={(e) => handleUpdate(session.id, { isActive: e.target.checked })}
                          />
                          <span className="glowing-slider"></span>
                        </label>
                      </div>

                      <div className="option-row">
                        <div className="option-title">
                          <Brain size={14} className="cyber-orange" />
                          <span>Private Chats Active</span>
                        </div>
                        <label className="glowing-toggle">
                          <input
                            type="checkbox"
                            checked={session.allowPrivate !== undefined ? !!session.allowPrivate : true}
                            onChange={(e) => handleUpdate(session.id, { allowPrivate: e.target.checked })}
                          />
                          <span className="glowing-slider"></span>
                        </label>
                      </div>

                      <div className="option-row">
                        <div className="option-title">
                          <Users size={14} className="cyber-orange" />
                          <span>Group Chats Active</span>
                        </div>
                        <label className="glowing-toggle">
                          <input
                            type="checkbox"
                            checked={!!session.allowGroups}
                            onChange={(e) => handleUpdate(session.id, { allowGroups: e.target.checked })}
                          />
                          <span className="glowing-slider"></span>
                        </label>
                      </div>

                      <div className="option-row">
                        <div className="option-title">
                          <Clock size={14} className="cyber-blue" />
                          <span>Response Delay</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="number"
                            min="0" max="60"
                            className="delay-numeric-input"
                            value={session.replyDelay}
                            onChange={(e) => handleUpdate(session.id, { replyDelay: e.target.value })}
                          />
                          <span className="text-secondary" style={{ fontSize: '0.8rem' }}>sec</span>
                        </div>
                      </div>

                      <div className="option-row">
                        <div className="option-title">
                          <MessageSquare size={14} className="accent-light" />
                          <span>Messages Handled</span>
                        </div>
                        <span className="pill-indicator">{session.msgCount}</span>
                      </div>
                    </div>

                    {/* QR Code link display */}
                    {session.status === 'qr' && session.qr ? (
                      <div className="qr-glow-box">
                        <div className="qr-canvas-wrapper">
                          {session.qr.startsWith('data:') ? (
                            <img src={session.qr} alt="QR Code" width={130} height={130} />
                          ) : (
                            <QRCodeSVG value={session.qr} size={130} />
                          )}
                        </div>
                        <h4 className="cyber-orange">Link WhatsApp Agent</h4>
                        <p style={{ fontSize: '0.75rem' }}>Scan this QR code from your phone (WhatsApp Linked Devices) to authenticate.</p>
                      </div>
                    ) : (session.status === 'ready' || session.status === 'authenticated') ? (
                      <div className="connected-box">
                        <div className="connected-glow-ring">
                          <ShieldCheck size={28} />
                        </div>
                        <h4 className="cyber-green">Agent Online</h4>
                        <p style={{ fontSize: '0.75rem' }}>Listening to inbound chats in real-time, matching rules, and applying AI brain.</p>
                      </div>
                    ) : (
                      <div className="connected-box" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <RefreshCw className="spin text-muted" size={24} style={{ animation: 'spin 2s linear infinite' }} />
                        <h4 className="text-secondary">Initializing Connection</h4>
                        <p style={{ fontSize: '0.75rem' }}>Authenticating credential directory and starting listener sock...</p>
                      </div>
                    )}

                    {/* Expanded AI Settings */}
                    <div className="card-expandable-section">
                      <button
                        className="card-expand-toggle"
                        onClick={() => setExpandedCard(expandedCard === session.id ? null : session.id)}
                      >
                        <span>🤖 Configure AI Brain</span>
                        {expandedCard === session.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {expandedCard === session.id && (
                        <div className="ai-dropdown-config">
                          <div className="option-row">
                            <div className="option-title">
                              <Sparkles size={14} className="cyber-orange" />
                              <span>AI Engine Mode</span>
                            </div>
                            <label className="glowing-toggle">
                              <input
                                type="checkbox"
                                checked={!!session.aiEnabled}
                                onChange={(e) => handleUpdate(session.id, { aiEnabled: e.target.checked })}
                              />
                              <span className="glowing-slider"></span>
                            </label>
                          </div>

                          <div className="input-group">
                            <label style={{ fontSize: '0.7rem' }}>AI Provider</label>
                            <select
                              value={session.aiProvider || 'none'}
                              onChange={(e) => handleUpdate(session.id, { aiProvider: e.target.value })}
                              className="input-field-glow"
                              style={{ paddingLeft: '0.5rem' }}
                            >
                              <option value="none">None (Manual Prompt Rules)</option>
                              <option value="openai">OpenAI (GPT Engine)</option>
                              <option value="gemini">Google Gemini Engine</option>
                              <option value="deepseek">DeepSeek AI Engine</option>
                            </select>
                          </div>

                          <div className="input-group">
                            <label style={{ fontSize: '0.7rem' }}>API Key</label>
                            <input
                              type="password"
                              className="input-field-glow"
                              placeholder="Enter provider key..."
                              value={session.aiApiKey || ''}
                              onChange={(e) => handleUpdate(session.id, { aiApiKey: e.target.value })}
                              style={{ paddingLeft: '0.5rem' }}
                            />
                          </div>

                          <div className="input-group">
                            <label style={{ fontSize: '0.7rem' }}>Model name</label>
                            <input
                              type="text"
                              className="input-field-glow"
                              placeholder="e.g. gpt-4, deepseek-chat"
                              value={session.aiModel || ''}
                              onChange={(e) => handleUpdate(session.id, { aiModel: e.target.value })}
                              style={{ paddingLeft: '0.5rem' }}
                            />
                          </div>

                          {(session.aiProvider === 'openai' || session.aiProvider === 'deepseek') && (
                            <div className="input-group">
                              <label style={{ fontSize: '0.7rem' }}>Custom Endpoint URL (Optional)</label>
                              <input
                                type="text"
                                className="input-field-glow"
                                placeholder="e.g. https://api.deepseek.com/v1"
                                value={session.aiCustomUrl || ''}
                                onChange={(e) => handleUpdate(session.id, { aiCustomUrl: e.target.value })}
                                style={{ paddingLeft: '0.5rem' }}
                              />
                            </div>
                          )}

                          {session.aiProvider !== 'none' && (
                            <div className="input-group">
                              <label style={{ fontSize: '0.7rem' }}>Context History Size (messages)</label>
                              <input
                                type="number"
                                min="1" max="50"
                                className="input-field-glow"
                                placeholder="e.g. 10"
                                value={session.aiMaxContext !== undefined ? session.aiMaxContext : 10}
                                onChange={(e) => handleUpdate(session.id, { aiMaxContext: e.target.value })}
                                style={{ paddingLeft: '0.5rem' }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="card-footer-box">
                      <div className="prompt-field-label">System Personality Instructions:</div>
                      <textarea
                        className="textarea-glow"
                        value={session.prompt || ''}
                        onChange={(e) => setSessions(prev => prev.map(s => s.id === session.id ? { ...s, prompt: e.target.value } : s))}
                        placeholder="e.g. You are a pizza delivery support assistant. Guide users on our menu..."
                      />
                      <div className="bento-button-row">
                        <button className="btn-premium primary" style={{ flexGrow: 1 }} onClick={() => handleUpdate(session.id, { prompt: session.prompt })}>
                          Save Prompt
                        </button>
                        {(session.status === 'ready' || session.status === 'authenticated') && (
                          <button className="btn-premium danger-soft" onClick={() => logoutSession(session.id)}>
                            Disconnect
                          </button>
                        )}
                        <button className="btn-premium danger-soft" onClick={() => deleteSession(session.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {session.aiEnabled && (
                      <div className="indicator-ai-badge">
                        <Zap size={10} /> AI: {session.aiProvider}
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================== TAB: PROMPT TEMPLATE STUDIO ======================== */}
        {false && activeTab === 'templates' && (
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <div className="welcome-chip">🤖 Template Catalog</div>
                <h1>AI Prompt Templates Library</h1>
                <p>Inject premium preset system prompts instantly into your agents to configure their response style in one-click.</p>
              </div>
            </header>

            {sessions.length === 0 ? (
              <div className="empty-state-cyber">
                <Bot size={64} className="text-muted" />
                <h3>No agents to customize</h3>
                <p>Create an agent first inside the Agent Hub tab before loading presets.</p>
              </div>
            ) : (
              <div className="board-container">
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Select Target Agent:</h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      className={`btn-premium ${selectedAgentForRule === s.id ? 'primary' : 'secondary'}`}
                      onClick={() => setSelectedAgentForRule(s.id)}
                    >
                      {s.name} ({s.id.slice(-5)})
                    </button>
                  ))}
                </div>

                <div className="template-grid">
                  {PRESET_TEMPLATES.map(tmpl => (
                    <div key={tmpl.id} className="template-card" onClick={() => applyPreset(selectedAgentForRule || sessions[0].id, tmpl.prompt)}>
                      <div className="template-icon-ring">
                        <Sparkles size={20} />
                      </div>
                      <h3>{tmpl.name}</h3>
                      <p>{tmpl.description}</p>
                      <div className="template-prompt">
                        {tmpl.prompt}
                      </div>
                      <button className="btn-premium primary" style={{ marginTop: '0.5rem', width: '100%' }}>
                        Apply Personality
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================== TAB: WA TEMPLATE BUILDER ======================== */}
        {activeTab === 'whatsapp-templates' && (
          <TemplateBuilder setActiveTab={setActiveTab} />
        )}

        {/* ======================== TAB: KEYWORD RULES ENGINE ======================== */}
        {activeTab === 'rules' && (
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <button 
                  className="welcome-chip" 
                  onClick={() => setActiveTab('whatsapp-templates')}
                  style={{ border: 'none', background: 'rgba(255, 255, 255, 0.1)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'inherit', padding: '8px', borderRadius: '50%' }}
                >
                  <ArrowLeft size={16} />
                </button>
                <h1>Keyword Rules Manager</h1>
                <p>Save API token costs! Define specific triggers like containing words or exact queries to send pre-programmed responses instantly.</p>
              </div>
            </header>

            {sessions.length === 0 ? (
              <div className="empty-state-cyber">
                <Sliders size={64} className="text-muted" />
                <h3>No active agents</h3>
                <p>Create an agent inside the Agent Hub to start adding custom trigger rules.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      className={`btn-premium ${selectedAgentForRule === s.id ? 'primary' : 'secondary'}`}
                      onClick={() => { setSelectedAgentForRule(s.id); fetchRules(s.id); }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>

                <div className="custom-rules-grid">
                  <form className="rule-add-sidebar" onSubmit={handleAddRule}>
                    <h3>Create Auto-Reply Rule</h3>
                    <div className="input-group">
                      <label>When message contains:</label>
                      <input
                        type="text"
                        className="input-field-glow"
                        placeholder="Keyword e.g. price"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        style={{ paddingLeft: '0.75rem' }}
                        required
                      />
                    </div>

                    <div className="input-group">
                      <label>Match logic:</label>
                      <select
                        className="input-field-glow"
                        value={newMatchType}
                        onChange={(e) => setNewMatchType(e.target.value)}
                        style={{ paddingLeft: '0.5rem' }}
                      >
                        <option value="contains">Contains Word (Broad)</option>
                        <option value="exact">Exact Match (Strict)</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label>Auto-Response Reply:</label>
                      <textarea
                        className="textarea-glow"
                        placeholder="Enter the automated reply message..."
                        value={newReply}
                        onChange={(e) => setNewReply(e.target.value)}
                        required
                      />
                    </div>

                    <button type="submit" className="btn-premium primary">
                      <Plus size={16} /> Add Keyword
                    </button>
                  </form>

                  <div className="board-container" style={{ marginTop: '0' }}>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Active Triggers ({rules.length})</h3>
                    {rules.length === 0 ? (
                      <p className="text-secondary" style={{ fontSize: '0.9rem' }}>No custom auto-reply rules configured for this agent yet.</p>
                    ) : (
                      <div className="crm-table-container">
                        <table className="crm-table">
                          <thead>
                            <tr>
                              <th>Keyword Match</th>
                              <th>Match Type</th>
                              <th>Auto Response Message</th>
                              <th style={{ width: '60px' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rules.map((rule) => (
                              <tr key={rule.id}>
                                <td><span className="pill-indicator" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>{rule.keyword}</span></td>
                                <td><span style={{ fontSize: '0.8rem', color: rule.match_type === 'exact' ? 'var(--cyber-blue)' : 'var(--accent-light)' }}>{rule.match_type}</span></td>
                                <td style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rule.reply}</td>
                                <td>
                                  <button className="btn-premium danger-soft" style={{ padding: '0.25rem 0.5rem', height: '32px' }} onClick={() => handleDeleteRule(rule.id)}>
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================== TAB: INBOX (UNIFIED) ======================== */}
        {activeTab === 'inbox' && (
          <UnifiedInbox sessions={sessions} socket={socket} />
        )}

        {/* ======================== TAB: LIVE CHAT CRM (HIDDEN) ======================== */}
        {false && activeTab === 'livechat' && (
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <div className="welcome-chip">💬 Live Communication</div>
                <h1>Live Chat Workspace</h1>
                <p>Monitor your active WhatsApp threads in real-time, view automated responses, and chat manually with clients.</p>
              </div>
            </header>

            {sessions.length === 0 ? (
              <div className="empty-state-cyber">
                <MessageSquare size={64} className="text-muted" />
                <h3>No active agents connected</h3>
                <p>Connect at least one WhatsApp agent to open the Live Chat CRM workspace.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      className={`btn-premium ${livechatSelectedAgent === s.id ? 'primary' : 'secondary'}`}
                      onClick={() => { setLivechatSelectedAgent(s.id); fetchLivechatThreads(s.id); }}
                    >
                      {s.name} ({s.status === 'ready' || s.status === 'authenticated' ? '🟢 Online' : '🔴 Offline'})
                    </button>
                  ))}
                </div>

                <div className="livechat-layout">
                  {/* Thread Sidebar list */}
                  <div className="livechat-sidebar">
                    <div className="livechat-sidebar-header">
                      <div className="livechat-sidebar-search">
                        <Users className="livechat-search-icon" size={16} />
                        <input
                          type="text"
                          className="livechat-search-input"
                          placeholder="Filter threads..."
                          value={livechatSearch}
                          onChange={(e) => setLivechatSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="livechat-threads-list">
                      {livechatChats
                        .filter(chat => chat.contact.toLowerCase().includes(livechatSearch.toLowerCase()))
                        .map(chat => {
                          const isGroup = chat.contact.endsWith('@g.us');
                          const contactName = chat.contact.split('@')[0];
                          const active = livechatSelectedContact === chat.contact;
                          return (
                            <div
                              key={chat.contact}
                              className={`livechat-thread-item ${active ? 'active' : ''}`}
                              onClick={() => {
                                setLivechatSelectedContact(chat.contact);
                                fetchLivechatMessages(livechatSelectedAgent, chat.contact);
                              }}
                            >
                              <div className={`livechat-avatar ${isGroup ? 'group' : ''}`}>
                                {isGroup ? 'Gp' : contactName.slice(-4)}
                              </div>
                              <div className="livechat-thread-details">
                                <h4>{chat.contact}</h4>
                                <p>{chat.last_message || 'Empty thread'}</p>
                              </div>
                              <div className="livechat-thread-meta">
                                <span className="livechat-thread-time">
                                  {chat.last_msg_time ? new Date(chat.last_msg_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                {chat.last_direction && (
                                  <span className={`livechat-direction-badge ${chat.last_direction}`}>
                                    {chat.last_direction}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                      {livechatChats.length === 0 && (
                        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '3rem 1rem' }}>
                          No conversation logs found for this agent.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message pane */}
                  <div className="livechat-chat-viewport">
                    {livechatSelectedContact ? (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                        <div className="livechat-chat-header">
                          <div>
                            <h3>{livechatSelectedContact}</h3>
                            <p>Live Sync Active</p>
                          </div>
                          <span className="pill-indicator" style={{ background: 'var(--accent-glow)' }}>
                            {livechatSelectedContact.endsWith('@g.us') ? 'WhatsApp Group' : 'Private Conversation'}
                          </span>
                        </div>

                        <div className="livechat-messages-scroller" ref={livechatScrollerRef}>
                          {livechatMessages.map((msg, idx) => {
                            const isAi = msg.direction === 'outgoing' && msg.message_text.includes(' AI]*');
                            const isRule = msg.direction === 'outgoing' && msg.message_text.includes(' Rule]*');
                            const badgeText = isAi ? 'AI Bot' : isRule ? 'Keyword Rule' : null;
                            const outClass = isAi ? 'ai-replied' : isRule ? 'rule-replied' : 'manual-replied';

                            return (
                              <div key={idx} className={`livechat-bubble-row ${msg.direction} ${msg.direction === 'outgoing' ? outClass : ''}`}>
                                <div className="livechat-bubble">
                                  {msg.direction === 'outgoing' && badgeText && (
                                    <span className="livechat-bubble-badge">{badgeText}</span>
                                  )}
                                  {(() => {
                                    const text = msg.message_text;
                                    if (!text) return null;
                                    const uploadRegex = /(http:\/\/localhost:3001\/uploads\/.*)/;
                                    const match = text.match(uploadRegex);
                                    if (match) {
                                      const url = match[1].trim();
                                      let textWithoutUrl = text.replace(match[1], '').trim();

                                      // Remove [IMAGE], [AUDIO], etc.
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
                                  })()}
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
                            value={livechatInput}
                            onChange={(e) => setLivechatInput(e.target.value)}
                            onSend={handleSendLivechatMessage}
                            onSendMedia={handleSendLivechatMedia}
                            placeholder="Type a manual reply message..."
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="livechat-empty-chat">
                        <MessageSquare size={48} className="text-muted" style={{ opacity: 0.4 }} />
                        <h4>Inbox Selected</h4>
                        <p>Click on any thread from the list on the left to read messages and reply to customers.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================== TAB: SMART CRM CONTACT MANAGER (HIDDEN) ======================== */}
        {false && activeTab === 'crm' && (
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <div className="welcome-chip">👥 Saved Contacts</div>
                <h1>Smart CRM Database</h1>
                <p>View all contacts that interacted with your WhatsApp sessions, search numbers, edit customized pipeline tags, and write notes.</p>
              </div>
            </header>

            {sessions.length === 0 ? (
              <div className="empty-state-cyber">
                <Users size={64} className="text-muted" />
                <h3>No contact records yet</h3>
                <p>Linked agents will automatically log and persist contacts that write messages on WhatsApp.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      className={`btn-premium ${selectedAgentForRule === s.id ? 'primary' : 'secondary'}`}
                      onClick={() => { setSelectedAgentForRule(s.id); fetchCRMContacts(s.id); }}
                    >
                      {s.name} Contacts
                    </button>
                  ))}
                </div>

                <div className="board-container" style={{ marginTop: '0' }}>
                  <div className="toolbar-flex">
                    <div className="search-box-wrapper">
                      <Users className="search-icon-inside" size={18} />
                      <input
                        type="text"
                        className="search-box"
                        placeholder="Filter contacts by phone, tags or details..."
                        value={crmSearch}
                        onChange={(e) => setCrmSearch(e.target.value)}
                      />
                    </div>
                  </div>

                  {filteredContacts.length === 0 ? (
                    <p className="text-secondary" style={{ padding: '2rem 0', textAlign: 'center' }}>No matched contacts found.</p>
                  ) : (
                    <div className="crm-table-container">
                      <table className="crm-table">
                        <thead>
                          <tr>
                            <th>Phone Jid / Name</th>
                            <th>Lead Pipeline Tags (VIP, Lead, Customer)</th>
                            <th>Activity Notes</th>
                            <th>Last Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContacts.map(contact => (
                            <tr key={contact.id}>
                              <td>
                                <div className="crm-contact-id">{contact.phone}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>{contact.name || 'Anonymous User'}</div>
                              </td>
                              <td style={{ maxWidth: '220px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                                  {contact.tags && contact.tags.split(',').map((t, idx) => (
                                    <span key={idx} className="crm-tag-pill">{t.trim()}</span>
                                  ))}
                                </div>
                                <input
                                  type="text"
                                  className="crm-tag-input"
                                  placeholder="e.g. VIP, Lead (save on enter)"
                                  defaultValue={contact.tags || ''}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleContactUpdate(contact.id, 'tags', e.target.value);
                                      e.target.blur();
                                    }
                                  }}
                                />
                              </td>
                              <td>
                                <textarea
                                  className="crm-notes-area"
                                  defaultValue={contact.notes || ''}
                                  placeholder="Type custom note for this client..."
                                  onBlur={(e) => handleContactUpdate(contact.id, 'notes', e.target.value)}
                                />
                              </td>
                              <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {contact.last_message ? new Date(contact.last_message).toLocaleString() : 'Never'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================== TAB: BROADCAST & SCHEDULER ======================== */}
        {activeTab === 'broadcast' && (
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <div className="welcome-chip">⏰ Broadcast & Queue</div>
                <h1>Bulk WhatsApp Broadcaster & Scheduler</h1>
                <p>Directly blast bulk WhatsApp text messages to a list of numbers instantly, or queue reminders at specific dates.</p>
              </div>
            </header>

            {sessions.length === 0 ? (
              <div className="empty-state-cyber">
                <Calendar size={64} className="text-muted" />
                <h3>Create an agent to broadcast</h3>
                <p>Broadcast messaging requires at least one active WhatsApp agent session connected.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      className={`btn-premium ${selectedAgentForBroadcast === s.id ? 'primary' : 'secondary'}`}
                      onClick={() => { setSelectedAgentForBroadcast(s.id); fetchScheduled(s.id); }}
                    >
                      {s.name} Broadcaster
                    </button>
                  ))}
                </div>

                <div className="broadcaster-grid">

                  {/* Bulk Blaster Box */}
                  <form className="board-container" onSubmit={handleBroadcast} style={{ marginTop: '0' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Send size={18} className="cyber-green" /> Immediate Bulk Broadcast Blaster
                    </h2>
                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label style={{ margin: 0 }}>Target Numbers:</label>
                        <label
                          htmlFor="excelUploadBroadcast"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            background: 'linear-gradient(135deg, rgba(212,160,23,0.15), rgba(232,130,26,0.15))',
                            border: '1px solid rgba(212,160,23,0.4)',
                            color: 'var(--accent-light)', borderRadius: '8px',
                            padding: '0.35rem 0.85rem', fontSize: '0.8rem',
                            fontWeight: '600', cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          title="Upload Excel (.xlsx) file to auto-import phone numbers"
                        >
                          Import from Excel
                        </label>
                        <input
                          type="file"
                          id="excelUploadBroadcast"
                          accept=".xlsx,.xls"
                          style={{ display: 'none' }}
                          onChange={handleExcelUploadBroadcast}
                        />
                      </div>
                      <textarea
                        className="textarea-glow"
                        placeholder="e.g. 923001234567, 923129876543, 15551234567"
                        value={broadcastNumbers}
                        onChange={(e) => setBroadcastNumbers(e.target.value)}
                        rows="3"
                        required
                      />
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>Provide full country code without '+' or spaces. Or click "Import from Excel" to upload .xlsx file.</small>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="input-group">
                        <label> Delay Mode:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem' }}>
                          <input
                            type="checkbox"
                            id="useRandomDelayBroadcast"
                            checked={useRandomDelay}
                            onChange={(e) => setUseRandomDelay(e.target.checked)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                          />
                          <label htmlFor="useRandomDelayBroadcast" style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '600' }}>
                            Random Delay
                          </label>
                        </div>
                        {useRandomDelay ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            <div>
                              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}> Min Delay (mins):</label>
                              <input
                                type="number"
                                className="input-field-glow"
                                min="1"
                                step="1"
                                value={bulkDelay}
                                onChange={(e) => setBulkDelay(Number(e.target.value))}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}> Max Delay (mins):</label>
                              <input
                                type="number"
                                className="input-field-glow"
                                min="1"
                                step="1"
                                value={bulkDelayMax}
                                onChange={(e) => setBulkDelayMax(Number(e.target.value))}
                              />
                            </div>
                          </div>
                        ) : (
                          <input
                            type="number"
                            className="input-field-glow"
                            min="1"
                            step="1"
                            value={bulkDelay}
                            onChange={(e) => setBulkDelay(Number(e.target.value))}
                          />
                        )}
                        <small className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.35rem', display: 'block' }}>
                          {useRandomDelay
                            ? `After every message ${bulkDelay}m to ${bulkDelayMax}m Random interval after every message much safer from bans and detection.`
                            : `Fixed wait time between each message in minutes`}
                        </small>
                      </div>
                    </div>

                    {/* Random Delay Visual Preview */}
                    {useRandomDelay && (
                      <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          <span> Random Delay Range Preview</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{`${bulkDelay}m — ${bulkDelayMax}m`}</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #b8860b, #d4a017, #e8821a)', borderRadius: '99px', animation: 'pulse 2s infinite' }} />
                        </div>
                        <small style={{ color: 'rgba(99,202,241,0.8)', marginTop: '0.3rem', display: 'block' }}>
                          After every message, the timing will be automatically randomized keeping it safer from WhatsApp bot detection.
                        </small>
                      </div>
                    )}

                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                      <label>Broadcast Campaign Text:</label>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <select
                          className="input-field-glow"
                          value={selectedWaTemplate}
                          onChange={(e) => {
                            setSelectedWaTemplate(e.target.value);
                            const tpl = waTemplates.find(t => t.id === e.target.value);
                            if (tpl) {
                              setBulkMessage(tpl.components?.body || '');
                            } else {
                              setBulkMessage('');
                            }
                          }}
                        >
                          <option value="">-- Select Template --</option>
                          {waTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ position: 'relative' }}>
                        {selectedWaTemplate && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Template Selected (Text disabled)</span>
                          </div>
                        )}
                        <textarea
                          value={bulkMessage}
                          onChange={(e) => {
                            setBulkMessage(e.target.value);
                            if (e.target.value) {
                              setSelectedWaTemplate('');
                            }
                          }}
                          placeholder="Type your message here that will be sent to all numbers..."
                          className="sandbox-input"
                          style={{
                            width: '100%',
                            minHeight: '120px',
                            padding: '1rem',
                            color: 'var(--text-primary)',
                            fontFamily: 'inherit',
                            fontSize: '0.95rem',
                            resize: 'vertical',
                            outline: 'none',
                            opacity: selectedWaTemplate ? 0.3 : 1
                          }}
                          disabled={!!selectedWaTemplate}
                        />
                      </div>
                    </div>

                    <button type="submit" className="btn-premium primary" style={{ width: '100%' }}>
                      Blast Broadcast Campaign
                    </button>
                  </form>

                  {/* Future Message Scheduler Box */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <form className="board-container" onSubmit={handleScheduleMessage} style={{ marginTop: '0' }}>
                      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={18} className="cyber-blue" /> Schedule Future Message
                      </h2>

                      <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <label>Target Contact Number:</label>
                        <input
                          type="text"
                          className="input-field-glow"
                          placeholder="e.g. 923001234567"
                          value={schedContact}
                          onChange={(e) => setSchedContact(e.target.value)}
                          style={{ paddingLeft: '0.75rem' }}
                          required
                        />
                      </div>

                      <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <label>Schedule Message Content:</label>
                        <textarea
                          className="textarea-glow"
                          placeholder="Don't forget our meeting tomorrow..."
                          value={schedMessage}
                          onChange={(e) => setSchedMessage(e.target.value)}
                          rows="3"
                          required
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                        <div className="input-group">
                          <label>Date:</label>
                          <input
                            type="date"
                            className="input-field-glow"
                            value={schedDate}
                            onChange={(e) => setSchedDate(e.target.value)}
                            style={{ paddingLeft: '0.5rem' }}
                            required
                          />
                        </div>
                        <div className="input-group">
                          <label>Time:</label>
                          <input
                            type="time"
                            className="input-field-glow"
                            value={schedTime}
                            onChange={(e) => setSchedTime(e.target.value)}
                            style={{ paddingLeft: '0.5rem' }}
                            required
                          />
                        </div>
                      </div>

                      <button type="submit" className="btn-premium primary" style={{ width: '100%' }}>
                        Schedule Queued Reminders
                      </button>
                    </form>

                    {/* Broadcast Live Monitor */}
                    <div className="board-container" style={{ marginTop: '0', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Activity size={18} className="cyber-blue" /> Live Monitor
                        </h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`status-heartbeat ${broadcastStatus}`}></span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                            Status: {broadcastStatus}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          <span>Progress: {broadcastProgress} / {broadcastTotalMessages || '—'} queued</span>
                          <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                            {broadcastTotalMessages > 0 ? Math.round((broadcastProgress / broadcastTotalMessages) * 100) : 0}%
                          </span>
                        </div>
                        <div className="bulk-progress-bar-bg">
                          <div
                            className="bulk-progress-bar-fill"
                            style={{ width: `${broadcastTotalMessages > 0 ? (broadcastProgress / broadcastTotalMessages) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Terminal Window */}
                      <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Console Output:
                      </h3>
                      <div className="bulk-terminal">
                        {broadcastLogs.length === 0 ? (
                          <div className="bulk-terminal-empty">
                            Console idle. Blast campaign to see queuing output logs.
                          </div>
                        ) : (
                          broadcastLogs.map((log, idx) => (
                            <div key={idx} className={`bulk-log-row ${log.type}`}>
                              <span className="log-time">[{log.time}]</span>
                              <span className="log-text">{log.text}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                  </div>

                </div>

                <div className="board-container" style={{ marginTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Broadcast & Scheduled Messages List ({scheduledList.length})</h3>
                  {scheduledList.length === 0 ? (
                    <p className="text-secondary" style={{ fontSize: '0.9rem' }}>No pending scheduled messages in dispatch queue.</p>
                  ) : (
                    <div className="crm-table-container">
                      <table className="crm-table">
                        <thead>
                          <tr>
                            <th>Recipient</th>
                            <th>Message Preview</th>
                            <th>Dispatch Time</th>
                            <th>Status</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduledList.map(item => (
                            <tr key={item.id}>
                              <td><span className="crm-contact-id">{item.contact}</span></td>
                              <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.message}</td>
                              <td>{new Date(item.scheduled_time).toLocaleString()}</td>
                              <td>
                                <span className={`status-pill-badge ${item.status === 'sent' ? 'ready' : item.status === 'pending' ? 'qr' : 'disconnected'}`}>
                                  {item.status}
                                </span>
                              </td>
                              <td>
                                {item.status === 'pending' && (
                                  <button className="btn-premium danger-soft" style={{ height: '32px', padding: '0.25rem 0.5rem' }} onClick={() => handleDeleteScheduled(item.id)}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        )}

        {/* ======================== TAB: BULK SENDER ======================== */}
        {activeTab === 'bulksender' && (
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <div className="welcome-chip">⚡ Automated Sender</div>
                <h1>Bulk Message Sender</h1>
                <p>Send multiple or unlimited messages to a single number with configurable delays and real-time status tracking.</p>
              </div>
            </header>

            {sessions.length === 0 ? (
              <div className="empty-state-cyber">
                <Send size={64} className="text-muted" />
                <h3>Create an agent to send messages</h3>
                <p>Bulk sending requires at least one active WhatsApp agent session connected.</p>
              </div>
            ) : (
              <div>
                {/* Agent Selector Chips */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      className={`btn-premium ${selectedAgentForBulk === s.id ? 'primary' : 'secondary'}`}
                      onClick={() => setSelectedAgentForBulk(s.id)}
                    >
                      {s.name} ({s.status === 'ready' ? 'Ready' : 'Not Connected'})
                    </button>
                  ))}
                </div>

                <div className="bulk-grid">

                  {/* Left Column: Form Settings */}
                  <div className="board-container" style={{ marginTop: '0' }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Settings size={18} className="cyber-blue" /> Campaign Configuration
                    </h2>

                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label style={{ margin: 0 }}> Target Phone Numbers (bulk):</label>
                        <label
                          htmlFor="excelUploadPhones"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            background: 'linear-gradient(135deg, rgba(212,160,23,0.12), rgba(232,130,26,0.12))',
                            border: '1px solid rgba(212,160,23,0.35)',
                            color: 'var(--accent-light)', borderRadius: '8px',
                            padding: '0.35rem 0.85rem', fontSize: '0.8rem',
                            fontWeight: '600', cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          title="Upload Excel (.xlsx) file to auto-import phone numbers"
                        >
                          Import from Excel
                        </label>
                        <input
                          id="excelUploadPhones"
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={handleExcelUploadPhones}
                          disabled={bulkStatus === 'sending'}
                          style={{ display: 'none' }}
                        />
                      </div>
                      <textarea
                        className="textarea-glow"
                        placeholder="e.g. 923001234567"
                        value={bulkPhones}
                        onChange={(e) => setBulkPhones(e.target.value)}
                        disabled={bulkStatus === 'sending'}
                        required
                        style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                      />
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                        Manually enter numbers, or click "Import from Excel" to auto-read from .xlsx file. Include country code (923..., 1555...). No "+" needed.
                      </small>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div className="input-group">
                        <label>Set Quantity:</label>
                        <input
                          type="number"
                          className="input-field-glow"
                          min="1"
                          value={bulkCount}
                          onChange={(e) => setBulkCount(Number(e.target.value))}
                          disabled={bulkStatus === 'sending'}
                          required
                        />
                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Each number will receive the message this many times</small>
                      </div>
                      <div className="input-group">
                        <label> Delay Mode:</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.75rem' }}>
                          <input
                            type="checkbox"
                            id="useRandomDelay"
                            checked={useRandomDelay}
                            onChange={(e) => setUseRandomDelay(e.target.checked)}
                            disabled={bulkStatus === 'sending'}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent)' }}
                          />
                          <label htmlFor="useRandomDelay" style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '600' }}>
                            Random Delay
                          </label>
                        </div>
                        {useRandomDelay ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            <div>
                              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}> Min Delay (mins):</label>
                              <input
                                type="number"
                                className="input-field-glow"
                                min="1"
                                step="1"
                                value={bulkDelay}
                                onChange={(e) => setBulkDelay(Number(e.target.value))}
                                disabled={bulkStatus === 'sending'}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}> Max Delay (mins):</label>
                              <input
                                type="number"
                                className="input-field-glow"
                                min="1"
                                step="1"
                                value={bulkDelayMax}
                                onChange={(e) => setBulkDelayMax(Number(e.target.value))}
                                disabled={bulkStatus === 'sending'}
                              />
                            </div>
                          </div>
                        ) : (
                          <input
                            type="number"
                            className="input-field-glow"
                            min="1"
                             step="1"
                            value={bulkDelay}
                            onChange={(e) => setBulkDelay(Number(e.target.value))}
                            disabled={bulkStatus === 'sending'}
                          />
                        )}
                        <small className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.35rem', display: 'block' }}>
                          {useRandomDelay
                            ? `After every message ${bulkDelay}m to ${bulkDelayMax}m Random interval after every message much safer from bans and detection.`
                            : `Fixed wait time between each message in minutes`}
                        </small>
                      </div>
                    </div>

                    {/* Random Delay Visual Preview */}
                    {useRandomDelay && (
                      <div style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          <span> Random Delay Range Preview</span>
                          <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{bulkDelay}m — {bulkDelayMax}m</span>
                        </div>
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #b8860b, #d4a017, #e8821a)', borderRadius: '99px', animation: 'pulse 2s infinite' }} />
                        </div>
                        <small style={{ color: 'rgba(99,202,241,0.8)', marginTop: '0.3rem', display: 'block' }}>
                          After every message, the timing will be automatically randomized keeping it safer from WhatsApp bot detection.
                        </small>
                      </div>
                    )}

                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                      <label>Message Content:</label>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <select
                          className="input-field-glow"
                          value={selectedWaTemplate}
                          onChange={(e) => {
                            setSelectedWaTemplate(e.target.value);
                            const tpl = waTemplates.find(t => t.id === e.target.value);
                            if (tpl) {
                              setBulkMessage(tpl.components?.body || '');
                            } else {
                              setBulkMessage('');
                            }
                          }}
                        >
                          <option value="">-- Select Template --</option>
                          {waTemplates.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ position: 'relative' }}>
                        {selectedWaTemplate && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)' }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>Template Selected (Text disabled)</span>
                          </div>
                        )}
                        <textarea
                          value={bulkMessage}
                          onChange={(e) => {
                            setBulkMessage(e.target.value);
                            if (e.target.value) {
                              setSelectedWaTemplate('');
                            }
                          }}
                          placeholder="Type your message here that will be sent to all numbers..."
                          className="sandbox-input"
                          style={{
                            width: '100%',
                            minHeight: '120px',
                            padding: '1rem',
                            color: 'var(--text-primary)',
                            fontFamily: 'inherit',
                            fontSize: '0.95rem',
                            resize: 'vertical',
                            outline: 'none',
                            opacity: selectedWaTemplate ? 0.3 : 1
                          }}
                          disabled={!!selectedWaTemplate}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                      <input
                        type="checkbox"
                        id="appendCounter"
                        checked={appendCounter}
                        onChange={(e) => setAppendCounter(e.target.checked)}
                        disabled={bulkStatus === 'sending'}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="appendCounter" style={{ fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        Append counter (e.g. " (1/5)") recommended to avoid spam detection
                      </label>
                    </div>

                    {/* Numbers Summary */}
                    {bulkPhones.trim() && (
                      <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
                        <strong>{bulkPhones.split(/[,\n\r]+/).map(n => n.replace(/[^0-9]/g, '')).filter(n => n.length >= 8).length}</strong> valid numbers × <strong>{bulkCount}</strong> msgs = <strong style={{ color: 'var(--accent)' }}>{bulkPhones.split(/[,\n\r]+/).map(n => n.replace(/[^0-9]/g, '')).filter(n => n.length >= 8).length * bulkCount}</strong> total messages
                        {useRandomDelay && (
                          <span style={{ marginLeft: '0.5rem', color: '#6366f1' }}>Random {bulkDelay}–{bulkDelayMax}m delay</span>
                        )}
                      </div>
                    )}

                    {/* Delay Warnings */}
                    {bulkDelay < 1 && (
                      <div className="warning-chip" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>
                        <strong>⚠️ Warning:</strong> Low delay can lead to WhatsApp ban. Keep minimum delay at least 1 minute!
                      </div>
                    )}

                    {/* Control Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {bulkStatus === 'idle' || bulkStatus === 'completed' || bulkStatus === 'stopped' ? (
                        <button
                          type="button"
                          className="btn-premium primary"
                          onClick={handleStartBulkSend}
                          style={{ flex: 1 }}
                        >
                          <Play size={16} /> Start Bulk Sending
                        </button>
                      ) : null}

                      {bulkStatus === 'sending' ? (
                        <>
                          <button
                            type="button"
                            className="btn-premium secondary"
                            onClick={handlePauseBulkSend}
                            style={{ flex: 1, borderColor: '#f59e0b', color: '#f59e0b' }}
                          >
                            ⏸ Pause
                          </button>
                          <button
                            type="button"
                            className="btn-premium"
                            onClick={handleStopBulkSend}
                            style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none' }}
                          >
                            ⏹ Stop
                          </button>
                        </>
                      ) : null}

                      {(bulkStatus === 'completed' || bulkStatus === 'stopped' || bulkStatus === 'paused') && (
                        <button
                          type="button"
                          className="btn-premium secondary"
                          onClick={handleResetBulkSend}
                          style={{ flex: 0.3 }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Live Monitor Terminal */}
                  <div className="board-container" style={{ marginTop: '0', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={18} className="cyber-blue" /> Live Monitor
                      </h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`status-heartbeat ${bulkStatus}`}></span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          Status: {bulkStatus}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                        <span>Progress: {bulkProgress} / {bulkTotalMessages || '—'} messages sent</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                          {bulkTotalMessages > 0 ? Math.round((bulkProgress / bulkTotalMessages) * 100) : 0}%
                        </span>
                      </div>
                      <div className="bulk-progress-bar-bg">
                        <div
                          className="bulk-progress-bar-fill"
                          style={{ width: `${bulkTotalMessages > 0 ? (bulkProgress / bulkTotalMessages) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Terminal Window */}
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Console Output:
                    </h3>
                    <div className="bulk-terminal">
                      {bulkLogs.length === 0 ? (
                        <div className="bulk-terminal-empty">
                          Console idle. Configure campaign details and click "Start Sending" to see output logs.
                        </div>
                      ) : (
                        bulkLogs.map((log, idx) => (
                          <div key={idx} className={`bulk-log-row ${log.type}`}>
                            <span className="log-time">[{log.time}]</span>
                            <span className="log-text">{log.text}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================== TAB: EMAIL SENDER ======================== */}
        {activeTab === 'email-sender' && (
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <div className="welcome-chip">📧 Email Broadcaster</div>
                <h1>Bulk Email Sender</h1>
                <p>Send thousands of customized emails at once using your own email credentials. Connect, write, and launch campaigns directly from the Call Anexa.</p>
              </div>
            </header>

            <div className="board-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
              <div className="board-container" style={{ marginTop: '0' }}>
                <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                  <Sliders size={18} className="cyber-blue" /> Campaign Configuration
                </h2>

                <div className="input-group">
                  <label>Email Address:</label>
                  <input
                    type="email"
                    className="input-field-glow"
                    placeholder="your.email@gmail.com"
                    value={emailSmtpUser}
                    onChange={(e) => setEmailSmtpUser(e.target.value)}
                    disabled={emailStatus === 'sending' || emailSmtpConnected}
                  />
                </div>

                <div className="input-group">
                  <label>SMTP Password / App Password:</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showSmtpPass ? "text" : "password"}
                      className="input-field-glow"
                      placeholder="Your SMTP App Password"
                      value={emailSmtpPass}
                      onChange={(e) => setEmailSmtpPass(e.target.value)}
                      disabled={emailStatus === 'sending' || emailSmtpConnected}
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      style={{
                        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                        background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0
                      }}
                      title={showSmtpPass ? "Hide Password" : "Show Password"}
                    >
                      {showSmtpPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                  {!emailSmtpConnected ? (
                    <button
                      className="btn-premium primary"
                      onClick={handleSaveSmtp}
                      disabled={emailStatus === 'sending'}
                      style={{ padding: '0.5rem 1.5rem' }}
                    >
                      Save Credentials
                    </button>
                  ) : (
                    <>
                      <div className="status-pill-badge ready" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem' }}>
                        <span className="pulse-dot"></span> Connected
                      </div>
                      <button
                        className="btn-premium danger-soft"
                        onClick={handleDeactivateSmtp}
                        disabled={emailStatus === 'sending'}
                        style={{ padding: '0.5rem 1.5rem' }}
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>

                <div className="input-group" style={{ marginTop: '1.5rem' }}>
                  <label>Subject:</label>
                  <input
                    type="text"
                    className="input-field-glow"
                    placeholder="Exclusive Offer Just For You!"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    disabled={emailStatus === 'sending'}
                  />
                </div>

                <div className="input-group">
                  <label>Message Body:</label>
                  <div className="quill-container-dark" style={{ marginBottom: '0.5rem' }}>
                    <ReactQuill
                      theme="snow"
                      value={emailBody}
                      onChange={setEmailBody}
                      placeholder="Compose your custom HTML email here..."
                      readOnly={emailStatus === 'sending'}
                      style={{ height: '300px', marginBottom: '40px', color: '#fff' }}
                      modules={{
                        toolbar: [
                          [{ 'font': [] }],
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'color': [] }, { 'background': [] }],
                          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                          [{ 'align': [] }],
                          ['link', 'image'],
                          ['clean']
                        ]
                      }}
                    />
                  </div>
                  <small className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.35rem', display: 'block' }}>
                    Supports full HTML rendering including inline styles and images.
                  </small>
                </div>

                <div className="input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ margin: 0 }}>Recipient Email Addresses:</label>
                    <label
                      htmlFor="excelUploadEmails"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        background: 'linear-gradient(135deg, rgba(212,160,23,0.12), rgba(232,130,26,0.12))',
                        border: '1px solid rgba(212,160,23,0.35)',
                        color: '#f0c842', borderRadius: '8px',
                        padding: '0.35rem 0.85rem', fontSize: '0.8rem',
                        fontWeight: '600', cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title="Upload Excel (.xlsx) file to auto-import email addresses"
                    >
                      Import file
                    </label>
                    <input
                      id="excelUploadEmails"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelUploadEmails}
                      disabled={emailStatus === 'sending'}
                      style={{ display: 'none' }}
                    />
                  </div>
                  <textarea
                    className="textarea-glow"
                    placeholder={"user1@example.com\nuser2@example.com\nuser3@example.com"}
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                    rows="4"
                    disabled={emailStatus === 'sending'}
                  />
                  <small className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.35rem', display: 'block' }}>
                    Manually type emails, or click "Import file" to auto-read from .xlsx file. Duplicates will be skipped automatically.
                  </small>
                </div>

                {emailRecipients.trim() && (
                  <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
                    <strong>{emailRecipients.split(/[,\n\r]+/).map(n => n.trim()).filter(n => n.includes('@')).length}</strong> valid email addresses detected
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  {emailStatus !== 'sending' && (
                    <button
                      type="button"
                      className="btn-premium primary"
                      onClick={handleStartEmailBulkSend}
                      style={{ flex: 1 }}
                    >
                      <Play size={16} /> Launch Email Campaign
                    </button>
                  )}
                  {emailStatus === 'completed' && (
                    <button
                      type="button"
                      className="btn-premium secondary"
                      onClick={handleResetEmailBulkSend}
                      style={{ flex: 0.3 }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Right Side: Live Console */}
              <div className="board-container" style={{ marginTop: '0', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} className="cyber-blue" /> Live Email Monitor
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`status-heartbeat ${emailStatus}`}></span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Status: {emailStatus}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    <span>Progress: {emailProgress.success + emailProgress.fail} / {emailProgress.total || '—'} emails sent</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                      {emailProgress.total > 0 ? Math.round(((emailProgress.success + emailProgress.fail) / emailProgress.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="bulk-progress-bar-bg">
                    <div
                      className="bulk-progress-bar-fill"
                      style={{ width: `${emailProgress.total > 0 ? ((emailProgress.success + emailProgress.fail) / emailProgress.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Console Output:
                </h3>
                <div className="bulk-terminal">
                  {emailLogs.length === 0 ? (
                    <div className="bulk-terminal-empty">
                      Console idle. Configure SMTP details, set your message, and click "Launch Email Campaign" to begin.
                    </div>
                  ) : (
                    emailLogs.map((log, idx) => (
                      <div key={idx} className={`bulk-log-row ${log.type}`}>
                        <span className="log-time">[{log.time}]</span>
                        <span className="log-text">{log.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================== TAB: GLOBAL ANALYTICS ======================== */}
        {activeTab === 'analytics' && (
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <div className="welcome-chip">📊 Analytics Workspace</div>
                <h1>System Activity Overview</h1>
                <p>Unified charts showing message directions, hourly active contacts, and top communication statistics.</p>
              </div>
            </header>

            {sessions.length === 0 ? (
              <div className="empty-state-cyber">
                <BarChart3 size={64} className="text-muted" />
                <h3>No Analytics Data Available</h3>
                <p>Connect your first active agent to start capturing real-time statistics.</p>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      className={`btn-premium ${selectedAgentForAnalytics === s.id ? 'primary' : 'secondary'}`}
                      onClick={() => { setSelectedAgentForAnalytics(s.id); fetchAnalytics(s.id); }}
                    >
                      {s.name} Stats
                    </button>
                  ))}
                </div>

                {analyticsData && (() => {
                  const maxVal = analyticsData.dailyStats ? Math.max(
                    ...analyticsData.dailyStats.map(d => Math.max(d.incoming, d.outgoing, 5))
                  ) : 5;

                  const incomingPoints = analyticsData.dailyStats ? analyticsData.dailyStats.map((d, idx) => {
                    const x = 45 + idx * (435 / 6);
                    const y = 150 - ((d.incoming / maxVal) * 130);
                    return { x, y, val: d.incoming, day: d.day };
                  }) : [];

                  const incomingPath = incomingPoints.length > 0
                    ? incomingPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                    : '';

                  const outgoingPoints = analyticsData.dailyStats ? analyticsData.dailyStats.map((d, idx) => {
                    const x = 45 + idx * (435 / 6);
                    const y = 150 - ((d.outgoing / maxVal) * 130);
                    return { x, y, val: d.outgoing, day: d.day };
                  }) : [];

                  const outgoingPath = outgoingPoints.length > 0
                    ? outgoingPoints.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                    : '';

                  return (
                    <div>
                      <div className="stats-cards-row">
                        <div className="stat-glow-card">
                          <div className="stat-glow-icon purple">
                            <MessageSquare size={22} />
                          </div>
                          <div className="stat-glow-info">
                            <h3>{analyticsData.total}</h3>
                            <p>Total Messages</p>
                          </div>
                        </div>

                        <div className="stat-glow-card">
                          <div className="stat-glow-icon green">
                            <Zap size={22} />
                          </div>
                          <div className="stat-glow-info">
                            <h3>{analyticsData.incoming}</h3>
                            <p>Received (Incoming)</p>
                          </div>
                        </div>

                        <div className="stat-glow-card">
                          <div className="stat-glow-icon blue">
                            <Send size={22} />
                          </div>
                          <div className="stat-glow-info">
                            <h3>{analyticsData.outgoing}</h3>
                            <p>Replied (Outgoing)</p>
                          </div>
                        </div>

                        <div className="stat-glow-card">
                          <div className="stat-glow-icon orange">
                            <Clock size={22} />
                          </div>
                          <div className="stat-glow-info">
                            <h3>{analyticsData.last24h}</h3>
                            <p>Active Last 24 Hours</p>
                          </div>
                        </div>
                      </div>

                      {/* PREMIUM SVG DYNAMIC TRAFFIC CHART */}
                      {analyticsData.dailyStats && analyticsData.dailyStats.length > 0 && (
                        <div className="svg-chart-wrapper">
                          <div className="svg-chart-title">
                            <span>📈 7-Day Traffic Statistics</span>
                            <div className="svg-chart-legend">
                              <div className="legend-item">
                                <span className="legend-color-box incoming"></span>
                                <span>Incoming</span>
                              </div>
                              <div className="legend-item">
                                <span className="legend-color-box outgoing"></span>
                                <span>Outgoing</span>
                              </div>
                            </div>
                          </div>

                          <svg viewBox="0 0 500 200" className="chart-svg">
                            {/* Horizontal grid lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                              const y = 20 + ratio * 130;
                              const labelVal = Math.round(maxVal - ratio * maxVal);
                              return (
                                <g key={index}>
                                  <line x1="45" y1={y} x2="480" y2={y} className="chart-grid-line" />
                                  <text x="20" y={y + 4} className="chart-text" textAnchor="middle">{labelVal}</text>
                                </g>
                              );
                            })}

                            {/* X Axis Labels */}
                            {analyticsData.dailyStats.map((d, idx) => {
                              const x = 45 + idx * (435 / 6);
                              return (
                                <text key={idx} x={x} y="180" className="chart-text" textAnchor="middle">{d.day}</text>
                              );
                            })}

                            {/* Line Paths */}
                            <path d={incomingPath} className="chart-path-incoming" />
                            <path d={outgoingPath} className="chart-path-outgoing" />

                            {/* Incoming Data Points (circles) */}
                            {incomingPoints.map((p, idx) => (
                              <circle
                                key={idx}
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                className="chart-point-incoming"
                              >
                                <title>Incoming ({p.day}): {p.val}</title>
                              </circle>
                            ))}

                            {/* Outgoing Data Points (circles) */}
                            {outgoingPoints.map((p, idx) => (
                              <circle
                                key={idx}
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                className="chart-point-outgoing"
                              >
                                <title>Outgoing ({p.day}): {p.val}</title>
                              </circle>
                            ))}
                          </svg>
                        </div>
                      )}

                      <div className="board-container">
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Top 10 Active WhatsApp Jids (Messages volume)</h3>
                        {analyticsData.topContacts?.length === 0 ? (
                          <p className="text-secondary">No recorded active contacts found in DB.</p>
                        ) : (
                          <div className="crm-table-container">
                            <table className="crm-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '80px' }}>Rank</th>
                                  <th>Contact Number (Jid)</th>
                                  <th>Total Message Exchanged</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analyticsData.topContacts?.map((contact, idx) => (
                                  <tr key={idx}>
                                    <td><span className="pill-indicator">#{idx + 1}</span></td>
                                    <td><span className="crm-contact-id">{contact.contact}</span></td>
                                    <td style={{ fontWeight: '700', color: 'var(--accent-light)' }}>{contact.count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ======================== TAB: LIVE SANDBOX PLAYGROUND ======================== */}
        {activeTab === 'sandbox' && (
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <div className="welcome-chip">💬 Agent Simulator</div>
                <h1>Virtual Playground Sandbox</h1>
                <p>Test and tweak your AI prompts, models, and keyword triggers instantly inside our virtual browser chat! No need to wait for real WhatsApp texts.</p>
              </div>
            </header>

            {sessions.length === 0 ? (
              <div className="empty-state-cyber">
                <Play size={64} className="text-muted" />
                <h3>No configured agents found</h3>
                <p>Connect or create an agent inside the Agent Hub to start simulating chat responses.</p>
              </div>
            ) : (
              <div className="sandbox-split">

                {/* Left Side: Select Agent */}
                <div className="sandbox-agents-list">
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05rem', marginBottom: '0.5rem' }}>Select Agent:</h3>
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      className={`sandbox-agent-tab ${selectedAgentForSandbox === s.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedAgentForSandbox(s.id);
                        setSandboxMessages([
                          { sender: 'agent', text: `Hello! I am ${s.name}. Test chat with me here to see how I reply based on my prompts or rules!` }
                        ]);
                      }}
                    >
                      <MessageSquare size={16} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: '600' }}>{s.name}</span>
                        <span style={{ fontSize: '0.7rem', opacity: '0.6' }}>{s.isActive ? '🟢 Active' : '🔴 Paused'}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Right Side: Virtual Chat Window */}
                <div className="sandbox-chat-area">
                  <div className="sandbox-chat-header">
                    <h3>💬 Sandbox Session: {sessions.find(s => s.id === selectedAgentForSandbox)?.name || 'Select Agent'}</h3>
                    <span className="pill-indicator" style={{ background: 'var(--accent-glow)' }}>Virtual Client Mode</span>
                  </div>

                  <div className="sandbox-messages-scroller" ref={chatScrollerRef}>
                    {sandboxMessages.map((msg, idx) => (
                      <div key={idx} className={`chat-bubble-row ${msg.sender}`}>
                        <div className="chat-bubble">
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {sandboxTyping && (
                      <div className="chat-bubble-row agent">
                        <div className="chat-bubble" style={{ padding: '0.5rem 0.85rem' }}>
                          <div className="typing-indicator">
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <form className="sandbox-chat-input-bar" onSubmit={handleSandboxSend}>
                    <input
                      type="text"
                      className="sandbox-input"
                      placeholder="Type simulated message to agent (e.g. hello, pricing...)"
                      value={sandboxInput}
                      onChange={(e) => setSandboxInput(e.target.value)}
                    />
                    <button type="submit" className="sandbox-send-btn">
                      <Send size={18} />
                    </button>
                  </form>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ======================== TAB: ADMIN CONTROL ======================== */}
        {activeTab === 'admin' && role === 'admin' && (
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <div className="welcome-chip">🛡️ System Administration</div>
                <h1>Admin Control Panel</h1>
                <p>Manage users and assign WhatsApp agent sessions to specific manager accounts.</p>
              </div>
            </header>

            <div className="board-container">
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} className="cyber-blue" /> Session Assignment Directory
              </h2>

              {sessions.length === 0 ? (
                <div className="empty-state-cyber">
                  <Smartphone size={64} className="text-muted" />
                  <h3>No configured agents found</h3>
                  <p>Create WhatsApp agents first to assign them to users.</p>
                </div>
              ) : (
                <div className="crm-table-container">
                  <table className="crm-table">
                    <thead>
                      <tr>
                        <th>Agent Name</th>
                        <th>Session ID</th>
                        <th>Status</th>
                        <th>Currently Assigned To</th>
                        <th>Reassign Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(session => (
                        <tr key={session.id}>
                          <td>
                            <strong style={{ color: 'var(--text-primary)' }}>{session.name}</strong>
                          </td>
                          <td>
                            <code className="crm-contact-id" style={{ fontSize: '0.8rem' }}>{session.id}</code>
                          </td>
                          <td>
                            <span className={`status-pill-badge ${session.status}`}>
                              {session.status === 'ready' || session.status === 'authenticated' ? 'Connected' : session.status}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              color: session.ownerName ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontWeight: session.ownerName ? 'bold' : 'normal'
                            }}>
                              👤 {session.ownerName || 'Unassigned'}
                            </span>
                          </td>
                          <td>
                            <select
                              className="input-field-glow"
                              style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', width: '200px' }}
                              value={session.user_id || ''}
                              onChange={(e) => handleAssignSession(session.id, e.target.value)}
                            >
                              <option value="">-- Select User --</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>
                                  {u.username} ({u.role})
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="board-container" style={{ marginTop: '2rem' }}>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} className="cyber-blue" /> Registered System Users ({users.length})
              </h2>

              <div className="crm-table-container">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Username</th>
                      <th>System Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td><code style={{ fontSize: '0.8rem' }}>{u.id}</code></td>
                        <td><strong>{u.username}</strong></td>
                        <td>
                          <span className={`status-pill-badge ${u.role === 'admin' ? 'ready' : 'qr'}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ======================== TAB: RESELLER PANEL ======================== */}
      {activeTab === 'reseller' && role === 'admin' && (
        <main className="main-content" style={{ position: 'absolute', top: 0, left: 'var(--sidebar-width, 260px)', right: 0, bottom: 0 }}>
          <div>
            <header className="page-header">
              <div className="page-title-area">
                <div className="welcome-chip">💎 Business Mode</div>
                <h1>Reseller Panel</h1>
                <p>Manage client accounts, assign subscription plans, and control how many WhatsApp agents each user can create.</p>
              </div>
              <div className="header-action-row">
                <button className="btn-premium primary" onClick={fetchResellerUsers}>
                  <RefreshCw size={18} /> Refresh
                </button>
              </div>
            </header>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
              <div className="board-container" style={{ margin: 0, padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--cyber-blue, #38bdf8)' }}>{resellerUsers.length}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Clients</div>
              </div>
              <div className="board-container" style={{ margin: 0, padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#a78bfa' }}>{resellerUsers.reduce((s, u) => s + (u.sessionsCount || 0), 0)}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Agents Deployed</div>
              </div>
              <div className="board-container" style={{ margin: 0, padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34d399' }}>{resellerUsers.filter(u => u.isActive).length}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Active Accounts</div>
              </div>
            </div>

            <div className="board-container" style={{ marginTop: 0 }}>
              <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                <LayoutGrid size={18} className="cyber-blue" /> Client Plan Management
              </h2>

              <div className="crm-table-container">
                <table className="crm-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Status</th>
                      <th>Role</th>
                      <th>Agents Used</th>
                      <th>Plan (Limit)</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resellerUsers.map(u => {
                      const maxA = u.maxAgents !== undefined ? u.maxAgents : 1;
                      const used = u.sessionsCount || 0;
                      const planLabel = maxA === -1 ? 'Unlimited' : maxA === 1 ? 'Basic (1)' : maxA === 5 ? 'Pro (5)' : maxA === 10 ? 'Business (10)' : `Custom (${maxA})`;
                      const usageColor = maxA !== -1 && used >= maxA ? '#f87171' : '#34d399';
                      return (
                        <tr key={u.id}>
                          <td><strong>{u.username}</strong></td>
                          <td>
                            <span className={`status-pill-badge ${u.isActive ? 'ready' : 'disconnected'}`} style={{ fontSize: '0.7rem' }}>
                              {u.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td>
                            <span className={`status-pill-badge ${u.role === 'admin' ? 'ready' : 'qr'}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                              {u.role}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: usageColor }}>
                              {used} / {maxA === -1 ? '∞' : maxA}
                            </span>
                            {maxA !== -1 && (
                              <div style={{ width: '100px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', marginTop: '4px' }}>
                                <div style={{ width: `${Math.min((used / maxA) * 100, 100)}%`, height: '100%', background: usageColor, borderRadius: '99px', transition: 'width 0.4s' }} />
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ background: 'rgba(56,189,248,0.12)', color: 'var(--cyber-blue, #38bdf8)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '8px', padding: '0.2rem 0.65rem', fontSize: '0.8rem', fontWeight: 600 }}>
                              {planLabel}
                            </span>
                          </td>
                          <td>
                            {u.role !== 'admin' && (
                              <button
                                className="btn-premium"
                                style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                                onClick={() => { setLimitModalUser(u); setLimitModalValue(maxA); }}
                              >
                                <Edit2 size={13} /> Upgrade Plan
                              </button>
                            )}
                            {u.role === 'admin' && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Super Admin</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Limit Update Modal */}
      {limitModalUser && (
        <div className="modal-overlay" onClick={() => setLimitModalUser(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h2><LayoutGrid size={20} /> Assign Plan</h2>
              <button className="close-btn" onClick={() => setLimitModalUser(null)}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p style={{ marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Updating plan for: <strong style={{ color: 'var(--text-primary)' }}>{limitModalUser.username}</strong>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { label: '🆓 Basic', value: 1, desc: '1 Agent' },
                  { label: '🚀 Pro', value: 5, desc: '5 Agents' },
                  { label: '🏢 Business', value: 10, desc: '10 Agents' },
                  { label: '♾️ Unlimited', value: -1, desc: 'No Limit' },
                ].map(plan => (
                  <button
                    key={plan.value}
                    onClick={() => setLimitModalValue(plan.value)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      border: `2px solid ${limitModalValue === plan.value ? 'var(--cyber-blue, #38bdf8)' : 'rgba(255,255,255,0.1)'}`,
                      background: limitModalValue === plan.value ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{plan.label}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{plan.desc}</div>
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>Or enter custom limit (-1 = Unlimited):</label>
                <input
                  type="number"
                  className="input-field-glow"
                  value={limitModalValue}
                  onChange={e => setLimitModalValue(parseInt(e.target.value))}
                  min="-1"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn-premium primary" style={{ flex: 1 }} onClick={() => handleUpdateLimit(limitModalUser.id, limitModalValue)}>
                  <CheckCircle2 size={16} /> Save Plan
                </button>
                <button className="btn-premium" style={{ flex: 1 }} onClick={() => setLimitModalUser(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
