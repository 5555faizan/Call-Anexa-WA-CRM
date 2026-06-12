const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const { makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');

const JWT_SECRET = 'super-secret-multi-whatsapp-key-123';

// Multer setup for media uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB limit

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// DB setup
const db = new Database('sessions.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    prompt TEXT,
    isActive INTEGER DEFAULT 1,
    replyDelay INTEGER DEFAULT 0,
    msgCount INTEGER DEFAULT 0,
    aiEnabled INTEGER DEFAULT 0,
    aiProvider TEXT DEFAULT 'none',
    aiApiKey TEXT DEFAULT '',
    aiModel TEXT DEFAULT 'gpt-3.5-turbo',
    allowGroups INTEGER DEFAULT 0,
    allowPrivate INTEGER DEFAULT 1,
    aiMaxContext INTEGER DEFAULT 10,
    aiCustomUrl TEXT DEFAULT '',
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS scheduled_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    contact TEXT,
    message TEXT,
    scheduled_time INTEGER,
    status TEXT DEFAULT 'pending',
    created_at INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS message_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    contact TEXT,
    message_type TEXT,
    timestamp INTEGER,
    direction TEXT,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    phone TEXT,
    name TEXT,
    tags TEXT,
    notes TEXT,
    last_message INTEGER,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS reply_rules (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    keyword TEXT,
    reply TEXT,
    is_exact INTEGER DEFAULT 0,
    media_url TEXT DEFAULT '',
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    language TEXT,
    components TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    contact TEXT,
    message_text TEXT,
    direction TEXT,
    timestamp INTEGER,
    is_read INTEGER DEFAULT 0,
    FOREIGN KEY(session_id) REFERENCES sessions(id)
  );
`);

// Safe migrations for existing databases
try { db.prepare('ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0').run(); } catch (e) {}
try { db.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"); } catch(e){}
try { db.exec("ALTER TABLE users ADD COLUMN isActive INTEGER DEFAULT 1"); } catch(e){}
try { db.exec("ALTER TABLE users ADD COLUMN canCreateAgents INTEGER DEFAULT 1"); } catch(e){}
try { db.exec("ALTER TABLE users ADD COLUMN canBulkSend INTEGER DEFAULT 1"); } catch(e){}
try { db.exec("ALTER TABLE users ADD COLUMN canUseAI INTEGER DEFAULT 1"); } catch(e){}
try { db.exec("ALTER TABLE sessions ADD COLUMN allowGroups INTEGER DEFAULT 0"); } catch(e){}
try { db.exec("ALTER TABLE sessions ADD COLUMN allowPrivate INTEGER DEFAULT 1"); } catch(e){}
try { db.exec("ALTER TABLE sessions ADD COLUMN aiMaxContext INTEGER DEFAULT 10"); } catch(e){}
try { db.exec("ALTER TABLE sessions ADD COLUMN aiCustomUrl TEXT DEFAULT ''"); } catch(e){}
try { db.exec("ALTER TABLE users ADD COLUMN maxAgents INTEGER DEFAULT 1"); } catch(e){}
// Give admin unlimited agents
try { db.exec("UPDATE users SET maxAgents = -1 WHERE role = 'admin'"); } catch(e){}
// WhatsApp profile info columns
try { db.exec("ALTER TABLE sessions ADD COLUMN whatsappName TEXT DEFAULT ''"); } catch(e){}
try { db.exec("ALTER TABLE sessions ADD COLUMN whatsappAvatar TEXT DEFAULT ''"); } catch(e){}
// Keyword rules migrations
try { db.exec("ALTER TABLE reply_rules ADD COLUMN is_exact INTEGER DEFAULT 0"); } catch(e){}
try { db.exec("ALTER TABLE reply_rules ADD COLUMN media_url TEXT DEFAULT ''"); } catch(e){}
// Contacts migrations
try { db.exec("ALTER TABLE contacts ADD COLUMN lead_stage TEXT DEFAULT 'new'"); } catch(e){}

// Auto-promote first user or username 'admin' to admin
try {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
    if (adminCount === 0) {
        const adminUser = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
        if (adminUser) {
            db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(adminUser.id);
            console.log(`Promoted user 'admin' to admin role`);
        } else {
            const firstUser = db.prepare("SELECT * FROM users ORDER BY id ASC LIMIT 1").get();
            if (firstUser) {
                db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(firstUser.id);
                console.log(`Promoted first user ${firstUser.username} to admin role`);
            }
        }
    }
} catch(e) {
    console.error("Migration error for admin role:", e);
}

const clients = {}; // in-memory state tracking
const logger = pino({ level: 'silent' });

// AI Response Generator
const generateAIResponse = async (sessionId, contact, userMessage) => {
    const sessionRow = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if (!sessionRow || !sessionRow.aiEnabled) return null;

    // Check if the owner user of the session is active and has canUseAI permission
    if (sessionRow.user_id) {
        try {
            const owner = db.prepare('SELECT isActive, canUseAI FROM users WHERE id = ?').get(sessionRow.user_id);
            if (owner && (owner.isActive === 0 || owner.canUseAI === 0)) {
                console.log(`Skipping AI response for session ${sessionId} - Owner is deactivated or AI permission is disabled.`);
                return null;
            }
        } catch (err) {
            console.error('Error verifying owner credentials for AI:', err);
        }
    }

    const maxCtx = sessionRow.aiMaxContext || 10;
    let recentMsgs = [];
    if (contact) {
        recentMsgs = db.prepare('SELECT * FROM messages WHERE session_id = ? AND contact = ? ORDER BY timestamp DESC LIMIT ?').all(sessionId, contact, maxCtx);
        recentMsgs.reverse();
    }

    try {
        if (sessionRow.aiProvider === 'openai' || sessionRow.aiProvider === 'deepseek') {
            let url = 'https://api.openai.com/v1/chat/completions';
            let modelName = sessionRow.aiModel || 'gpt-3.5-turbo';

            if (sessionRow.aiProvider === 'deepseek') {
                url = 'https://api.deepseek.com/v1/chat/completions';
                modelName = sessionRow.aiModel || 'deepseek-chat';
            }

            if (sessionRow.aiCustomUrl) {
                url = sessionRow.aiCustomUrl;
            }

            const messagesPayload = [
                { role: 'system', content: sessionRow.prompt }
            ];

            recentMsgs.forEach(m => {
                messagesPayload.push({
                    role: m.direction === 'incoming' ? 'user' : 'assistant',
                    content: m.message_text
                });
            });

            if (recentMsgs.length === 0 || recentMsgs[recentMsgs.length - 1].message_text !== userMessage) {
                messagesPayload.push({ role: 'user', content: userMessage });
            }

            const headers = { 'Content-Type': 'application/json' };
            if (sessionRow.aiApiKey) {
                headers['Authorization'] = `Bearer ${sessionRow.aiApiKey}`;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: modelName,
                    messages: messagesPayload,
                    max_tokens: 500
                })
            });
            const data = await response.json();
            return data.choices?.[0]?.message?.content || null;
        } else if (sessionRow.aiProvider === 'gemini') {
            let promptText = sessionRow.prompt;
            if (recentMsgs.length > 0) {
                const formattedHistory = recentMsgs.map(m => `${m.direction === 'incoming' ? 'User' : 'Assistant'}: ${m.message_text}`).join('\n');
                promptText += `\n\nChat History:\n${formattedHistory}`;
                
                const lastMsg = recentMsgs[recentMsgs.length - 1];
                if (lastMsg.message_text !== userMessage) {
                    promptText += `\nUser: ${userMessage}`;
                }
            } else {
                promptText += `\n\nUser: ${userMessage}`;
            }
            promptText += `\nAssistant:`;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${sessionRow.aiApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: promptText }]
                    }]
                })
            });
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
    } catch (error) {
        console.error('AI Error:', error);
        return null;
    }
    return null;
};

// Keyword Rules Matcher
const matchKeywordRules = (sessionId, textMessage) => {
    try {
        const rules = db.prepare('SELECT * FROM reply_rules WHERE session_id = ?').all(sessionId);
        const lowerMsg = textMessage.toLowerCase().trim();
        for (const rule of rules) {
            const kw = rule.keyword.toLowerCase().trim();
            if (rule.is_exact) {
                if (lowerMsg === kw) return rule.reply;
            } else { // default 'contains'
                if (lowerMsg.includes(kw)) return rule.reply;
            }
        }
    } catch (e) {
        console.error('Error matching keyword rules:', e);
    }
    return null;
};

// Schedule Message Checker - runs every 10 seconds
setInterval(async () => {
    const now = Date.now();
    const pending = db.prepare('SELECT * FROM scheduled_messages WHERE status = ? AND scheduled_time <= ?').all('pending', now);
    
    for (const msg of pending) {
        const client = clients[msg.session_id];
        if (client && client.sock && client.status === 'ready') {
            try {
                const sentMsg = await client.sock.sendMessage(msg.contact, { text: msg.message });
                db.prepare('UPDATE scheduled_messages SET status = ? WHERE id = ?').run('sent', msg.id);
                console.log(`[Scheduler] ✅ Sent scheduled message ${msg.id} to ${msg.contact}`);
                io.emit('scheduled_update', { id: msg.id, sessionId: msg.session_id, status: 'sent' });

                // Also save in messages table for chat history
                const msgId = sentMsg?.key?.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                try {
                    db.prepare('INSERT INTO messages (id, session_id, contact, message_text, direction, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
                        msgId, msg.session_id, msg.contact, msg.message, 'outgoing', Date.now()
                    );
                } catch(e) {}

                // Small delay between sends to avoid ban
                await new Promise(resolve => setTimeout(resolve, 2000));
            } catch (e) {
                console.error(`[Scheduler] ❌ Failed scheduled message ${msg.id}:`, e.message);
                db.prepare('UPDATE scheduled_messages SET status = ? WHERE id = ?').run('failed', msg.id);
                io.emit('scheduled_update', { id: msg.id, sessionId: msg.session_id, status: 'failed' });
            }
        } else {
            console.log(`[Scheduler] ⏳ Skipping ${msg.id} - client not ready (status: ${client?.status || 'missing'})`);
        }
    }
}, 10000); // Check every 10 seconds

const getSessionsFromDB = (userId = null) => {
    if (userId) {
        return db.prepare('SELECT * FROM sessions WHERE user_id = ?').all(userId);
    }
    return db.prepare('SELECT * FROM sessions').all();
};

const initSession = async (sessionId) => {
    const sessionRow = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    if (!sessionRow) return;

    const authFolder = path.join(__dirname, 'baileys_auth', sessionId);
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger,
        browser: ['Multi-Agent WhatsApp', 'Chrome', '1.0.0']
    });

    clients[sessionId] = { sock, status: 'initializing', qr: null };

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            if (clients[sessionId]) {
                const qrUrl = await QRCode.toDataURL(qr);
                if (clients[sessionId]) {
                    clients[sessionId].qr = qrUrl;
                    clients[sessionId].status = 'qr';
                    io.emit('qr', { sessionId, qr: qrUrl });
                }
            }
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                initSession(sessionId);
            } else {
                if (clients[sessionId]) {
                    clients[sessionId].status = 'disconnected';
                    clients[sessionId].qr = null;
                }
                io.emit('status', { sessionId, status: 'disconnected' });
                if (fs.existsSync(authFolder)) {
                    fs.rmSync(authFolder, { recursive: true, force: true });
                }
            }
        } else if (connection === 'open') {
            if (clients[sessionId]) {
                clients[sessionId].status = 'ready';
                clients[sessionId].qr = null;
            }

            // Fetch WhatsApp profile info automatically
            try {
                const waUser = sock.user;
                const waJid = waUser?.id;
                const waName = waUser?.name || waUser?.notify || '';

                let avatarUrl = '';
                try {
                    avatarUrl = await sock.profilePictureUrl(waJid, 'image') || '';
                } catch(e) { avatarUrl = ''; }

                // Save to DB
                db.prepare('UPDATE sessions SET whatsappName = ?, whatsappAvatar = ? WHERE id = ?')
                    .run(waName, avatarUrl, sessionId);

                if (clients[sessionId]) {
                    clients[sessionId].whatsappName = waName;
                    clients[sessionId].whatsappAvatar = avatarUrl;
                }

                io.emit('status', { sessionId, status: 'ready', whatsappName: waName, whatsappAvatar: avatarUrl });
                console.log(`Session ${sessionRow.name} connected! WA Name: ${waName}`);
            } catch(e) {
                console.error('Error fetching WA profile:', e.message);
                io.emit('status', { sessionId, status: 'ready' });
                console.log(`Session ${sessionRow.name} connected!`);
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type !== 'notify' && m.type !== 'append') return;
        const msg = m.messages[0];
        if (!msg.message) return; // Process both incoming and outgoing
        
        const contact = msg.key.remoteJid;

        // IGNORE GROUPS, CHANNELS, AND STATUSES
        if (contact.endsWith('@g.us') || contact.endsWith('@newsletter') || contact === 'status@broadcast') {
            return;
        }

        const isGroup = contact.endsWith('@g.us');
        const direction = msg.key.fromMe ? 'outgoing' : 'incoming';
        const msgId = msg.key.id;

        const currentConfig = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
        if (!currentConfig) return;

        let textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;
        
        let isMedia = false;
        let mediaType = '';
        let mediaCaption = '';

        if (msg.message.imageMessage) { isMedia = true; mediaType = 'image'; mediaCaption = msg.message.imageMessage.caption || ''; }
        else if (msg.message.videoMessage) { isMedia = true; mediaType = 'video'; mediaCaption = msg.message.videoMessage.caption || ''; }
        else if (msg.message.audioMessage) { isMedia = true; mediaType = 'audio'; }
        else if (msg.message.documentMessage) { isMedia = true; mediaType = 'document'; mediaCaption = msg.message.documentMessage.fileName || ''; }
        else if (msg.message.documentWithCaptionMessage?.message?.documentMessage) {
             isMedia = true; mediaType = 'document';
             mediaCaption = msg.message.documentWithCaptionMessage.message.documentMessage.caption || msg.message.documentWithCaptionMessage.message.documentMessage.fileName || '';
        }

        if (isMedia) {
            try {
                let actualMsg = msg;
                if (msg.message?.documentWithCaptionMessage?.message) {
                    actualMsg = { ...msg, message: msg.message.documentWithCaptionMessage.message };
                }

                const buffer = await downloadMediaMessage(
                    actualMsg,
                    'buffer',
                    { },
                    { 
                        logger: pino({ level: 'silent' }),
                        reuploadRequest: sock.updateMediaMessage
                    }
                );
                
                const ext = mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'ogg' : 'bin';
                const filename = `in-${Date.now()}.${ext}`;
                const filepath = path.join(uploadDir, filename);
                fs.writeFileSync(filepath, buffer);
                const fileUrl = `http://localhost:3001/uploads/${filename}`;
                
                textMessage = `[${mediaType.toUpperCase()}] ${mediaCaption ? '- ' + mediaCaption : ''}\n${fileUrl}`;
            } catch (err) {
                console.error('Failed to download incoming media. Msg structure:', JSON.stringify(msg.message));
                console.error('Download Error:', err);
                textMessage = `[${mediaType.toUpperCase()} - Download Failed]`;
            }
        }

        if (!textMessage) return;

        // Prevent duplicate processing if our API already saved this message
        const exists = db.prepare('SELECT id FROM messages WHERE id = ?').get(msgId);
        if (exists) return;

        // Save incoming/outgoing message in chat history table
        db.prepare('INSERT INTO messages (id, session_id, contact, message_text, direction, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
            msgId,
            sessionId,
            contact,
            textMessage,
            direction,
            Date.now()
        );

        // Push real-time event to socket client
        io.emit('new_message', {
            sessionId,
            contact,
            message: {
                id: msgId,
                message_text: textMessage,
                direction: direction,
                timestamp: Date.now()
            }
        });

        // Skip auto-responses if the message was sent by us (fromMe) or if agent is paused
        if (msg.key.fromMe || !currentConfig.isActive) return;

        // Group & Private Chat filters
        if (isGroup && !currentConfig.allowGroups) return;
        if (!isGroup && !currentConfig.allowPrivate) return;

        // Save analytics
        db.prepare('INSERT INTO message_analytics (session_id, contact, message_type, timestamp, direction) VALUES (?, ?, ?, ?, ?)').run(
            sessionId, contact, 'text', Date.now(), 'incoming'
        );

        // Update contact
        const contactExists = db.prepare('SELECT * FROM contacts WHERE session_id = ? AND phone = ?').get(sessionId, contact);
        if (!contactExists) {
            db.prepare('INSERT INTO contacts (id, session_id, phone, name, last_message) VALUES (?, ?, ?, ?, ?)').run(
                `contact-${Date.now()}`, sessionId, contact, contact, Date.now()
            );
        } else {
            db.prepare('UPDATE contacts SET last_message = ? WHERE session_id = ? AND phone = ?').run(Date.now(), sessionId, contact);
        }

        db.prepare('UPDATE sessions SET msgCount = msgCount + 1 WHERE id = ?').run(sessionId);
        const newCount = currentConfig.msgCount + 1;
        io.emit('update_session', { sessionId, data: { msgCount: newCount } });

        const delayMs = currentConfig.replyDelay * 1000;
        let replyText;

        // 1. Check keyword rules
        const matchedRuleReply = matchKeywordRules(sessionId, textMessage);
        if (matchedRuleReply) {
            replyText = `*[${currentConfig.name} Rule]*\n\n${matchedRuleReply}`;
        } else if (currentConfig.aiEnabled && currentConfig.aiProvider !== 'none') {
            // 2. Use AI if enabled
            const aiResponse = await generateAIResponse(sessionId, contact, textMessage);
            if (aiResponse) {
                replyText = `*[${currentConfig.name} AI]*\n\n${aiResponse}`;
            } else {
                replyText = `*[${currentConfig.name} AI]*\nPrompt rule: ${currentConfig.prompt}\nI received: ${textMessage}`;
            }
        } else {
            // 3. Fallback to basic prompt reply
            replyText = `*[${currentConfig.name}]*\nPrompt rule: ${currentConfig.prompt}\nI received: ${textMessage}`;
        }

        setTimeout(async () => {
            try {
                const sentMsg = await sock.sendMessage(msg.key.remoteJid, { text: replyText });
                const msgId = sentMsg?.key?.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                
                // Save outgoing message in chat history table
                db.prepare('INSERT OR IGNORE INTO messages (id, session_id, contact, message_text, direction, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
                    msgId,
                    sessionId,
                    contact,
                    replyText,
                    'outgoing',
                    Date.now()
                );

                // Push real-time event to socket client
                io.emit('new_message', {
                    sessionId,
                    contact,
                    message: {
                        id: `outgoing-${Date.now()}`,
                        message_text: replyText,
                        direction: 'outgoing',
                        timestamp: Date.now()
                    }
                });

                // Save outgoing analytics
                db.prepare('INSERT INTO message_analytics (session_id, contact, message_type, timestamp, direction) VALUES (?, ?, ?, ?, ?)').run(
                    sessionId, contact, 'text', Date.now(), 'outgoing'
                );
            } catch(e) {
                console.error('Error sending message:', e);
            }
        }, delayMs);
    });
};

