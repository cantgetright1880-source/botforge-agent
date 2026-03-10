/**
 * BotForge Server
 * Simple Express server to host the API and static UI
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Parse JSON first
app.use(express.json());

// Load the chat API BEFORE static files
const chatRouter = require('./api/chat');
app.use('/api', chatRouter);

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║          🤖 BOTFORGE - AI CEO AGENT               ║
╠═══════════════════════════════════════════════════╣
║  Web UI:    http://localhost:${PORT}                ║
║  API:       http://localhost:${PORT}/api           ║
╚═══════════════════════════════════════════════════╝
  `);
});
