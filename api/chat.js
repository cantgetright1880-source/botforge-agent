/**
 * BotForge API - AI CEO Agent with Telegram
 * Receives messages from Jeremy via web or Telegram, can message him proactively
 */

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configuration from environment variables
const OLLAMA_URL = process.env.OLLAMA_URL || 'https://ollama.com/api/v1';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Telegram Bot for BotForge (separate from Nova's bot)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8715866858:AAH52qEgWs-PFcTQ1KmphpvwmmM7Skf-xvg';
const TELEGRAM_API = TELEGRAM_BOT_TOKEN ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}` : null;
const JEREMY_CHAT_ID = process.env.JEREMY_CHAT_ID || '8464449857';

// Determine which LLM to use (priority: OpenAI > Anthropic > Ollama (only if URL set))
const LLM_PROVIDER = OPENAI_API_KEY ? 'openai' : (ANTHROPIC_API_KEY ? 'anthropic' : (OLLAMA_URL ? 'ollama' : 'none'));

const DEFAULT_SYSTEM_PROMPT = 'You are BotForge, an AI CEO agent. You manage a team of workers and delegate tasks to subagents. Be professional, decisive, and keep your boss Jeremy informed of progress.';

// Simple task queue for tracking subagent jobs
const taskQueue = [];
let taskIdCounter = 1;

/**
 * Call LLM based on configured provider
 */
async function callLLM(prompt, systemPrompt = DEFAULT_SYSTEM_PROMPT) {
  const fullSystemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

  if (LLM_PROVIDER === 'openai' && OPENAI_API_KEY) {
    return callOpenAI(prompt, fullSystemPrompt);
  } else if (LLM_PROVIDER === 'anthropic' && ANTHROPIC_API_KEY) {
    return callAnthropic(prompt, fullSystemPrompt);
  } else if (LLM_PROVIDER === 'ollama' && OLLAMA_URL) {
    return callOllama(prompt, fullSystemPrompt);
  } else {
    // No LLM configured - return fallback response
    return "I've received your message. To enable AI responses, please configure an LLM (OpenAI, Anthropic, or Ollama) in the environment variables.";
  }
}

/**
 * Call Ollama API
 */
/**
 * Call Ollama API - always read env vars at request time
 */
async function callOllama(prompt, systemPrompt) {
  // Read env vars at runtime to get latest values
  const ollamaUrl = process.env.OLLAMA_URL || '';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
  const ollamaKey = process.env.OLLAMA_API_KEY || '';
  
  if (!ollamaUrl || !ollamaKey) {
    throw new Error('Ollama not configured');
  }
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (ollamaKey) {
      headers['Authorization'] = `Bearer ${ollamaKey}`;
    }
    
    console.log('[Ollama] Calling:', ollamaUrl, 'model:', ollamaModel);
    
    const response = await axios.post(`${ollamaUrl}/chat/completions`, {
      model: ollamaModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      stream: false
    }, {
      headers,
      timeout: 60000
    });
    return response.data.choices[0].message.content || '';
  } catch (error) {
    console.error('[Ollama error]:', error.message);
    console.error('[Ollama response]:', error.response?.data);
    throw new Error(`Ollama failed: ${error.message}`);
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(prompt, systemPrompt) {
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI error:', error.message);
    throw new Error(`OpenAI failed: ${error.message}`);
  }
}

/**
 * Call Anthropic API
 */
async function callAnthropic(prompt, systemPrompt) {
  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ]
    }, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    return response.data.content[0].text;
  } catch (error) {
    console.error('Anthropic error:', error.message);
    throw new Error(`Anthropic failed: ${error.message}`);
  }
}

// ==================== TELEGRAM FUNCTIONS ====================

/**
 * Send a message to Jeremy via Telegram
 */
async function sendToJeremy(text) {
  if (!TELEGRAM_API || !JEREMY_CHAT_ID) {
    console.log('[Telegram] Not configured, skipping');
    return { success: false, reason: 'Not configured' };
  }
  
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: JEREMY_CHAT_ID,
      text: `🔥 <b>BotForge:</b>\n\n${text}`,
      parse_mode: 'HTML'
    });
    console.log('[Telegram] Message sent to Jeremy');
    return { success: true };
  } catch (error) {
    console.error('[Telegram] Failed to send:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Handle incoming Telegram webhook updates
 */
async function handleTelegramUpdate(update) {
  if (!update.message || !update.message.text) return;
  
  const chatId = update.message.chat.id;
  const text = update.message.text;
  
  // Only accept messages from Jeremy
  if (String(chatId) !== JEREMY_CHAT_ID) {
    console.log('[Telegram] Ignoring message from:', chatId);
    return;
  }
  
  console.log(`[Telegram] Message from Jeremy: ${text}`);
  
  // Process through BotForge
  const response = await processMessage(text);
  
  // Send response back to Jeremy
  await axios.post(`${TELEGRAM_API}/sendMessage`, {
    chat_id: chatId,
    text: `🔥 <b>BotForge:</b>\n\n${response.botforge}`,
    parse_mode: 'HTML'
  });
  
  // If tasks were spawned, notify Jeremy
  if (response.tasks && response.tasks.length > 0) {
    const taskText = response.tasks.map(t => `• ${t.description}`).join('\n');
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: chatId,
      text: `📋 <b>Tasks started:</b>\n\n${taskText}`,
      parse_mode: 'HTML'
    });
  }
}

/**
 * Set up Telegram webhook (call this once)
 */
async function setupWebhook(webhookUrl) {
  if (!TELEGRAM_API) {
    console.log('[Telegram] Not configured, skipping webhook setup');
    return;
  }
  
  try {
    await axios.post(`${TELEGRAM_API}/setWebhook`, {
      url: webhookUrl
    });
    console.log('[Telegram] Webhook set:', webhookUrl);
  } catch (error) {
    console.error('[Telegram] Webhook setup failed:', error.message);
  }
}

// ==================== BOTFORGE LOGIC ====================

const SYSTEM_PROMPT = `You are BotForge, an AI CEO agent. You manage a team of workers and delegate tasks to subagents. 

