# 🚀 Multi-Agent WhatsApp System - ENHANCED EDITION

Yeh ek powerful multi-agent WhatsApp management system hai jo aapko multiple WhatsApp accounts ko simultaneously manage karne ki facility deta hai, with **AI-powered responses**, **analytics dashboard**, aur **message scheduling**!

## ✨ NEW FEATURES

### 1. 🤖 AI-Powered Smart Replies
- **OpenAI Integration** - ChatGPT 3.5, GPT-4, GPT-4 Turbo support
- **Google Gemini Integration** - Gemini Pro model support
- Custom personality har agent ke liye
- Context-aware intelligent responses
- Real-time AI conversations

### 2. 📊 Analytics Dashboard
- Total messages count (incoming/outgoing)
- Last 24 hours statistics
- Last 7 days overview
- Top 10 contacts tracking
- Beautiful visual statistics

### 3. ⏰ Message Scheduler
- Schedule messages for future dates
- Bulk message planning
- Track sent/pending/failed messages
- Easy contact management
- Timezone-aware scheduling

### 4. 👥 Contact Management
- Automatic contact saving
- Last message tracking
- Contact notes and tags
- Contact analytics

## 🛠️ Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Setup

1. **Backend Setup**
```bash
cd backend
npm install
node index.js
```

2. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

Backend will run on: `http://localhost:3001`
Frontend will run on: `http://localhost:5173`

## 📱 Usage Guide

### Step 1: Register/Login
- Open frontend URL
- Create account or login
- Your account is JWT protected

### Step 2: Add Agent
- Click "Add New Agent" button
- Name your agent
- Configure system prompt

### Step 3: Connect WhatsApp
- Scan QR code with WhatsApp
- Wait for "READY" status
- Your agent is now live!

### Step 4: Configure AI (Optional)
- Click "AI Config" button
- Enable AI responses
- Select provider (OpenAI or Gemini)
- Enter your API key
- Choose model

### Step 5: View Analytics
- Click "Analytics" button
- See message statistics
- Track top contacts
- Monitor activity

### Step 6: Schedule Messages
- Click "Schedule" button
- Enter contact number (with @s.whatsapp.net)
- Write message
- Select date and time
- Click "Schedule Message"

## 🔑 Getting API Keys

### OpenAI
1. Visit: https://platform.openai.com
2. Go to API Keys section
3. Create new secret key
4. Copy and paste in AI Config

### Google Gemini
1. Visit: https://ai.google.dev
2. Get API Key
3. Copy and paste in AI Config

## 🎨 Features Breakdown

### Session Management
- ✅ Multiple WhatsApp sessions
- ✅ Individual session controls
- ✅ Custom prompts per agent
- ✅ Toggle on/off
- ✅ Reply delay configuration
- ✅ Message counter

### AI Features
- ✅ OpenAI GPT-3.5/4 integration
- ✅ Google Gemini integration
- ✅ Custom system prompts
- ✅ Context-aware responses
- ✅ Multiple AI models support

### Analytics
- ✅ Real-time message tracking
- ✅ Incoming/outgoing stats
- ✅ Time-based analytics (24h, 7d)
- ✅ Top contacts list
- ✅ Contact frequency analysis

### Scheduler
- ✅ Date/time based scheduling
- ✅ Multiple scheduled messages
- ✅ Status tracking (pending/sent/failed)
- ✅ Easy message management
- ✅ Auto-send on scheduled time

### Contact Management
- ✅ Auto-save contacts
- ✅ Last message timestamp
- ✅ Notes and tags (future enhancement)
- ✅ Contact analytics

## 🔒 Security Features
- JWT authentication
- Password hashing (bcrypt)
- User-specific sessions
- Protected API routes
- Secure token storage

## 📊 Database Schema

### Users Table
- id, username, password

### Sessions Table
- id, user_id, name, prompt, isActive, replyDelay, msgCount
- **NEW**: aiEnabled, aiProvider, aiApiKey, aiModel

### Scheduled Messages Table
- id, session_id, contact, message, scheduled_time, status, created_at

### Message Analytics Table
- id, session_id, contact, message_type, timestamp, direction

### Contacts Table
- id, session_id, phone, name, tags, notes, last_message

## 🌟 Tech Stack

### Backend
- Node.js + Express
- Socket.io (real-time)
- Better-SQLite3 (database)
- Baileys (WhatsApp library)
- JWT + bcrypt (auth)

### Frontend
- React 19
- Vite
- Lucide Icons
- Axios
- Socket.io-client

## 🎯 Contact Number Format

When scheduling messages, use this format:
```
923001234567@s.whatsapp.net
```

- Country code (92 for Pakistan)
- Phone number without +
- @s.whatsapp.net suffix

For groups:
```
120363XXXXXXXXXX@g.us
```

## 💡 Pro Tips

1. **AI Response Quality**: Write detailed system prompts for better AI responses
2. **Scheduling**: Schedule messages 1-2 minutes in advance minimum
3. **Analytics**: Check analytics regularly to optimize your strategy
4. **API Keys**: Keep your AI API keys secure
5. **Multiple Agents**: Use different agents for different purposes

## 🚨 Important Notes

- AI features require API keys (paid services)
- Scheduled messages check every 10 seconds
- Keep backend running for scheduled messages to work
- Analytics update in real-time
- Contact format must be exact for scheduling

## 🔮 Future Enhancements

- [ ] Message templates library
- [ ] Bulk message sending
- [ ] Group management
- [ ] Media scheduling
- [ ] Webhook integrations
- [ ] Multi-language UI
- [ ] Export analytics
- [ ] Contact tagging system
- [ ] Auto-reply rules
- [ ] Message filters

## 📞 Support

For any issues or questions, check:
1. Console logs in browser (F12)
2. Backend terminal output
3. Database file (sessions.db)

## 🎉 Credits

Built with ❤️ by Kiro AI
Enhanced with AI, Analytics, and Scheduling features!

---

**Happy Automating! 🚀**
