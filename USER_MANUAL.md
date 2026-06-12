# 📖 User Manual - Complete Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Creating Your First Agent](#creating-your-first-agent)
3. [Configuring AI](#configuring-ai)
4. [Viewing Analytics](#viewing-analytics)
5. [Scheduling Messages](#scheduling-messages)
6. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### First Time Setup

1. **Start the Application**
   - Double-click `start.bat` (Windows)
   - Or run manually:
     ```bash
     # Terminal 1
     cd backend && npm start
     
     # Terminal 2
     cd frontend && npm run dev
     ```

2. **Open Browser**
   - Navigate to: `http://localhost:5173`
   - You should see the login screen

3. **Create Account**
   - Click "Register" button
   - Enter your username
   - Create a strong password
   - Click "Register"
   - You'll be logged in automatically

---

## Creating Your First Agent

### Step 1: Add New Agent

1. Click the **"New Agent"** button (top right)
2. A new agent card will appear
3. Default name will be "Agent 1"

### Step 2: Rename Agent

1. Click on the agent name
2. Type your desired name (e.g., "Customer Support Bot")
3. Press Enter or click outside

### Step 3: Connect WhatsApp

1. Open WhatsApp on your phone
2. Go to: **Menu (⋮) → Linked Devices**
3. Tap **"Link a Device"**
4. Scan the QR code shown in the agent card
5. Wait for "Connected" status (green badge)

### Step 4: Configure Basic Settings

1. Click **"Settings"** button
2. Configure:
   - **System Prompt**: Instructions for AI behavior
   - **Reply Delay**: Time in seconds before replying
   - **Auto Reply**: Toggle on/off
3. Click **"Save Changes"**

---

## Configuring AI

### OpenAI Setup

1. **Get API Key**
   - Visit: https://platform.openai.com/api-keys
   - Sign in or create account
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

2. **Configure in App**
   - Click **"AI"** button on agent card
   - Toggle **"Enable AI Responses"** ON
   - Select **"OpenAI"** as provider
   - Paste your API key
   - Choose model:
     - **GPT-3.5 Turbo**: Fast & cheap ($0.002/1K tokens)
     - **GPT-4**: Powerful ($0.03/1K tokens)
     - **GPT-4 Turbo**: Best quality
   - Click **"Save Settings"**

### Google Gemini Setup (Recommended for Testing)

1. **Get API Key**
   - Visit: https://ai.google.dev
   - Click "Get API Key"
   - Copy the key (starts with `AIza`)

2. **Configure in App**
   - Click **"AI"** button
   - Enable AI
   - Select **"Gemini"** as provider
   - Paste API key
   - Save

### Writing Good System Prompts

**Bad Example:**
```
You are helpful
```

**Good Example:**
```
You are a friendly customer support agent for TechShop Pakistan.

Rules:
- Always reply in Urdu
- Be polite and helpful
- If asked about products, provide details
- If asked about prices, say "Please contact manager"
- Keep replies under 100 words
- Use emoji occasionally 😊

Products we sell:
- Laptops
- Mobile phones
- Accessories

Working hours: 9 AM to 9 PM PKT
```

---

## Viewing Analytics

### Opening Analytics Dashboard

1. Click **"Stats"** button on any agent
2. Dashboard will open showing:

### Metrics Explained

**Total Messages**
- Sum of all incoming + outgoing messages

**Received**
- Messages you received from others

**Sent**
- Messages sent by your agent

**Last 24 Hours**
- Activity in past 24 hours

**Last 7 Days**
- Weekly activity overview

**Top Contacts**
- Most active contacts ranked
- Shows message count per contact

### Using Analytics

**Identify Peak Hours:**
- Check when most messages come
- Schedule your availability

**Track Engagement:**
- See which contacts are most active
- Prioritize important contacts

**Monitor Performance:**
- Track response rates
- Optimize AI prompts

---

## Scheduling Messages

### Contact Number Format

**Individual WhatsApp Numbers:**
```
Format: [country code][number]@s.whatsapp.net
Example: 923001234567@s.whatsapp.net
```

**WhatsApp Groups:**
```
Format: [group ID]@g.us
Example: 120363123456789@g.us
```

### How to Find Contact IDs

**Method 1: From Analytics**
- Open Analytics
- Check "Top Contacts" section
- Copy the contact ID

**Method 2: From Backend Logs**
- Check terminal where backend is running
- Contact IDs are logged when messages arrive

**Method 3: From Database**
- Open `sessions.db`
- Check `contacts` or `message_analytics` table

### Scheduling a Message

1. **Open Scheduler**
   - Click **"Schedule"** button on agent

2. **Fill Details**
   - **Contact**: Enter full contact ID
   - **Message**: Type your message
   - **Date**: Select future date
   - **Time**: Select time

3. **Schedule**
   - Click **"Schedule Message"**
   - Message appears in list as "Pending"

4. **Wait for Delivery**
   - Backend checks every 10 seconds
   - Message will send automatically
   - Status changes to "Sent" or "Failed"

### Managing Scheduled Messages

**View All:**
- All scheduled messages show in list
- Color-coded by status

**Delete:**
- Click trash icon on pending messages
- Confirm deletion

**Status Colors:**
- 🟡 **Pending**: Waiting to send
- 🟢 **Sent**: Successfully delivered
- 🔴 **Failed**: Delivery failed

---

## Tips & Best Practices

### 🎯 General Tips

1. **Start Small**
   - Create one agent first
   - Test with your own number
   - Expand once comfortable

2. **Test AI Prompts**
   - Start with simple prompts
   - Refine based on responses
   - Keep prompts detailed

3. **Monitor Regularly**
   - Check analytics daily
   - Adjust settings as needed
   - Update AI prompts

4. **Keep Backend Running**
   - For scheduled messages to work
   - For real-time updates
   - For AI responses

### 💰 Cost Optimization

1. **Use Gemini for Testing**
   - Free tier available
   - Good for development
   - No credit card needed initially

2. **Monitor OpenAI Usage**
   - Check dashboard: platform.openai.com
   - Set usage limits
   - Use GPT-3.5 for cost savings

3. **Optimize Prompts**
   - Shorter prompts = less cost
   - Clear instructions reduce retries
   - Set max response length

### 🔒 Security Best Practices

1. **Protect API Keys**
   - Never share your keys
   - Don't commit to git
   - Rotate keys regularly

2. **Strong Passwords**
   - Use unique passwords
   - At least 8 characters
   - Mix letters, numbers, symbols

3. **Backup Data**
   - Copy `sessions.db` regularly
   - Keep QR codes secure
   - Export important data

### ⚡ Performance Tips

1. **Limit Active Agents**
   - Keep only needed agents active
   - Turn off unused agents
   - Delete unnecessary agents

2. **Clear Old Data**
   - Archive old analytics
   - Remove old scheduled messages
   - Clean contacts periodically

3. **Optimize Reply Delay**
   - 2-5 seconds is natural
   - 0 seconds seems automated
   - 10+ seconds may miss opportunities

### 🎨 UI Tips

1. **Keyboard Shortcuts**
   - Enter: Submit forms
   - Escape: Close modals
   - Tab: Navigate fields

2. **Quick Actions**
   - Click agent name to rename
   - Toggle switches for quick on/off
   - Use search to find agents

3. **Organization**
   - Name agents descriptively
   - Use consistent naming
   - Group similar agents

---

## Common Scenarios

### Scenario 1: Customer Support Bot

**Setup:**
```
Name: Customer Support
System Prompt: 
"You are a helpful customer support agent.
Reply in customer's language.
Be friendly and professional.
Answer product questions.
Redirect complex issues to human agent."

Reply Delay: 3 seconds
AI Provider: OpenAI GPT-3.5
```

### Scenario 2: Auto-Reply Bot

**Setup:**
```
Name: Out of Office
System Prompt:
"I'm currently unavailable.
I'll respond within 24 hours.
For urgent matters, call: 0300-1234567"

Reply Delay: 1 second
AI: Disabled (static message)
```

### Scenario 3: Sales Bot

**Setup:**
```
Name: Sales Assistant
System Prompt:
"You are a sales representative.
Promote products enthusiastically.
Ask qualifying questions.
Close with call to action.
Use emoji to be friendly 😊"

Reply Delay: 5 seconds
AI Provider: Gemini Pro
```

---

## Troubleshooting

### QR Code Issues

**Problem:** QR code not showing
**Solution:**
1. Refresh the page
2. Check backend is running
3. Delete agent and create new one

### Connection Issues

**Problem:** Status stuck on "Connecting"
**Solution:**
1. Check internet connection
2. Restart backend server
3. Clear browser cache

### AI Not Responding

**Problem:** Getting basic replies instead of AI
**Solution:**
1. Verify AI is enabled
2. Check API key is correct
3. Verify API balance/quota
4. Check console for errors

### Scheduled Messages Not Sending

**Problem:** Messages stay "Pending"
**Solution:**
1. Ensure backend is running
2. Verify contact format is correct
3. Check agent status is "Connected"
4. Verify scheduled time is in future

---

## Support & Resources

### Documentation
- 📖 README.md - Complete overview
- 🇵🇰 URDU_GUIDE.md - Urdu instructions
- 🚀 QUICK_START.md - Quick setup
- ✨ FEATURES.md - Full feature list

### Getting Help
1. Check browser console (F12)
2. Check backend logs
3. Review troubleshooting section
4. Check GitHub issues (if applicable)

### Useful Links
- OpenAI Platform: https://platform.openai.com
- Google AI Studio: https://ai.google.dev
- WhatsApp Business: https://business.whatsapp.com

---

**Happy Automating! 🎉**

*Version 2.0.0 - Enhanced Edition*
*Last Updated: 2024*