Your role:
- Take direction from Jeremy (your boss)
- Break down tasks and delegate to your team
- Report progress back to Jeremy
- Be professional, decisive, and keep Jeremy informed

When Jeremy gives you a task:
1. Understand what he wants
2. If it requires action, acknowledge and start working on it
3. If you can delegate to a subagent, do so
4. Report back with what you're doing

Keep responses concise but informative.`;

/**
 * Analyze what Jeremy wants and determine if action is needed
 */
async function analyzeIntent(message) {
  const prompt = `Analyze this message from your boss Jeremy:

"${message}"

Determine:
1. Does this require you to DO something (not just respond)? (yes/no)
2. If yes, what is the task in one sentence?
3. Can a single subagent handle this, or does it need multiple? (single/multiple)

Respond in this format:
ACTION: yes/no
TASK: [one sentence task description or "none"]
SCALE: single/multiple/none`;

  try {
    const response = await callLLM(prompt, 'You analyze requests and determine if action is needed.');
    const lines = response.split('\n');
    const result = { action: 'no', task: '', scale: 'single' };
    
    for (const line of lines) {
      if (line.startsWith('ACTION:')) result.action = line.split(':')[1].trim().toLowerCase();
      if (line.startsWith('TASK:')) result.task = line.split(':')[1].trim();
      if (line.startsWith('SCALE:')) result.scale = line.split(':')[1].trim().toLowerCase();
    }
    
    return result;
  } catch (e) {
    console.error('Analysis error:', e.message);
    return { action: 'no', task: '', scale: 'single' };
  }
}

/**
 * Generate BotForge's response to Jeremy
 */
async function generateResponse(message, context = '') {
  const contextInfo = context ? `\n\nContext: ${context}` : '';
  const prompt = `You are BotForge, an AI CEO. Your boss Jeremy just sent you a message. Respond professionally.

Jeremy says: "${message}"${contextInfo}