// Auto start all existing sessions globally
const activeSessions = getSessionsFromDB();
activeSessions.forEach((s, index) => {
    setTimeout(() => {
        initSession(s.id);
    }, index * 250);
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        
        try {
            const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decodedUser.id);
            if (!user) return res.status(403).json({ error: 'User does not exist' });
            if (user.isActive === 0) return res.status(403).json({ error: 'Account is deactivated' });
            
            req.user = {
                id: user.id,
                username: user.username,
                role: user.role || 'user',
                canCreateAgents: user.canCreateAgents !== undefined ? !!user.canCreateAgents : true,
                canBulkSend: user.canBulkSend !== undefined ? !!user.canBulkSend : true,
                canUseAI: user.canUseAI !== undefined ? !!user.canUseAI : true
            };
            next();
        } catch (e) {
            console.error('Auth DB check error:', e);
            return res.status(500).json({ error: 'Authentication check failed' });
        }
    });
};

const hasAccess = (req, sessionId) => {
    if (!req.user) return false;
    if (req.user.role === 'admin') return true;
    const sessionOwner = db.prepare('SELECT user_id FROM sessions WHERE id = ?').get(sessionId);
    return sessionOwner && sessionOwner.user_id === req.user.id;
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
        return res.status(400).json({ error: 'Username must be a valid email address' });
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        const id = 'user-' + Date.now();
        
        // Check if this is the first user
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const role = userCount === 0 || username.toLowerCase() === 'admin' ? 'admin' : 'user';
        
        db.prepare('INSERT INTO users (id, username, password, role, isActive, canCreateAgents, canBulkSend, canUseAI) VALUES (?, ?, ?, ?, 1, 1, 1, 1)').run(id, username, hash, role);
        res.json({ success: true, message: 'User registered successfully' });
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: e.message });
        }
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (user.isActive === 0) return res.status(403).json({ error: 'Account is deactivated' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ 
        token, 
        username: user.username, 
        role: user.role || 'user',
        permissions: {
            canCreateAgents: user.canCreateAgents !== undefined ? !!user.canCreateAgents : true,
            canBulkSend: user.canBulkSend !== undefined ? !!user.canBulkSend : true,
            canUseAI: user.canUseAI !== undefined ? !!user.canUseAI : true
        }
    });
});

