const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'workflows', 'main.json');
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

const nodesToRemove = ["Webhook GET Verify", "Code Verify Challenge", "Respond Webhook Challenge", "Webhook POST Messages"];
data.nodes = data.nodes.filter(n => !nodesToRemove.includes(n.name));

data.nodes.push({
  "id": "wa_trigger_1",
  "name": "WhatsApp Trigger",
  "type": "n8n-nodes-base.whatsappTrigger",
  "typeVersion": 1,
  "position": [240, 400],
  "parameters": {
    "event": "messageReceived"
  },
  "credentials": {}
});

const parseNode = data.nodes.find(n => n.name === 'Code Parse Message');
if (parseNode) {
  parseNode.parameters.jsCode = `let message;
const json = $input.first().json;

if (json.body?.entry || json.entry) {
    const body = json.body || json;
    message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
} else if (json.message) {
    message = json.message;
} else {
    message = json;
}

if (!message || !message.from) {
    return [{ json: { valid: false, reason: 'no_message' } }];
}

const msgId = message.id || Date.now().toString();
const staticData = $getWorkflowStaticData('global');
if (!staticData.processedIds) staticData.processedIds = {};
if (staticData.processedIds[msgId]) {
    return [{ json: { valid: false, reason: 'duplicate' } }];
}
staticData.processedIds[msgId] = Date.now();

const now = Date.now();
for (const id in staticData.processedIds) {
    if (now - staticData.processedIds[id] > 600000) {
        delete staticData.processedIds[id];
    }
}

const from = message.from;
let text = '';
let msgType = message.type || 'text';

if (msgType === 'text') {
    text = message.text?.body?.trim() || message.text || '';
} else if (msgType === 'interactive' || msgType === 'button') {
    const btn = message.interactive?.button_reply || message.button;
    const list = message.interactive?.list_reply;
    text = btn?.title || list?.title || btn?.id || list?.id || text || '';
    msgType = 'button';
} else {
    return [{ json: { valid: true, from, text: '', msgType: 'unsupported', isGreeting: false } }];
}

const greetings = [
    'hi','hii','hiii','hiiii','hello','hey','helo','hye','heya',
    'good morning','good evening','good afternoon','goodmorning',
    'start','namaste','hai','sup','yo','hy','hlw','howdy',
    'greetings','menu','help','hola','salaam','namaskar'
];
const isGreeting = greetings.includes(text.toLowerCase());

return [{ json: { valid: true, from, text, msgType, isGreeting } }];`;
}

delete data.connections["Webhook GET Verify"];
delete data.connections["Code Verify Challenge"];
delete data.connections["Webhook POST Messages"];

data.connections["WhatsApp Trigger"] = {
  "main": [
    [
      {
        "node": "Code Parse Message",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log("main.json successfully updated with WhatsApp Trigger!");
