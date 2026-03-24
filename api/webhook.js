/**
 * WhatsApp Webhook Handler
 * Main entry point for WhatsApp messages
 */

const { parseWebhookMessage, markAsRead } = require('../lib/whatsapp');
const { handleConversation } = require('../lib/conversation');
const { initializeSheets } = require('../lib/sheets');

// In-memory deduplication (for serverless, consider using Redis/KV)
const processedMessages = new Map();

// Clean old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, timestamp] of processedMessages.entries()) {
    if (now - timestamp > 10 * 60 * 1000) {
      processedMessages.delete(id);
    }
  }
}, 60000);

module.exports = async function handler(req, res) {
  // Handle webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'nidha_verify_token_2024';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verified successfully');
      return res.status(200).send(challenge);
    } else {
      console.error('Webhook verification failed');
      return res.status(403).send('Verification failed');
    }
  }

  // Handle incoming messages (POST request)
  if (req.method === 'POST') {
    try {
      const body = req.body;

      // Verify it's a WhatsApp message
      if (body?.object !== 'whatsapp_business_account') {
        return res.status(200).send('OK');
      }

      // Parse the message
      const message = parseWebhookMessage(body);

      if (!message) {
        // No valid message (could be status update, etc.)
        return res.status(200).send('OK');
      }

      // Deduplicate messages
      if (processedMessages.has(message.messageId)) {
        console.log('Duplicate message ignored:', message.messageId);
        return res.status(200).send('OK');
      }
      processedMessages.set(message.messageId, Date.now());

      // Mark message as read
      await markAsRead(message.messageId);

      // Initialize sheets (ensures headers exist)
      await initializeSheets();

      // Process the conversation
      console.log(`Processing message from ${message.from}: "${message.text}"`);

      await handleConversation(
        message.from,
        message.name,
        message.text,
        message.type
      );

      return res.status(200).send('OK');

    } catch (error) {
      console.error('Webhook error:', error);
      // Always return 200 to prevent Meta from retrying
      return res.status(200).send('OK');
    }
  }

  // Method not allowed
  return res.status(405).send('Method not allowed');
};