// --- PROTECTED SESSION ROUTES ---
app.get('/api/sessions', authenticateToken, (req, res) => {
    let sessions;
    if (req.user.role === 'admin') {
        sessions = db.prepare('SELECT sessions.*, users.username as ownerName FROM sessions LEFT JOIN users ON sessions.user_id = users.id').all();
    } else {
        sessions = db.prepare('SELECT sessions.*, users.username as ownerName FROM sessions LEFT JOIN users ON sessions.user_id = users.id WHERE sessions.user_id = ?').all(req.user.id);
    }
    const data = sessions.map(s => ({
        ...s,
        isActive: !!s.isActive,
        aiEnabled: !!s.aiEnabled,
        allowGroups: !!s.allowGroups,
        allowPrivate: !!s.allowPrivate,
        status: clients[s.id] ? clients[s.id].status : 'disconnected',
        qr: clients[s.id] ? clients[s.id].qr : null,
        whatsappName: (clients[s.id] && clients[s.id].whatsappName) || s.whatsappName || '',
        whatsappAvatar: (clients[s.id] && clients[s.id].whatsappAvatar) || s.whatsappAvatar || ''
    }));
    res.json(data);
});

app.post('/api/sessions/add', authenticateToken, (req, res) => {
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Permission denied (Viewer mode)' });
    if (req.user.role !== 'admin' && !req.user.canCreateAgents) {
        return res.status(403).json({ error: 'Permission denied (Cannot create agents)' });
    }

    // Enforce maxAgents limit
    try {
        const userRow = db.prepare('SELECT maxAgents FROM users WHERE id = ?').get(req.user.id);
        const maxAgents = userRow ? userRow.maxAgents : 1;
        if (maxAgents !== -1) { // -1 means unlimited
            const currentCount = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(req.user.id).count;
            if (currentCount >= maxAgents) {
                return res.status(403).json({ error: `Agent limit reached! Your plan allows ${maxAgents} agent(s). Contact the administrator to upgrade your plan.` });
            }
        }
    } catch (e) {
        console.error('Error checking agent limit:', e);
    }

    const id = 'session-' + Date.now();
    const name = req.body.name || 'New Agent';
    console.log(`[DEBUG] /api/sessions/add called for user ${req.user.id} with name ${name}`);
    const prompt = 'You are a helpful AI assistant.';
    
    db.prepare('INSERT INTO sessions (id, user_id, name, prompt, isActive, replyDelay, msgCount) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, name, prompt, 1, 0, 0);
      
    initSession(id);
    
    const newSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    newSession.isActive = !!newSession.isActive;
    newSession.status = 'initializing';
    
    io.emit('new_session', newSession);
    res.json({ success: true, session: newSession });
});

app.post('/api/sessions/:id/update', authenticateToken, (req, res) => {
    const { id } = req.params;
    if (!hasAccess(req, id)) return res.status(403).json({ error: 'Unauthorized' });
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Permission denied (Viewer mode)' });

    const { name, prompt, isActive, replyDelay, aiEnabled, aiProvider, aiApiKey, aiModel, allowGroups, allowPrivate, aiMaxContext, aiCustomUrl } = req.body;
    
    if (aiEnabled && req.user.role !== 'admin' && !req.user.canUseAI) {
        return res.status(403).json({ error: 'Permission denied (AI usage not allowed)' });
    }

    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (prompt !== undefined) { fields.push('prompt = ?'); values.push(prompt); }
    if (isActive !== undefined) { fields.push('isActive = ?'); values.push(isActive ? 1 : 0); }
    if (replyDelay !== undefined) { fields.push('replyDelay = ?'); values.push(Number(replyDelay)); }
    if (aiEnabled !== undefined) { fields.push('aiEnabled = ?'); values.push(aiEnabled ? 1 : 0); }
    if (aiProvider !== undefined) { fields.push('aiProvider = ?'); values.push(aiProvider); }
    if (aiApiKey !== undefined) { fields.push('aiApiKey = ?'); values.push(aiApiKey); }
    if (aiModel !== undefined) { fields.push('aiModel = ?'); values.push(aiModel); }
    if (allowGroups !== undefined) { fields.push('allowGroups = ?'); values.push(allowGroups ? 1 : 0); }
    if (allowPrivate !== undefined) { fields.push('allowPrivate = ?'); values.push(allowPrivate ? 1 : 0); }
    if (aiMaxContext !== undefined) { fields.push('aiMaxContext = ?'); values.push(Number(aiMaxContext)); }
    if (aiCustomUrl !== undefined) { fields.push('aiCustomUrl = ?'); values.push(aiCustomUrl); }
    
    if (fields.length > 0) {
        values.push(id);
        db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
        updated.isActive = !!updated.isActive;
        updated.aiEnabled = !!updated.aiEnabled;
        updated.allowGroups = !!updated.allowGroups;
        updated.allowPrivate = !!updated.allowPrivate;
        io.emit('update_session', { sessionId: id, data: updated });
        res.json({ success: true, session: updated });
    } else {
        res.json({ success: true });
    }
});

app.post('/api/sessions/:id/logout', authenticateToken, (req, res) => {
    const { id } = req.params;
    if (!hasAccess(req, id)) return res.status(403).json({ error: 'Unauthorized' });
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Permission denied (Viewer mode)' });

    if (clients[id] && clients[id].sock) {
        clients[id].sock.logout().catch(() => {});
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Session not active' });
    }
});

app.post('/api/sessions/:id/delete', authenticateToken, (req, res) => {
    const { id } = req.params;
    if (!hasAccess(req, id)) return res.status(403).json({ error: 'Unauthorized' });
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Permission denied (Viewer mode)' });

    if (clients[id] && clients[id].sock) {
        clients[id].sock.logout().catch(() => {});
        delete clients[id];
    }
    
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    try {
        const authFolder = path.join(__dirname, 'baileys_auth', id);
        if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
        }
    } catch(e) {
        console.error('Failed to remove auth folder immediately (file locked). It will be orphaned:', e.message);
    }
    
    io.emit('delete_session', { sessionId: id });
    res.json({ success: true });
});

