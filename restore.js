const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'workflows', 'main.json');
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

data.nodes = data.nodes.filter(n => !n.name.includes("WhatsApp Trigger") && n.id !== 'wa_trigger_1');

// Re-add Webhooks
data.nodes.push(
    {
      "id": "n1",
      "name": "Webhook GET Verify",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [240, 160],
      "parameters": {
        "httpMethod": "GET",
        "path": "whatsapp",
        "responseMode": "responseNode",
        "options": {}
      },
      "webhookId": "nidha-whatsapp"
    },
    {
      "id": "n2",
      "name": "Code Verify Challenge",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [480, 160],
      "parameters": {
        "jsCode": "const q = .first().json.query || {};\n\n// Hardcode your verify token directly here\nconst VERIFY_TOKEN = 'nidha_verify_2024';\n\nif (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === VERIFY_TOKEN) {\n  return [{ json: { challenge: q['hub.challenge'], status: 'ok' } }];\n}\n\nreturn [{ json: { challenge: 'FORBIDDEN', status: 'fail' } }];"
      }
    },
    {
      "id": "n3",
      "name": "Respond Webhook Challenge",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [720, 160],
      "parameters": {
        "respondWith": "text",
        "responseBody": "={{ \.challenge }}",
        "options": {
          "responseCode": 200
        }
      }
    },
    {
      "id": "n4",
      "name": "Webhook POST Messages",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [240, 400],
      "parameters": {
        "httpMethod": "POST",
        "path": "whatsapp",
        "responseMode": "onReceived",
        "options": {
          "rawBody": false
        }
      },
      "webhookId": "nidha-whatsapp"
    }
);

delete data.connections["WhatsApp Trigger"];

data.connections["Webhook GET Verify"] = {
  "main": [
    [ { "node": "Code Verify Challenge", "type": "main", "index": 0 } ]
  ]
};
data.connections["Code Verify Challenge"] = {
  "main": [
    [ { "node": "Respond Webhook Challenge", "type": "main", "index": 0 } ]
  ]
};
data.connections["Webhook POST Messages"] = {
  "main": [
    [ { "node": "Code Parse Message", "type": "main", "index": 0 } ]
  ]
};

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Restored to standard Webhook approach.');
