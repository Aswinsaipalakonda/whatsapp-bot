require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const webhook = require('./webhook');
const { getAllSessions } = require('./sessions');
const { sendMessage } = require('./sendMessage');

const app = express();
app.use(express.json());

// Health check
app.get('/', (req, res) => res.send('🤖 Nidha Easy Loans Bot is Running!'));

// WhatsApp webhook
app.get('/webhook', webhook.verify);
app.post('/webhook', webhook.receive);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// CRON JOB: Run every day at 10 AM to follow up with inactive users
cron.schedule('0 10 * * *', async () => {
  console.log('⏰ Running daily cron job to check for inactive users...');
  const sessions = getAllSessions();
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const phone in sessions) {
    const session = sessions[phone];
    
    // If user hasn't interacted in the last 24 hours and we haven't nudged them yet
    if (now - session.lastActive >= ONE_DAY_MS && !session.nudged) {
      console.log(`Sending follow up to inactive user: ${phone}`);
      
      const templateMessage = `Hi there! 👋 This is Nidha Easy Loans. We noticed your inquiry was left incomplete. We are still here to help you get the best offer! Are you still looking for a loan or to check your CIBIL score? Reply 'Hi' to continue our chat. 🚀`;

      await sendMessage(phone, templateMessage);
      
      // Mark as nudged so we don't spam them
      session.nudged = true;
    }
  }
});