// --- ANALYTICS ROUTES ---
app.get('/api/analytics/:sessionId', authenticateToken, (req, res) => {
    const { sessionId } = req.params;
    if (!hasAccess(req, sessionId)) return res.status(403).json({ error: 'Unauthorized' });

    const total = db.prepare('SELECT COUNT(*) as count FROM message_analytics WHERE session_id = ?').get(sessionId);
    const incoming = db.prepare('SELECT COUNT(*) as count FROM message_analytics WHERE session_id = ? AND direction = ?').get(sessionId, 'incoming');
    const outgoing = db.prepare('SELECT COUNT(*) as count FROM message_analytics WHERE session_id = ? AND direction = ?').get(sessionId, 'outgoing');
    
    const topContacts = db.prepare(`
        SELECT contact, COUNT(*) as count 
        FROM message_analytics 
        WHERE session_id = ? 
        GROUP BY contact 
        ORDER BY count DESC 
        LIMIT 10
    `).all(sessionId);

    const last24h = db.prepare('SELECT COUNT(*) as count FROM message_analytics WHERE session_id = ? AND timestamp > ?').get(sessionId, Date.now() - 86400000);
    const last7days = db.prepare('SELECT COUNT(*) as count FROM message_analytics WHERE session_id = ? AND timestamp > ?').get(sessionId, Date.now() - 604800000);

    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const start = d.getTime();
        const end = start + 86400000;
        
        const dailyIncoming = db.prepare('SELECT COUNT(*) as count FROM message_analytics WHERE session_id = ? AND direction = ? AND timestamp >= ? AND timestamp < ?').get(sessionId, 'incoming', start, end);
        const dailyOutgoing = db.prepare('SELECT COUNT(*) as count FROM message_analytics WHERE session_id = ? AND direction = ? AND timestamp >= ? AND timestamp < ?').get(sessionId, 'outgoing', start, end);
        
        dailyStats.push({
            day: d.toLocaleDateString('en-US', { weekday: 'short' }),
            incoming: dailyIncoming.count,
            outgoing: dailyOutgoing.count
        });
    }

    res.json({
        total: total.count,
        incoming: incoming.count,
        outgoing: outgoing.count,
        topContacts,
        last24h: last24h.count,
        last7days: last7days.count,
        dailyStats
    });
});

