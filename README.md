# 🤖 Nidha Easy Loans - WhatsApp Bot

![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![Anthropic Claude](https://img.shields.io/badge/Claude_AI-D97757?style=for-the-badge&logo=anthropic&logoColor=white)

A smart, AI-powered WhatsApp chatbot built for **Nidha Easy Loans**. This bot automates customer inquiries, evaluates loan eligibility, provides CIBIL score guidance, and uses natural language processing powered by **Anthropic's Claude 3.5 Sonnet** to answer questions directly from a custom company knowledge base (PDF).

---

## ✨ Features

- **💬 WhatsApp Cloud API Integration**: Seamless connectivity to receive and send messages directly on WhatsApp.
- **🧠 Claude AI Powered**: Dynamically talks to users, enforcing strict behavior rules defined in its system prompt.
- **📚 Knowledge Base Injection**: Reads a company PDF (`data/loan_knowledge.pdf`) during startup and uses it to answer customer questions accurately.
- **🔘 Interactive Buttons**: Greets users automatically using WhatsApp's interactive buttons for a modern UI experience.
- **🛡️ Lead & Eligibility Qualification**: Steps through questions to check if a user is eligible for a loan based on CIBIL, age, and income.
- **🚨 Human Handoff / Admin Notification**: Automatically flags conversations and notifies a designated administrator via WhatsApp when it encounters questions outside its knowledge base or if user conditions aren't met.

---

## 🛠️ Tech Stack

- **Node.js**: JavaScript runtime environment.
- **Express.js**: Web framework used to expose the `/webhook` endpoint.
- **Axios**: HTTP client for communicating with the Facebook/WhatsApp Graph API.
- **@anthropic-ai/sdk**: Integrates Claude Model to act as the primary brain of the assistant.
- **pdf-parse**: Extracts raw text from company PDFs to feed into Claude.

---

## 📂 Project Structure

```text
📁 whatsapp-bot
├── 📄 .env                 # Environment variables (secrets/keys)
├── 📄 ai.js                # Core AI logic (Anthropic Claude system prompt & handler)
├── 📄 index.js             # Express server setup and webhook routing
├── 📄 pdfLoader.js         # Reads and parses the PDF knowledge base to memory
├── 📄 sendMessage.js       # Utility functions to send texts & buttons to Graph API
├── 📄 sessions.js          # In-memory session manager for user conversation history
├── 📄 webhook.js           # Handles incoming WhatsApp webhooks & routing logic
├── 📁 data
│   └── 📄 loan_knowledge.pdf # The company knowledge document (Add this file!)
└── 📄 package.json         # Project dependencies
```

---

## 🚀 Setup & Installation

### 1. Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine.
- A **Meta Developer Account** with a WhatsApp Cloud API app setup.
- An **Anthropic AI API Key**.

### 2. Install Dependencies

Navigate to the project directory and install the required npm packages:

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root of the project and add the following keys:

```env
PORT=3000
VERIFY_TOKEN=your_custom_webhook_verify_token
PHONE_NUMBER_ID=your_whatsapp_phone_number_id
ACCESS_TOKEN=your_facebook_graph_api_access_token
ANTHROPIC_API_KEY=your_anthropic_claude_api_key
ADMIN_PHONE=your_whatsapp_number_with_country_code # e.g., 919876543210
```

### 4. Provide Company Knowledge

Ensure you create a `data` folder in the root directory and place your company policy/knowledge document there:

```bash
./data/loan_knowledge.pdf
```

### 5. Start the Application

```bash
node index.js
```

You should see:

```text
🚀 Server running on port 3000
✅ PDF loaded successfully. Characters: XXXXX
```

---

## 🔄 Application Workflow

Here is how the bot handles inquiries from customers in real-time:

### Step 1: Webhook Trigger

1. User sends a message on WhatsApp.
2. Meta/Facebook pushes an event to your `/webhook` endpoint.
3. `webhook.js` deducts duplicates to prevent processing the same message twice.

### Step 2: Greeting & Menu

1. If the user sends a greeting (_Hi, Hello, Hey_), the bot replies via `sendMessage.js`.
2. It sends an interactive message containing two buttons: **🏦 Loan Assistance** and **📊 CIBIL Services**.
3. _AI is purposely bypassed for standard greetings to save tokens and offer a quick UX._

### Step 3: Button Interaction & State Update

1. User taps a button.
2. The webhook intercepts the interactive reply.
3. The bot sets the internal state and secretly auto-generates a user intent for the AI (e.g. _"I want loan assistance"_).

### Step 4: AI Assessment (`ai.js`)

1. Claude AI reads the message contextualized by its **System Prompt** and the **Last 20 messages**.
2. It follows specific rules to sequentially ask for: **Name** ➔ **Age** ➔ **Income** ➔ **Employment** ➔ **EMIs** ➔ **CIBIL** ➔ **Amount** ➔ **Purpose**.
3. Evaluates eligibility: Must have **CIBIL > 700**, **Age 21-60**, and **EMIs < 50% income**.

### Step 5: Admin Handoff trigger

1. If the user asks something completely unknown or off-topic, or if their eligibility fails, Claude triggers a fallback phrase.
2. The code detects `NEEDS_HUMAN=true` or `"Our team will contact you"`.
3. An alert is instantly fired to the `ADMIN_PHONE` via WhatsApp detailing the user's phone number and the problematic question, allowing a real human to take over the lead.

---

## 💡 Important Modifications Note

- **Chunking Limit**: The `sendMessage` util automatically splits AI responses into 1000-character chunks to comply with WhatsApp API text limits.
- **Memory**: The app currently uses an **in-memory session object** (`sessions.js`). This resets if the node server crashes or restarts. For a production environment, consider connecting this to a database like MongoDB, PostgreSQL, or Redis.
