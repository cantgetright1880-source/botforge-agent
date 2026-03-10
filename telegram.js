/**
 * BotForge Telegram Bot
 * Standalone Telegram bot using Bot API - doesn't conflict with OpenClaw
 */

const axios = require('axios');

// BotForge's Telegram bot (separate from Nova)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8149644054:AAEBvbM_E-Y6A9IC0ng1FKSWZwtFlHd_mLQ'; // Vera's bot
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Your chat ID (Jeremy)
const JEREMY_CHAT_ID = '8464449857';

/**
 * Send a message to Jeremy via Telegram
 */
async function sendToJeremy(text) {
  try {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: JEREMY_CHAT_ID,
      text: text,
      parse_mode: 'HTML'
    });
    return true;
  } catch (error) {
    console.error('Failed to send message:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Get updates from Telegram (polling)
 */
async function getUpdates(offset = 0) {
  try {
    const response = await axios.get(`${TELEGRAM_API}/getUpdates`, {
      params: {
        offset: offset,
        timeout: 30
      }
    });
    return response.data.result;
  } catch (error) {
    console.error('Failed to get updates:', error.message);
    return [];
  }
}

/**
 * Send typing indicator
 */
async function sendTyping(chatId) {
  try {
    await axios.post(`${TELEGRAM_API}/sendChatAction`, {
      chat_id: chatId,
      action: 'typing'
    });
  } catch (e) {
    // Ignore
  }
}

// Export for use in chat.js
module.exports = {
  sendToJeremy,
  getUpdates,
  sendTyping,
  TELEGRAM_API
};