// --- CONTACTS ROUTES ---
app.get('/api/contacts/:sessionId', authenticateToken, (req, res) => {
    const { sessionId } = req.params;
    if (!hasAccess(req, sessionId)) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const contacts = db.prepare('SELECT * FROM contacts WHERE session_id = ? ORDER BY last_message DESC').all(sessionId);
        res.json(contacts);
    } catch (e) {
        console.error('Error fetching contacts:', e);
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

app.post('/api/contacts/:id/update', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, tags, notes, lead_stage } = req.body;
    
    try {
        const contact = db.prepare('SELECT session_id FROM contacts WHERE id = ?').get(id);
        if (!contact) return res.status(404).json({ error: 'Contact not found' });
        if (!hasAccess(req, contact.session_id)) return res.status(403).json({ error: 'Unauthorized' });

        const fields = [];
        const values = [];
        if (name !== undefined) { fields.push('name = ?'); values.push(name); }
        if (tags !== undefined) { fields.push('tags = ?'); values.push(tags); }
        if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
        if (lead_stage !== undefined) { fields.push('lead_stage = ?'); values.push(lead_stage); }
        
        if (fields.length > 0) {
            values.push(id);
            db.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        }
        res.json({ success: true });
    } catch (e) {
        console.error('Error updating contact:', e);
        res.status(500).json({ error: 'Failed to update contact' });
    }
});

// --- SCHEDULED MESSAGES ROUTES ---
app.post('/api/scheduled/add', authenticateToken, (req, res) => {
    const { sessionId, contact, message, scheduledTime, isBroadcast } = req.body;
    if (!hasAccess(req, sessionId)) return res.status(403).json({ error: 'Unauthorized' });
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Permission denied (Viewer mode)' });

    if (isBroadcast && req.user.role !== 'admin' && !req.user.canBulkSend) {
        return res.status(403).json({ error: 'Permission denied (Broadcasting not allowed)' });
    }

    const id = 'sched-' + Date.now();
    db.prepare('INSERT INTO scheduled_messages (id, session_id, contact, message, scheduled_time, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
        id, sessionId, contact, message, scheduledTime, Date.now()
    );
    
    res.json({ success: true, id });
});

app.get('/api/scheduled/:sessionId', authenticateToken, (req, res) => {
    const { sessionId } = req.params;
    if (!hasAccess(req, sessionId)) return res.status(403).json({ error: 'Unauthorized' });

    const scheduled = db.prepare('SELECT * FROM scheduled_messages WHERE session_id = ? ORDER BY scheduled_time ASC').all(sessionId);
    res.json(scheduled);
});

app.delete('/api/scheduled/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const msg = db.prepare('SELECT session_id FROM scheduled_messages WHERE id = ?').get(id);
    if (!msg) return res.status(404).json({ error: 'Not found' });
    
    if (!hasAccess(req, msg.session_id)) return res.status(403).json({ error: 'Unauthorized' });
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Permission denied (Viewer mode)' });

    db.prepare('DELETE FROM scheduled_messages WHERE id = ?').run(id);
    res.json({ success: true });
});

// --- KEYWORD RULES ROUTES ---
app.get('/api/rules/:sessionId', authenticateToken, (req, res) => {
    const { sessionId } = req.params;
    if (!hasAccess(req, sessionId)) return res.status(403).json({ error: 'Unauthorized' });

    const rules = db.prepare('SELECT * FROM reply_rules WHERE session_id = ?').all(sessionId);
    res.json(rules);
});

app.post('/api/rules/add', authenticateToken, (req, res) => {
    const { sessionId, keyword, reply, matchType } = req.body;
    if (!hasAccess(req, sessionId)) return res.status(403).json({ error: 'Unauthorized' });
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Permission denied (Viewer mode)' });

    if (!keyword || !reply) return res.status(400).json({ error: 'Keyword and reply are required' });

    const id = 'rule-' + Date.now();
    db.prepare('INSERT INTO reply_rules (id, session_id, keyword, reply, is_exact) VALUES (?, ?, ?, ?, ?)')
      .run(id, sessionId, keyword, reply, matchType === 'exact' ? 1 : 0);

    res.json({ success: true, id });
});

