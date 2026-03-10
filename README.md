# 🔥 BotForge Agent - Quick Start

## Running the Agent

### Option 1: Run Locally
```bash
cd /root/.openclaw/workspace/botforge-agent
node agent.js
```

### Option 2: Add to OpenClaw
The agent can be spawned as a sub-agent when needed.

## Environment Variables
Create a `.env` file:
```
SENDCLAW_KEY=your_sendclaw_api_key
```

## What "Forge" Does

### Automatic Tasks (Scheduled)
- 📧 Check usage and alert customers at 80%
- 📧 Follow up with leads (day 3, day 7)
- 📧 Weekly check-ins with Enterprise customers
- 📧 Send monthly reports

### On-Demand
- 💬 Respond to customer messages
- 🎁 Create new bots
- 💳 Process upgrades
- 📊 Generate reports

## Testing

```javascript
const agent = require('./agent');

// Add a test customer
agent.addCustomer({
    name: 'John',
    email: 'john@test.com',
    business: 'Test Co',
    tier: 'professional'
});

// Process a message
agent.processMessage('john@test.com', 'I want to upgrade!').then(console.log);
```

## Integration Points

1. **SendClaw** - Already configured for emails
2. **BotForge Dashboard** - Can create bots via API
3. **Telegram** - Can be connected as a bot
4. **Webhook** - Can receive form submissions from landing page

## Cron Jobs to Set Up

| Job | Frequency | Action |
|-----|-----------|--------|
| Usage Check | Daily 9am | Check 80% usage, send alerts |
| Lead Follow-up | Daily 10am | Follow up with leads |
| Enterprise Check-in | Weekly Monday | Check in with enterprise |
| Monthly Reports | 1st of month | Send monthly reports |