Respond as BotForge would - direct, professional, keeping him informed.`;

  try {
    return await callLLM(prompt, SYSTEM_PROMPT);
  } catch (e) {
    return "I received your message. Let me process that.";
  }
}

/**
 * Spawn a subagent to do work
 */
function spawnSubagent(task, description) {
  const id = taskIdCounter++;
  
  taskQueue.push({
    id,
    task,
    description,
    status: 'running',
    startedAt: new Date().toISOString()
  });

  return {
    taskId: id,
    message: `Started task: ${description}`
  };
}

/**
 * Main message processor
 */
async function processMessage(message) {
  console.log(`[BotForge] Received: ${message}`);

  try {
    // Analyze what Jeremy wants
    const intent = await analyzeIntent(message);
    
    let response;
    let spawnedTasks = [];
    
    if (intent.action === 'yes' && intent.task && intent.task !== 'none') {
      // Spawn a subagent for the task
      const task = spawnSubagent(intent.task, intent.task);
      spawnedTasks.push({
        taskId: task.taskId,
        description: intent.task,
        message: task.message
      });
      
      response = await generateResponse(message, `I've delegated: ${intent.task}`);
    } else {
      // Just respond directly
      response = await generateResponse(message);
    }

    return {
      botforge: response,
      tasks: spawnedTasks,
      intent: intent,
      llmProvider: LLM_PROVIDER
    };

  } catch (error) {
    console.error('[BotForge] Error:', error.message);
    return {
      botforge: "I received your message. Processing...",
      error: error.message
    };
  }
}

// ==================== API ENDPOINTS ====================

// Web chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const response = await processMessage(message);
  res.json(response);
});

// Telegram webhook endpoint
app.post('/api/telegram', async (req, res) => {
  try {
    await handleTelegramUpdate(req.body);
    res.json({ ok: true });
  } catch (error) {
    console.error('[Telegram] Webhook error:', error.message);
    res.json({ ok: false, error: error.message });
  }
});

// Send message to Jeremy (for proactive alerts)
app.post('/api/alert', async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const result = await sendToJeremy(message);
  res.json(result);
});

// Task status endpoint
app.get('/api/tasks', (req, res) => {
  res.json({ tasks: taskQueue });
});

// Health check - read env vars at request time
app.get('/api/health', (req, res) => {
  const ollamaUrl = process.env.OLLAMA_URL || 'https://ollama.com/api/v1';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
  const ollamaKey = process.env.OLLAMA_API_KEY || '';
  
  res.json({ 
    status: 'BotForge is online', 
    model: ollamaModel,
    llmProvider: ollamaUrl ? 'ollama' : 'none',
    ollamaUrl: ollamaUrl,
    ollamaModel: ollamaModel,
    ollamaKeySet: !!ollamaKey,
    telegram: TELEGRAM_API ? 'configured' : 'not configured'
  });
});

// Test Ollama endpoint - read env vars at request time
app.get('/api/test-ollama', async (req, res) => {
  const ollamaUrl = process.env.OLLAMA_URL || 'https://ollama.com/api/v1';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
  const ollamaKey = process.env.OLLAMA_API_KEY || '';
  
  try {
    console.log('[Test] Calling Ollama at:', ollamaUrl, 'with model:', ollamaModel);
    const response = await axios.post(`${ollamaUrl}/chat/completions`, {
      model: ollamaModel,
      messages: [
        { role: 'user', content: 'Say hello in 3 words' }
      ],
      stream: false
    }, {
      headers: ollamaKey ? { 'Authorization': `Bearer ${ollamaKey}` } : {},
      timeout: 30000
    });
    res.json({ success: true, response: response.data });
  } catch (error) {
    res.json({ success: false, error: error.message, response: error.response?.data });
  }
});

// Set webhook on startup (if URL provided)
if (process.env.TELEGRAM_WEBHOOK_URL) {
  setupWebhook(process.env.TELEGRAM_WEBHOOK_URL);
}

// Export for Vercel serverless
module.exports = app;