app.delete('/api/rules/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const rule = db.prepare('SELECT session_id FROM reply_rules WHERE id = ?').get(id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });

    if (!hasAccess(req, rule.session_id)) return res.status(403).json({ error: 'Unauthorized' });
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Permission denied (Viewer mode)' });

    db.prepare('DELETE FROM reply_rules WHERE id = ?').run(id);
    res.json({ success: true });
});

// --- GENERIC FILE UPLOAD ---
app.post('/api/upload', authenticateToken, (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: 'File too large. Maximum size is 200MB.' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            return res.status(500).json({ error: `Server error: ${err.message}` });
        }
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const fileUrl = `http://localhost:3001/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
    });
});

// --- TEMPLATES API ---
app.get('/api/templates', authenticateToken, (req, res) => {
    try {
        const templates = db.prepare('SELECT * FROM templates').all();
        res.json(templates.map(t => ({ ...t, components: JSON.parse(t.components || '[]') })));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/templates', authenticateToken, (req, res) => {
    const { name, category, language, components } = req.body;
    if (!name || !components) return res.status(400).json({ error: 'Name and components required' });
    try {
        const id = `tpl-${Date.now()}`;
        db.prepare('INSERT INTO templates (id, name, category, language, components) VALUES (?, ?, ?, ?, ?)').run(
            id, name, category || 'Marketing', language || 'en', JSON.stringify(components)
        );
        res.json({ success: true, id });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/templates/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, category, language, components } = req.body;
    try {
        db.prepare('UPDATE templates SET name=?, category=?, language=?, components=? WHERE id=?').run(
            name, category, language, JSON.stringify(components), id
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/templates/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM templates WHERE id=?').run(id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- LIVE CHAT ROUTES ---
app.get('/api/chats/:sessionId', authenticateToken, (req, res) => {
    const { sessionId } = req.params;
    if (!hasAccess(req, sessionId)) return res.status(403).json({ error: 'Unauthorized' });

    // Fetch unique contacts who have messages, along with their last message and timestamp
    const chats = db.prepare(`
        SELECT contact, max(timestamp) as last_msg_time, 
        (SELECT message_text FROM messages WHERE session_id = ? AND contact = m.contact ORDER BY timestamp DESC LIMIT 1) as last_message,
        (SELECT direction FROM messages WHERE session_id = ? AND contact = m.contact ORDER BY timestamp DESC LIMIT 1) as last_direction,
        (SELECT COUNT(*) FROM messages WHERE session_id = ? AND contact = m.contact AND direction = 'incoming' AND is_read = 0) as unread_count
        FROM messages m
        WHERE session_id = ?
        GROUP BY contact
        ORDER BY last_msg_time DESC
    `).all(sessionId, sessionId, sessionId, sessionId);

    res.json(chats);
});

app.get('/api/chats/:sessionId/:contact', authenticateToken, (req, res) => {
    const { sessionId, contact } = req.params;
    if (!hasAccess(req, sessionId)) return res.status(403).json({ error: 'Unauthorized' });

    // Mark all incoming messages from this contact as read since they are being viewed
    db.prepare('UPDATE messages SET is_read = 1 WHERE session_id = ? AND contact = ? AND direction = ?').run(sessionId, contact, 'incoming');

    const messages = db.prepare('SELECT * FROM messages WHERE session_id = ? AND contact = ? ORDER BY timestamp ASC').all(sessionId, contact);
    res.json(messages);
});

app.post('/api/chats/:sessionId/:contact/read', authenticateToken, (req, res) => {
    const { sessionId, contact } = req.params;
    if (!hasAccess(req, sessionId)) return res.status(403).json({ error: 'Unauthorized' });

    db.prepare('UPDATE messages SET is_read = 1 WHERE session_id = ? AND contact = ? AND direction = ?').run(sessionId, contact, 'incoming');
    res.json({ success: true });
});

app.post('/api/chats/send', authenticateToken, async (req, res) => {
    const { sessionId, contact, message, mediaUrl, buttons, isBulk } = req.body;
    if (!sessionId || !contact || (!message && !mediaUrl)) return res.status(400).json({ error: 'Parameters missing' });

    if (!hasAccess(req, sessionId)) return res.status(403).json({ error: 'Unauthorized' });
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Permission denied (Viewer mode)' });

    // Check bulk sending permission
    if (isBulk && req.user.role !== 'admin' && !req.user.canBulkSend) {
        return res.status(403).json({ error: 'Permission denied (Bulk sending not allowed)' });
    }

    const client = clients[sessionId];
    if (!client || client.status !== 'ready') {
        return res.status(400).json({ error: 'WhatsApp client is not ready. Please connect it first.' });
    }

    try {
        let phone = contact.trim();
        if (!phone.includes('@')) phone += '@s.whatsapp.net';

        // Send through socket
        let sentMsg;
        let displayText = message || '';

        if (mediaUrl) {
            const fileName = mediaUrl.split('/').pop();
            const filePath = path.join(__dirname, 'uploads', fileName);
            
            if (fs.existsSync(filePath)) {
                const fileBuffer = fs.readFileSync(filePath);
                const ext = path.extname(fileName).toLowerCase();
                let messageContent;
                let mediaTypeLabel = 'DOCUMENT';
                
                if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                    messageContent = { image: fileBuffer, caption: message || '' };
                    mediaTypeLabel = 'IMAGE';
                } else if (['.mp4', '.webm', '.avi'].includes(ext)) {
                    messageContent = { video: fileBuffer, caption: message || '' };
                    mediaTypeLabel = 'VIDEO';
                } else if (['.mp3', '.ogg', '.wav'].includes(ext)) {
                    messageContent = { audio: fileBuffer, mimetype: 'audio/mp4', ptt: true };
                    mediaTypeLabel = 'AUDIO';
                } else {
                    messageContent = { document: fileBuffer, mimetype: 'application/octet-stream', fileName, caption: message || '' };
                }
                
                displayText = `[${mediaTypeLabel}] ${message ? '- ' + message : ''}\n${mediaUrl}`;
                
                if (buttons && buttons.length > 0) {
                    let buttonText = "\n\n";
                    buttons.forEach((b) => {
                        if (b.type === 'URL') buttonText += `🔗 *${b.text}*: ${b.url}\n`;
                        else if (b.type === 'CALL') buttonText += `📞 *${b.text}*: ${b.phone}\n`;
                        else buttonText += `▶ *${b.text}*\n`;
                    });
                    messageContent.caption = (messageContent.caption || '') + buttonText;
                    displayText += buttonText;
                }
                
                sentMsg = await client.sock.sendMessage(phone, messageContent);
            } else {
                console.warn(`File not found for mediaUrl: ${mediaUrl}, falling back to text only`);
                if (!message) return res.status(400).json({ error: 'Media file not found and no text message provided.' });
                
                let textMsg = { text: message };
                if (buttons && buttons.length > 0) {
                    let buttonText = "\n\n";
                    buttons.forEach((b) => {
                        if (b.type === 'URL') buttonText += `🔗 *${b.text}*: ${b.url}\n`;
                        else if (b.type === 'CALL') buttonText += `📞 *${b.text}*: ${b.phone}\n`;
                        else buttonText += `▶ *${b.text}*\n`;
                    });
                    textMsg.text += buttonText;
                    displayText += buttonText;
                }
                sentMsg = await client.sock.sendMessage(phone, textMsg);
            }
        } else {
            let textMsg = { text: message };
            if (buttons && buttons.length > 0) {
                let buttonText = "\n\n";
                buttons.forEach((b) => {
                    if (b.type === 'URL') buttonText += `🔗 *${b.text}*: ${b.url}\n`;
                    else if (b.type === 'CALL') buttonText += `📞 *${b.text}*: ${b.phone}\n`;
                    else buttonText += `▶ *${b.text}*\n`;
                });
                textMsg.text += buttonText;
                displayText += buttonText;
            }
            sentMsg = await client.sock.sendMessage(phone, textMsg);
        }

        const msgId = sentMsg?.key?.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        // Save manual message in chat history table
        db.prepare('INSERT OR IGNORE INTO messages (id, session_id, contact, message_text, direction, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
            msgId,
            sessionId,
            phone,
            displayText,
            'outgoing',
            Date.now()
        );

        // Push real-time event to socket clients
        io.emit('new_message', {
            sessionId,
            contact: phone,
            message: {
                id: msgId,
                message_text: displayText,
                direction: 'outgoing',
                timestamp: Date.now()
            }
        });

        // Update contact last message timestamp
        const contactExists = db.prepare('SELECT * FROM contacts WHERE session_id = ? AND phone = ?').get(sessionId, phone);
        if (!contactExists) {
            db.prepare('INSERT INTO contacts (id, session_id, phone, name, last_message) VALUES (?, ?, ?, ?, ?)').run(
                `contact-${Date.now()}`, sessionId, phone, phone, Date.now()
            );
        } else {
            db.prepare('UPDATE contacts SET last_message = ? WHERE session_id = ? AND phone = ?').run(Date.now(), sessionId, phone);
        }

        res.json({ success: true, messageId: msgId });
    } catch (e) {
        console.error('Error sending manual chat message:', e);
        res.status(500).json({ error: e.message });
    }
});

// --- SEND MEDIA (attachment/voice/video) ---
app.post('/api/chats/send-media', authenticateToken, upload.single('file'), async (req, res) => {
    const { sessionId, contact, caption } = req.body;
    if (!sessionId || !contact || !req.file) return res.status(400).json({ error: 'sessionId, contact and file are required' });
    if (!hasAccess(req, sessionId)) return res.status(403).json({ error: 'Unauthorized' });
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Permission denied (Viewer mode)' });

    const client = clients[sessionId];
    if (!client || client.status !== 'ready') {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'WhatsApp client is not ready.' });
    }

    try {
        let phone = contact.trim();
        if (!phone.includes('@')) phone += '@s.whatsapp.net';

        const fileBuffer = fs.readFileSync(req.file.path);
        const mimeType = req.file.mimetype;
        const fileName = req.file.originalname;

        let messageContent;
        if (mimeType.startsWith('image/')) {
            messageContent = { image: fileBuffer, caption: caption || '' };
        } else if (mimeType.startsWith('video/')) {
            messageContent = { video: fileBuffer, caption: caption || '' };
        } else if (mimeType.startsWith('audio/')) {
            // WhatsApp is very strict about audio mimetypes for PTT
            messageContent = { audio: fileBuffer, mimetype: 'audio/mp4', ptt: true };
        } else {
            messageContent = { document: fileBuffer, mimetype: mimeType, fileName, caption: caption || '' };
        }

        const sentMsg = await client.sock.sendMessage(phone, messageContent);
        const msgId = sentMsg?.key?.id || `msg-${Date.now()}`;

        const fileUrl = `http://localhost:3001/uploads/${req.file.filename}`;
        const mediaTypeLabel = mimeType.startsWith('image/') ? 'IMAGE' : mimeType.startsWith('video/') ? 'VIDEO' : mimeType.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT';
        const displayText = `[${mediaTypeLabel}] ${caption ? '- ' + caption : ''}\n${fileUrl}`;

        db.prepare('INSERT OR IGNORE INTO messages (id, session_id, contact, message_text, direction, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
            msgId, sessionId, phone, displayText, 'outgoing', Date.now()
        );

        io.emit('new_message', {
            sessionId, contact: phone,
            message: { id: msgId, message_text: displayText, direction: 'outgoing', timestamp: Date.now() }
        });

        const contactExists = db.prepare('SELECT * FROM contacts WHERE session_id = ? AND phone = ?').get(sessionId, phone);
        if (!contactExists) {
            db.prepare('INSERT INTO contacts (id, session_id, phone, name, last_message) VALUES (?, ?, ?, ?, ?)').run(
                `contact-${Date.now()}`, sessionId, phone, phone, Date.now()
            );
        } else {
            db.prepare('UPDATE contacts SET last_message = ? WHERE session_id = ? AND phone = ?').run(Date.now(), sessionId, phone);
        }

        res.json({ success: true, messageId: msgId });
    } catch (e) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('Error sending media:', e);
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/sessions/:id/test', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    if (!hasAccess(req, id)) return res.status(403).json({ error: 'Unauthorized' });
    if (req.user.role === 'viewer') return res.status(403).json({ error: 'Permission denied (Viewer mode)' });
    const sessionRow = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);

    const sbContact = 'sandbox-contact';

    // Log the virtual inbound message
    db.prepare('INSERT INTO messages (id, session_id, contact, message_text, direction, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
        `msg-${Date.now()}-sb-in`,
        id,
        sbContact,
        message,
        'incoming',
        Date.now()
    );

    // 1. Check keyword rules
    let reply;
    const matchedReply = matchKeywordRules(id, message);
    if (matchedReply) {
        reply = `*[${sessionRow.name} Rule]*\n\n${matchedReply}`;
    } else if (sessionRow.aiEnabled && sessionRow.aiProvider !== 'none') {
        // 2. Check AI Response with memory
        const aiReply = await generateAIResponse(id, sbContact, message);
        if (aiReply) {
            reply = `*[${sessionRow.name} AI]*\n\n${aiReply}`;
        }
    }

    if (!reply) {
        // 3. Fallback
        reply = `*[${sessionRow.name}]*\nPrompt rule: ${sessionRow.prompt}\nI received: ${message}`;
    }

    // Log the virtual outbound message
    db.prepare('INSERT INTO messages (id, session_id, contact, message_text, direction, timestamp) VALUES (?, ?, ?, ?, ?, ?)').run(
        `msg-${Date.now()}-sb-out`,
        id,
        sbContact,
        reply,
        'outgoing',
        Date.now()
    );

    res.json({ reply });
});

