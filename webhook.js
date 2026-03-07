const { getAIReply } = require('./ai');
const { sendMessage, sendWelcomeButtons } = require('./sendMessage');
const { getSession } = require('./sessions');

const processedMessages = new Set();

// Detect greetings
function isGreeting(text) {
  const greetings = ['hi', 'hii', 'hiii', 'hello', 'hey', 'helo', 'hye',
                     'good morning', 'good evening', 'good afternoon',
                     'start', 'namaste', 'hai', 'sup', 'yo'];
  return greetings.includes(text.trim().toLowerCase());
}

exports.verify = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

exports.receive = async (req, res) => {
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (!message) return;

    // Deduplicate
    const msgId = message.id;
    if (processedMessages.has(msgId)) return;
    processedMessages.add(msgId);
    setTimeout(() => processedMessages.delete(msgId), 60000);

    const from = message.from;
    let userText = '';
    let isButtonReply = false;

    // Handle text messages
    if (message.type === 'text') {
      userText = message.text.body;

    // Handle button clicks ← THIS is what happens when user taps a button
    } else if (message.type === 'interactive') {
      userText = message.interactive?.button_reply?.title ||
                 message.interactive?.list_reply?.title || '';
      isButtonReply = true;

    } else {
      await sendMessage(from, "Please send a text message. 😊");
      return;
    }

    console.log(`📩 From: ${from} | Message: ${userText}`);

    const session = getSession(from);

    // ✅ If greeting → send welcome buttons (not AI)
    if (isGreeting(userText)) {
      session.messages = []; // reset session on new greeting
      session.step = 'start';
      await sendWelcomeButtons(from);
      return;
    }

    // ✅ If user clicked "Loan Assistance" button
    if (userText === 'Loan Assistance') {
      session.step = 'loan';
      session.messages.push({ role: 'user', content: 'I want loan assistance' });
      const reply = await getAIReply(from, 'User selected Loan Assistance. Ask for their full name to start.', session);
      await sendMessage(from, reply);
      return;
    }

    // ✅ If user clicked "CIBIL Services" button
    if (userText === 'CIBIL Services') {
      session.step = 'cibil';
      session.messages.push({ role: 'user', content: 'I want CIBIL services' });
      const reply = await getAIReply(from, 'User selected CIBIL Services. Ask what CIBIL help they need.', session);
      await sendMessage(from, reply);
      return;
    }

    // All other messages → AI handles
    const reply = await getAIReply(from, userText, session);
    await sendMessage(from, reply);

  } catch (err) {
    console.error('❌ Webhook error:', err.message);
  }
};