/**
 * WhatsApp Cloud API Helper
 * Handles sending messages via Meta WhatsApp Business API
 */

const WHATSAPP_API_URL = 'https://graph.facebook.com/v19.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

/**
 * Send a text message to a WhatsApp user
 */
async function sendTextMessage(to, text) {
  const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: text }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('WhatsApp API Error:', data);
    throw new Error(`WhatsApp API Error: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Send interactive buttons to a WhatsApp user
 */
async function sendButtonMessage(to, bodyText, buttons) {
  const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;

  // WhatsApp allows max 3 buttons
  const formattedButtons = buttons.slice(0, 3).map((btn, index) => ({
    type: 'reply',
    reply: {
      id: btn.id || `btn_${index}`,
      title: btn.title.substring(0, 20) // Max 20 chars
    }
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: { buttons: formattedButtons }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('WhatsApp API Error:', data);
    throw new Error(`WhatsApp API Error: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Send a list message to a WhatsApp user
 */
async function sendListMessage(to, bodyText, buttonText, sections) {
  const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: bodyText },
        action: {
          button: buttonText,
          sections: sections
        }
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('WhatsApp API Error:', data);
    throw new Error(`WhatsApp API Error: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Mark a message as read
 */
async function markAsRead(messageId) {
  const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
    });
  } catch (error) {
    console.error('Failed to mark message as read:', error);
  }
}

/**
 * Parse incoming webhook message
 */
function parseWebhookMessage(body) {
  try {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) {
      return null;
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    let text = '';
    let messageType = message.type;

    if (messageType === 'text') {
      text = message.text?.body?.trim() || '';
    } else if (messageType === 'interactive') {
      const interactive = message.interactive;
      if (interactive?.button_reply) {
        text = interactive.button_reply.title || interactive.button_reply.id;
        messageType = 'button';
      } else if (interactive?.list_reply) {
        text = interactive.list_reply.title || interactive.list_reply.id;
        messageType = 'list';
      }
    } else if (messageType === 'button') {
      text = message.button?.text || message.button?.payload || '';
    }

    return {
      messageId: message.id,
      from: message.from,
      name: contact?.profile?.name || 'User',
      text: text,
      type: messageType,
      timestamp: message.timestamp
    };
  } catch (error) {
    console.error('Error parsing webhook message:', error);
    return null;
  }
}

/**
 * Check if text is a greeting
 */
function isGreeting(text) {
  const greetings = [
    'hi', 'hii', 'hiii', 'hiiii', 'hello', 'hey', 'helo', 'hye', 'heya',
    'good morning', 'good evening', 'good afternoon', 'goodmorning',
    'goodevening', 'goodafternoon', 'morning', 'evening', 'namaste',
    'namaskar', 'namaskaram', 'vanakkam', 'hola', 'start', 'begin',
    'help', 'menu', 'hai', 'haii', 'haiii', 'yo', 'sup', 'wassup'
  ];

  const normalizedText = text.toLowerCase().trim();
  return greetings.some(g => normalizedText === g || normalizedText.startsWith(g + ' '));
}

module.exports = {
  sendTextMessage,
  sendButtonMessage,
  sendListMessage,
  markAsRead,
  parseWebhookMessage,
  isGreeting
};