// --- ADMIN ROUTES ---
app.get('/api/admin/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const users = db.prepare('SELECT id, username, role, isActive, canCreateAgents, canBulkSend, canUseAI, maxAgents FROM users ORDER BY username ASC').all();
    const mapped = users.map(u => {
        const sessionsCount = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?').get(u.id)?.count || 0;
        return {
            ...u,
            isActive: u.isActive !== undefined ? !!u.isActive : true,
            canCreateAgents: u.canCreateAgents !== undefined ? !!u.canCreateAgents : true,
            canBulkSend: u.canBulkSend !== undefined ? !!u.canBulkSend : true,
            canUseAI: u.canUseAI !== undefined ? !!u.canUseAI : true,
            maxAgents: u.maxAgents !== undefined ? u.maxAgents : 1,
            sessionsCount
        };
    });
    res.json(mapped);
});

// Update user agent limit (Admin only)
app.post('/api/admin/users/:id/limits', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { id } = req.params;
    const { maxAgents } = req.body;
    if (maxAgents === undefined) return res.status(400).json({ error: 'maxAgents is required' });

    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        db.prepare('UPDATE users SET maxAgents = ? WHERE id = ?').run(parseInt(maxAgents), id);
        res.json({ success: true, message: `Agent limit updated to ${maxAgents === -1 ? 'Unlimited' : maxAgents}` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create user directly (Admin only)
app.post('/api/admin/users/create', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { username, password, role, canCreateAgents, canBulkSend, canUseAI } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    try {
        const hash = await bcrypt.hash(password, 10);
        const id = 'user-' + Date.now();
        
        db.prepare(`
            INSERT INTO users (id, username, password, role, isActive, canCreateAgents, canBulkSend, canUseAI) 
            VALUES (?, ?, ?, ?, 1, ?, ?, ?)
        `).run(
            id, 
            username, 
            hash, 
            role || 'user', 
            canCreateAgents ? 1 : 0, 
            canBulkSend ? 1 : 0, 
            canUseAI ? 1 : 0
        );
        res.json({ success: true, message: 'User created successfully' });
    } catch (e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: e.message });
        }
    }
});

