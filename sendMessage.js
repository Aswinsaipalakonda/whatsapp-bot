const axios = require('axios');

const BASE_URL = `https://graph.facebook.com/v19.0`;
const HEADERS = () => ({
  Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
});

// ✅ Send plain text message
async function sendMessage(to, text) {
  try {
    const chunks = splitMessage(text, 1000);
    for (const chunk of chunks) {
      await axios.post(`${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`, {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: chunk }
      }, { headers: HEADERS() });

      if (chunks.length > 1) await delay(500);
    }
  } catch (err) {
    console.error('❌ sendMessage error:', err.response?.data || err.message);
  }
}

// ✅ Send Welcome Message with Buttons (exactly like your screenshot)
async function sendWelcomeButtons(to) {
  try {
    await axios.post(`${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: '👋 Welcome to Nidha Easy Loans\n\nWe help you with smart loan solutions and complete CIBIL support, all under one trusted platform.\n\nPlease choose what you\'re looking for, and we\'ll guide you step by step 👇'
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'loan_assistance',
                title: '🏦 Loan Assistance'  // Max 20 chars
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'cibil_services',
                title: '📊 CIBIL Services'
              }
            }
          ]
        }
      }
    }, { headers: HEADERS() });

  } catch (err) {
    console.error('❌ sendWelcomeButtons error:', err.response?.data || err.message);
  }
}

// ✅ Send any custom buttons (reusable)
async function sendButtonMessage(to, bodyText, buttons) {
  // buttons = [{ id: 'btn1', title: 'Option 1' }, ...]
  try {
    await axios.post(`${BASE_URL}/${process.env.PHONE_NUMBER_ID}/messages`, {
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: {
          buttons: buttons.map(b => ({
            type: 'reply',
            reply: { id: b.id, title: b.title }
          }))
        }
      }
    }, { headers: HEADERS() });
  } catch (err) {
    console.error('❌ sendButtonMessage error:', err.response?.data || err.message);
  }
}

function splitMessage(text, maxLength) {
  if (text.length <= maxLength) return [text];
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxLength));
    i += maxLength;
  }
  return chunks;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { sendMessage, sendWelcomeButtons, sendButtonMessage };

/*

## How It Now Works

```
User types "Hii" or "Hi" or "Hello" or "Hey"
         ↓
webhook.js detects greeting via isGreeting()
         ↓
sendWelcomeButtons() is called
         ↓
User sees:
┌─────────────────────────────┐
│ 👋 Welcome to Nidha Easy    │
│ Loans...                    │
│                             │
│ [🏦 Loan Assistance]        │
│ [📊 CIBIL Services]         │
└─────────────────────────────┘
         ↓
User taps "Loan Assistance"
         ↓
webhook.js catches button reply
         ↓
AI asks: "Let's get started — what is your full name?"

```

*/