# 🚀 Multi WhatsApp System - Urdu Guide

## Kya Naya Hai? ✨

### 1. 🤖 AI Smart Replies
Ab aapke agents intelligent responses de sakte hain! OpenAI (ChatGPT) ya Google Gemini use kar ke.

**Kaise Enable Karein:**
1. Agent card mein "AI Config" button pe click karein
2. "Enable AI Responses" toggle on karein
3. AI Provider select karein (OpenAI ya Gemini)
4. API Key daalein
5. Model select karein
6. Save karein

### 2. 📊 Analytics Dashboard
Apne messages ka poora data dekhein!

**Kya Milega:**
- Total messages
- Received aur sent messages
- Last 24 hours ki activity
- Last 7 days ka overview
- Top 10 contacts jo sabse zyada message karte hain

**Kaise Dekhein:**
- Agent card mein "Analytics" button pe click karein

### 3. ⏰ Message Scheduler
Future ke liye messages schedule karein!

**Kaise Use Karein:**
1. Agent card mein "Schedule" button pe click karein
2. Contact number daalein (format: 923001234567@s.whatsapp.net)
3. Message likhein
4. Date aur time select karein
5. "Schedule Message" pe click karein

**Note:** Backend running hona chahiye jab message send hona hai!

## Installation Kaise Karein? 🛠️

### Backend Start Karna
```bash
cd backend
npm install
node index.js
```

### Frontend Start Karna
```bash
cd frontend
npm install
npm run dev
```

## API Keys Kahan Se Milein? 🔑

### OpenAI Key
1. https://platform.openai.com pe jaayen
2. Sign up/Login karein
3. API Keys section mein jaayen
4. "Create new secret key" pe click karein
5. Key copy kar lein

**Cost:** 
- GPT-3.5 Turbo: Sasta (1000 messages = $0.002)
- GPT-4: Mehenga lekin powerful

### Google Gemini Key
1. https://ai.google.dev pe jaayen
2. "Get API Key" pe click karein
3. Key copy kar lein

**Cost:** Free tier available!

## Contact Number Format 📱

### Normal WhatsApp Number
```
923001234567@s.whatsapp.net
```
- 92 = Country code
- 3001234567 = Number (bina + ke)
- @s.whatsapp.net = Required suffix

### WhatsApp Group
```
120363XXXXXXXXXX@g.us
```

## Features Ki Tafseel 🎯

### 1. Session Management
- Multiple WhatsApp accounts ek saath
- Har agent ka apna naam
- Custom system prompt
- On/off toggle
- Reply delay (seconds mein)
- Message counter

### 2. AI Configuration
- OpenAI ChatGPT support
- Google Gemini support
- Custom personality
- Multiple models
- Smart context-aware replies

### 3. Analytics
- Total messages dekho
- Incoming vs outgoing
- 24 ghante ka data
- 7 din ka overview
- Top contacts list

### 4. Message Scheduler
- Specific date/time pe message send karo
- Multiple messages schedule karo
- Status tracking (pending/sent/failed)
- Easy delete option

## Common Problems & Solutions 🔧

### Problem 1: QR Code Nahi Aa Raha
**Solution:**
- Page refresh karein
- Backend running hai check karein
- Console logs check karein

### Problem 2: AI Response Nahi Aa Rahi
**Solution:**
- API key sahi hai check karein
- AI Enable hai ensure karein
- Console mein errors check karein
- API balance check karein

### Problem 3: Scheduled Message Send Nahi Hua
**Solution:**
- Backend running hona chahiye
- Contact format sahi hai verify karein
- Status "pending" se "sent" hona chahiye

### Problem 4: Analytics Show Nahi Ho Raha
**Solution:**
- Session "ready" status mein hona chahiye
- Pehle kuch messages receive/send karein
- Page refresh karein

## Pro Tips 💡

1. **AI Ko Train Karein**: System prompt mein detail se likhein ke aap kya chahte hain
   - ❌ Galat: "You are helpful"
   - ✅ Sahi: "You are a customer support agent for XYZ shop. Reply in Urdu. Be polite and helpful. Answer questions about products."

2. **Scheduling**: Messages ko kam se kam 2 minute advance mein schedule karein

3. **Analytics Ka Use**: Regular check karein ke kis time pe zyada messages aate hain

4. **Multiple Agents**: Different purposes ke liye alag agents banaayen
   - Agent 1: Customer Support
   - Agent 2: Sales
   - Agent 3: Personal

5. **API Costs**: OpenAI expensive hai, Gemini free tier use karein testing ke liye

## Database Info 💾

System automatically SQLite database use karta hai (`sessions.db`).

**Tables:**
- users (aapke accounts)
- sessions (WhatsApp agents)
- scheduled_messages (scheduled messages)
- message_analytics (message data)
- contacts (saved contacts)

## Security 🔒

- JWT authentication
- Password encryption (bcrypt)
- User-specific sessions
- API keys secure storage
- Protected routes

## Ye Features Future Mein Aangi 🔮

- [ ] Message templates
- [ ] Bulk messages
- [ ] Group management
- [ ] Media scheduling
- [ ] Webhook support
- [ ] Urdu/Hindi UI
- [ ] Export data
- [ ] Auto-reply rules

## Important Notes ⚠️

1. **Backend Running**: Backend hamesha running hona chahiye messages ke liye
2. **API Keys**: AI features ke liye paid API keys chahiye (free tier bhi hai)
3. **Internet**: Stable internet connection chahiye
4. **WhatsApp**: Official WhatsApp mobile app chahiye QR scan ke liye
5. **Contact Format**: Scheduling ke liye exact format zaroori hai

## Testing Kaise Karein? 🧪

1. Ek agent create karein
2. QR scan karein
3. Khud ko message bhejein
4. AI config karein
5. Analytics dekho
6. Ek message schedule karo (2 minute baad)
6. Check karo message send hua ya nahi

## Sample System Prompts 📝

### Customer Support Agent
```
You are a helpful customer support agent for ABC Company. 
Reply in Urdu language. 
Be polite, friendly, and professional. 
Answer questions about products, prices, and orders.
If you don't know something, ask them to contact manager.
```

### Sales Agent
```
You are an enthusiastic sales representative for XYZ Shop.
Reply in Urdu.
Your goal is to help customers find products they need.
Be persuasive but not pushy.
Always end with a call to action.
```

### Personal Assistant
```
You are a personal assistant.
Reply in casual Urdu.
Help with reminders, scheduling, and general queries.
Be friendly and conversational.
```

## Cost Estimation 💰

### OpenAI
- **GPT-3.5 Turbo**: $0.002 per 1K messages (bahut sasta)
- **GPT-4**: $0.03-0.06 per 1K messages (mehenga)
- 1000 messages = approx $0.002 to $0.06

### Gemini
- **Free Tier**: 60 requests per minute (testing ke liye kafi)
- **Paid**: Bahut sasta, OpenAI se kam

## Support 📞

Agar koi problem ho to:
1. Browser console (F12) check karein
2. Backend terminal output dekho
3. README.md file parho
4. Database file check karo

---

**Enjoy karo aur automate karo! 🎉**

Made with ❤️ by Kiro AI