// Update user settings (Admin only)
app.post('/api/admin/users/:id/update', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { id } = req.params;
    const { username, role, isActive, canCreateAgents, canBulkSend, canUseAI } = req.body;

    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (id === req.user.id) {
            if (isActive !== undefined && !isActive) {
                return res.status(400).json({ error: 'You cannot deactivate your own admin account' });
            }
            if (role !== undefined && role !== 'admin') {
                return res.status(400).json({ error: 'You cannot remove admin role from yourself' });
            }
        }

        const fields = [];
        const values = [];
        if (username !== undefined) { fields.push('username = ?'); values.push(username); }
        if (role !== undefined) { fields.push('role = ?'); values.push(role); }
        if (isActive !== undefined) { fields.push('isActive = ?'); values.push(isActive ? 1 : 0); }
        if (canCreateAgents !== undefined) { fields.push('canCreateAgents = ?'); values.push(canCreateAgents ? 1 : 0); }
        if (canBulkSend !== undefined) { fields.push('canBulkSend = ?'); values.push(canBulkSend ? 1 : 0); }
        if (canUseAI !== undefined) { fields.push('canUseAI = ?'); values.push(canUseAI ? 1 : 0); }

        if (fields.length > 0) {
            values.push(id);
            db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        }
        res.json({ success: true, message: 'User updated successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Reset user password (Admin only)
app.post('/api/admin/users/:id/password', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { id } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const hash = await bcrypt.hash(password, 10);
        db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, id);
        res.json({ success: true, message: 'Password reset successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete user (Admin only)
app.post('/api/admin/users/:id/delete', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { id } = req.params;

    if (id === req.user.id) {
        return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
        db.prepare('DELETE FROM users WHERE id = ?').run(id);

        res.json({ success: true, message: 'User and their agents deleted successfully' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/assign-session', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    
    const { sessionId, userId } = req.body;
    if (!sessionId || !userId) return res.status(400).json({ error: 'sessionId and userId are required' });
    
    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if session exists
    const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    // Update session owner
    db.prepare('UPDATE sessions SET user_id = ? WHERE id = ?').run(userId, sessionId);
    
    // Get updated session with owner name
    const updatedSession = db.prepare('SELECT sessions.*, users.username as ownerName FROM sessions LEFT JOIN users ON sessions.user_id = users.id WHERE sessions.id = ?').get(sessionId);
    updatedSession.isActive = !!updatedSession.isActive;
    updatedSession.aiEnabled = !!updatedSession.aiEnabled;
    updatedSession.allowGroups = !!updatedSession.allowGroups;
    updatedSession.allowPrivate = !!updatedSession.allowPrivate;
    
    io.emit('update_session', { sessionId, data: updatedSession });
    
    res.json({ success: true, message: 'Session assigned successfully', session: updatedSession });
});

// --- BULK EMAIL SENDER ROUTES ---

app.post('/api/email/verify-smtp', authenticateToken, async (req, res) => {
    const { smtpHost, smtpPort, smtpUser, smtpPass } = req.body;
    
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        return res.status(400).json({ error: 'Missing SMTP credentials' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(smtpPort),
            secure: Number(smtpPort) === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        await transporter.verify();
        res.json({ success: true, message: 'SMTP connection verified successfully' });
    } catch (error) {
        console.error('SMTP Verification Error:', error);
        res.status(401).json({ error: 'Failed to connect to SMTP server. Invalid credentials or host.' });
    }
});
app.post('/api/email/bulk-send', authenticateToken, async (req, res) => {
    // Only allow admin or users with bulk send permissions
    if (req.user.role !== 'admin' && !req.user.canBulkSend) {
        return res.status(403).json({ error: 'Permission denied (Bulk sending not allowed)' });
    }

    const { smtpHost, smtpPort, smtpUser, smtpPass, subject, htmlBody, recipients } = req.body;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !subject || !htmlBody || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: 'Missing required fields or recipients' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort),
            secure: parseInt(smtpPort) === 465, // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        // Verify connection configuration
        await transporter.verify();

        let successCount = 0;
        let failCount = 0;
        let errors = [];

        // Note: For a production scale we might want a queue like BullMQ, 
        // but for basic bulk sender this loop works for reasonable amounts.
        for (const recipient of recipients) {
            try {
                await transporter.sendMail({
                    from: `"${smtpUser.split('@')[0]}" <${smtpUser}>`, // sender address
                    to: recipient, // receiver
                    subject: subject, // Subject line
                    html: htmlBody, // html body
                });
                successCount++;
            } catch (err) {
                failCount++;
                errors.push({ email: recipient, error: err.message });
            }
            // slight delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        res.json({
            success: true,
            message: 'Bulk email campaign completed',
            results: { successCount, failCount, errors }
        });

    } catch (error) {
        console.error('SMTP Connection Error:', error);
        res.status(500).json({ error: 'Failed to connect to SMTP server. Check credentials.' });
    }
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
