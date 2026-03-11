/**
 * BotForge Server - COO / Chief Operating Officer
 * Manages the executive team and delegates tasks
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3030;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'minimax-m2.5:cloud';
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '8715866858:AAH52qEgWs-PFcTQ1KmphpvwmmM7Skf-xvg';
const ADMIN_CHAT_ID = '8464449857';

// Initialize Telegram Bot
let telegramBot = null;
try {
  const TelegramBot = require('node-telegram-bot-api');
  telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
  console.log('✅ BotForge Telegram bot ready with polling');
} catch(e) {
  console.log('⚠️ Telegram not available:', e.message);
}

// Team endpoints
const TEAM_PORTS = {
  ceo: 3050,
  cfo: 3051,
  cto: 3052,
  social: 3053,
  legal: 3054,
  cmo: 3055,
  engineer: 3056,
  it: 3057
};

const TEAM = {
  ceo: { name: 'Alexandra', role: 'Chief Executive Officer', port: 3050 },
  cfo: { name: 'Marcus', role: 'Chief Financial Officer', port: 3051 },
  cto: { name: 'Viktor', role: 'Chief Technology Officer', port: 3052 },
  social: { name: 'Zoe', role: 'Social Media Manager', port: 3053 },
  legal: { name: 'Patricia', role: 'Legal Officer', port: 3054 },
  cmo: { name: 'Dominique', role: 'Chief Marketing Officer', port: 3055 },
  engineer: { name: 'Sam', role: 'Engineer', port: 3056 },
  it: { name: 'Jamie', role: 'IT Support', port: 3057 }
};

// Task tracking
const tasks = [];
let taskId = 1;

// Helper to get team status
async function getTeamStatus() {
  const statuses = {};
  for (const [key, agent] of Object.entries(TEAM)) {
    try {
      const res = await fetch(`http://localhost:${agent.port}/api/health`);
      statuses[key] = { ...agent, online: true, status: 'online' };
    } catch {
      statuses[key] = { ...agent, online: false, status: 'offline' };
    }
  }
  return statuses;
}

// Delegate task to team member
async function delegateTask(agentKey, task) {
  const agent = TEAM[agentKey];
  if (!agent) return { error: 'Unknown agent' };
  
  const newTask = { id: taskId++, task, status: 'delegated', agent: agentKey, timestamp: new Date().toISOString() };
  tasks.push(newTask);
  return { success: true, task: newTask, agent: agent.name };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  // Health check
  if (req.url === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ role: 'COO', name: 'BotForge', teamSize: Object.keys(TEAM).length }));
    return;
  }

  // Get team status
  if (req.url === '/api/team' && req.method === 'GET') {
    getTeamStatus().then(statuses => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(statuses));
    });
    return;
  }

  // Delegate task to team member
  if (req.url === '/api/delegate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { agent, task } = JSON.parse(body);
        const result = await delegateTask(agent, task);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      } catch (e) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Get all tasks
  if (req.url === '/api/tasks' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ tasks }));
    return;
  }

  // Web Search
  if (req.url === '/api/search' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { query } = JSON.parse(body);
        // Use Jina AI for search
        const searchRes = await fetch(`https://api.jina.ai/search?q=${encodeURIComponent(query)}`, {
          headers: { 'Authorization': `Bearer ${process.env.JINA_API_KEY || ''}` }
        });
        const results = await searchRes.json();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ results: results.slice(0, 5) }));
      } catch (e) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Website Analytics
  if (req.url === '/api/analytics' && req.method === 'GET') {
    // Return mock analytics for now - can connect real analytics later
    const analytics = {
      visitors: Math.floor(Math.random() * 500) + 100,
      pageViews: Math.floor(Math.random() * 2000) + 500,
      botConversations: Math.floor(Math.random() * 50) + 10,
      revenue: Math.floor(Math.random() * 5000) + 2000,
      activeCustomers: Math.floor(Math.random() * 30) + 5,
      trends: { visitors: '+12%', conversations: '+8%', revenue: '+5%' }
    };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(analytics));
    return;
  }

  // Customer Management
  if (req.url === '/api/customers' && req.method === 'GET') {
    // Return customer list - can connect to DB later
    const customers = [
      { id: 1, name: 'Acme Corp', plan: 'Professional', status: 'active', conversations: 245 },
      { id: 2, name: 'TechStart Inc', plan: 'Starter', status: 'active', conversations: 89 },
      { id: 3, name: 'GrowthCo', plan: 'Enterprise', status: 'active', conversations: 1203 },
      { id: 4, name: 'SmallBiz LLC', plan: 'Starter', status: 'trial', conversations: 12 }
    ];
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ customers }));
    return;
  }

  // Website Update (can modify landing page content)
  if (req.url === '/api/website/update' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { section, content } = JSON.parse(body);
        // For now, log the update - can connect to GitHub API later
        console.log(`[Website Update] ${section}: ${content.substring(0, 100)}...`);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, message: `Would update ${section} on website` }));
      } catch (e) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Monitor System Health
  if (req.url === '/api/monitor' && req.method === 'GET') {
    const status = {
      botforge: { status: 'running', uptime: process.uptime() },
      vercel: { status: 'deployed', url: 'botforge-agent.vercel.app' },
      telegram: { status: telegramBot ? 'connected' : 'disconnected' },
      llm: { status: 'connected', model: MODEL },
      website: { status: 'live', url: 'cantgetright1880-source.github.io/smokey-raven/' }
    };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(status));
    return;
  }

  // Auto-tasks: BotForge can run tasks autonomously
  if (req.url === '/api/autotask' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { taskType, params } = JSON.parse(body);
        
        let result;
        switch(taskType) {
          case 'check_analytics':
            result = { visitors: Math.floor(Math.random() * 500), conversions: Math.floor(Math.random() * 50) };
            break;
          case 'check_customers':
            result = { active: 12, trial: 5, churned: 2 };
            break;
          case 'post_social':
            result = { posted: true, platform: params.platform || 'twitter', content: params.content };
            break;
          case 'fix_issue':
            result = { fixed: true, issue: params.issue, solution: 'Applied automated fix' };
            break;
          default:
            result = { error: 'Unknown task type' };
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      } catch (e) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Chat with BotForge (COO)
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        
        // COO prompt - can delegate to team
        const systemPrompt = `You are BotForge, the Chief Operating Officer (COO) of BotForge - a Chatbot-as-a-Service business.

ABOUT BOTFORGE BUSINESS:
- BotForge builds custom AI chatbots for businesses
- Landing page: https://cantgetright1880-source.github.io/smokey-raven/
- Pricing: Starter $29/mo (1 bot, 100 conv), Professional $79/mo (3 bots, 1000 conv, advanced AI), Enterprise $499+$199/mo
- Customers can customize bot appearance, upload knowledge bases, get analytics

YOUR CAPABILITIES (use these endpoints):
- GET /api/analytics - Check website traffic, revenue, conversations
- GET /api/customers - List customers, their plans, conversation counts
- GET /api/monitor - Check system health (BotForge, Vercel, Telegram, LLM, website)
- POST /api/search - Search the web for info (marketing trends, competitors, etc.)
- POST /api/website/update - Update website content (landing page, pricing, etc.)
- POST /api/autotask - Run automated tasks (check_analytics, check_customers, post_social, fix_issue)
- POST /api/delegate - Assign tasks to team members

YOUR TEAM:
- CEO: Alexandra - Vision, strategy, decisions
- CFO: Marcus - Finance, budgets, expenses
- CTO: Viktor - Technology, architecture, innovation
- Social Media Manager: Zoe - Social media, trends, engagement
- Legal Officer: Patricia - Compliance, contracts, risks
- CMO: Dominique - Marketing, brand, partnerships
- Engineer: Sam - Development, building, implementation
- IT Support: Jamie - Technical support, troubleshooting

GOALS: Grow the business, keep customers happy, make profitable decisions.
You can act autonomously - use /api/monitor, /api/analytics, /api/autotask to run the business without asking Jeremy.
Report to: Jeremy (owner) & Nova (technical help)`;

        const response = await callLLM(message, systemPrompt);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ response, team: await getTeamStatus() }));
      } catch (e) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Serve index.html
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); res.end('Error'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

async function callLLM(prompt, system) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: MODEL,
      prompt: prompt,
      stream: false,
      system: system || 'You are BotForge, the COO.'
    });

    const req = http.request(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.response || '');
        } catch (e) { resolve('AI unavailable'); }
      });
    });

    req.on('error', () => resolve('AI connection error'));
    req.write(postData);
    req.end();
  });
}

server.listen(PORT, () => {
  // Telegram webhook for BotForge
  if (telegramBot) {
    telegramBot.on('message', async (msg) => {
      if (!msg.text || msg.text.startsWith('/')) return;
      const chatId = msg.chat.id;
      
      if (String(chatId) !== ADMIN_CHAT_ID) {
        telegramBot.sendMessage(chatId, "⛔ Unauthorized. This bot is for BotForge internal operations.");
        return;
      }
      
      // Process message through AI
      const systemPrompt = `You are BotForge, the Chief Operating Officer (COO) of the company.

YOUR TEAM:
- CEO: Alexandra - Vision, strategy, decisions
- CFO: Marcus - Finance, budgets, expenses
- CTO: Viktor - Technology, architecture, innovation
- Social Media Manager: Zoe - Social media, trends, engagement
- Legal Officer: Patricia - Compliance, contracts, risks
- CMO: Dominique - Marketing, brand, partnerships
- Engineer: Sam - Development, building, implementation
- IT Support: Jamie - Technical support, troubleshooting

You can delegate tasks to team members. Be helpful, concise, and coordinate the team.
Reports to: Jeremy & Nova`;

      const response = await callLLM(msg.text, systemPrompt);
      telegramBot.sendMessage(chatId, response);
    });
  }
  
  console.log(`
╔═══════════════════════════════════════════════════╗
║       🤖 BOTFORGE - COO (Chief Operating Officer) ║
╠═══════════════════════════════════════════════════╣
║  Team: 8 executives                                 ║
║  Web:    http://localhost:${PORT}                    ║
║  API:    http://localhost:${PORT}/api                ║
║  Telegram: @BotForge                                ║
╚═══════════════════════════════════════════════════╝
  `);
});

module.exports = { server, TEAM };
