/**
 * BotForge API - AI CEO Agent
 * Receives messages from Jeremy, uses LLM to decide actions, spawns subagents
 * Vercel serverless-compatible with support for Ollama, OpenAI, and Anthropic
 */

const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Configuration from environment variables
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Determine which LLM to use (priority: OpenAI > Anthropic > Ollama)
const LLM_PROVIDER = OPENAI_API_KEY ? 'openai' : (ANTHROPIC_API_KEY ? 'anthropic' : 'ollama');

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
  } else {
    return callOllama(prompt, fullSystemPrompt);
  }
}

/**
 * Call Ollama API
 */
async function callOllama(prompt, systemPrompt) {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      system: systemPrompt
    }, {
      timeout: 30000
    });
    return response.data.response || '';
  } catch (error) {
    console.error('Ollama error:', error.message);
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

/**
 * Spawn a subagent to do work
 */
function spawnSubagent(task, description) {
  const id = taskIdCounter++;
  const subagentSession = `botforge-worker-${id}`;
  
  taskQueue.push({
    id,
    task,
    description,
    status: 'running',
    startedAt: new Date().toISOString()
  });

  return {
    taskId: id,
    session: subagentSession,
    message: `Started task: ${description}`
  };
}

/**
 * Check if a prompt suggests a task needs to be delegated
 */
async function analyzeIntent(message) {
  const analysisPrompt = `You are BotForge, an AI CEO. Analyze this message from your boss Jeremy:

"${message}"

Determine:
1. Does this require you to DO something (not just respond)? (yes/no)
2. If yes, what is the task in one sentence?
3. Can a single subagent handle this, or does it need multiple? (single/multiple)

Respond in this format:
ACTION: yes/no
TASK: [one sentence task description]
SCALE: single/multiple

If no action needed, respond:
ACTION: no
TASK: none
SCALE: none`;

  try {
    const response = await callLLM(analysisPrompt);
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
  const contextInfo = context ? `\nCurrent context: ${context}` : '';
  const responsePrompt = `You are BotForge, an AI CEO. Your boss Jeremy just sent you a message. Respond professionally, as a CEO would respond to their boss.

Jeremy says: "${message}"${contextInfo}

Respond as BotForge would - be direct, professional, and keep him informed of any actions you're taking.`;

  try {
    return await callLLM(responsePrompt);
  } catch (e) {
    return "I received your message. Let me process that and get back to you.";
  }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, context } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  console.log(`[BotForge] Received from Jeremy: ${message}`);

  try {
    // First, analyze what Jeremy wants
    const intent = await analyzeIntent(message);
    
    let response;
    let tasks = [];
    
    if (intent.action === 'yes' && intent.task !== 'none') {
      // Spawn a subagent for the task
      const subagent = spawnSubagent(intent.task, intent.task);
      tasks.push(subagent);
      
      response = await generateResponse(message, `I've just delegated: ${intent.task}`);
    } else {
      // Just respond directly
      response = await generateResponse(message, context);
    }

    res.json({
      botforge: response,
      tasks: tasks,
      intent: intent,
      llmProvider: LLM_PROVIDER
    });

  } catch (error) {
    console.error('[BotForge] Error:', error.message);
    res.json({
      botforge: "I received your message. Processing...",
      error: error.message
    });
  }
});

// Task status endpoint
app.get('/api/tasks', (req, res) => {
  res.json({ tasks: taskQueue });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'BotForge is online', 
    model: OLLAMA_MODEL,
    llmProvider: LLM_PROVIDER
  });
});

// Export for Vercel serverless
module.exports = app;
