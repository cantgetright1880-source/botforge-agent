/**
 * BotForge Server - Simple standalone server
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3030;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL = process.env.OLLAMA_MODEL || 'minimax-m2.5:cloud';

// Simple task tracking
const tasks = [];
let taskId = 1;

// Load the chat API logic from the other file
const chatApi = require('./api/chat');

const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API routes
  if (req.url === '/api/health') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'BotForge is online', model: MODEL }));
    return;
  }

  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        const result = await chatApi.handleMessage(message, callLLM, spawnTask);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      } catch (e) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.url === '/api/tasks' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ tasks }));
    return;
  }

  // Serve index.html for root
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading page');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // 404 for everything else
  res.writeHead(404);
  res.end('Not found');
});

// Wrapper for spawning tasks
function spawnTask(task, description) {
  const t = { id: taskId++, task, description, status: 'running', startedAt: new Date().toISOString() };
  tasks.push(t);
  return t;
}

// Call Ollama
async function callLLM(prompt, system) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: MODEL,
      prompt: prompt,
      stream: false,
      system: system || 'You are BotForge, an AI CEO agent.'
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
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║          🤖 BOTFORGE - AI CEO AGENT               ║
╠═══════════════════════════════════════════════════╣
║  Web UI:    http://localhost:${PORT}                ║
║  API:       http://localhost:${PORT}/api           ║
╚═══════════════════════════════════════════════════╝
  `);
});
