# 🤖 Nidha Easy Loans - WhatsApp Bot

![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![Google Gemini](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Google Sheets](https://img.shields.io/badge/Google_Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)

A smart, AI-powered WhatsApp chatbot built for **Nidha Easy Loans**. This bot automates customer inquiries, evaluates loan eligibility, provides CIBIL score checks with payment simulations, and logs all chats into Google Sheets color-coded by eligibility. It uses natural language processing powered by **Google's Gemini 2.5 Flash**.

---

## ✨ Features

- **💬 WhatsApp Cloud API Integration**: Seamless connectivity to receive and send messages directly on WhatsApp.
- **🧠 Gemini AI Powered**: Dynamically talks to users, enforcing strict conversational paths for CIBIL & Personal Loans.
- **📊 Google Sheets Logging**: Logs every inquiry dynamically (Eligible: Green, Rejected: Red).
- **💸 CIBIL Payment Simulation**: Serves Razorpay links dynamically when a user asks for a CIBIL score.
- **🔘 Interactive Buttons**: Greets users automatically using WhatsApp's interactive buttons for a beautiful UI experience.
- **🛡️ Lead & Eligibility Qualification**: Evaluates CIBIL, age, and EMI limits natively using Gemini structured extraction.
- **⏰ Inactive User Nudge**: CRON job runs daily to message dormant users and push them back into the sales funnel.
- **🚨 Human Handoff / Admin Notification**: Modally triggers human assistance for Home Loans/Car Loans & Edge Cases alerting the `ADMIN_PHONE`.

---

## 🛠️ Tech Stack

- **Node.js**: JavaScript runtime environment.
- **Express.js**: Web framework used to expose the `/webhook` endpoint.
- **@google/generative-ai**: Integrates Google Gemini Model.
- **googleapis**: Edits Google Sheets dynamically.
- **node-cron**: Background job scheduler.
- **Axios**: HTTP client for communicating with the Facebook/WhatsApp Graph API.

---

## 📂 Project Structure

```text
📁 whatsapp-bot
├── 📄 .env                 # Environment variables (secrets/keys)
├── 📄 ai.js                # Core AI logic (Gemini system prompts & processing)
├── 📄 index.js             # Express server setup, webhook routing & Cron Job
├── 📄 googleSheets.js      # Google Sheets append & format logic
├── 📄 sendMessage.js       # Utility functions to send texts & buttons to Graph API
├── 📄 sessions.js          # In-memory session manager with inactivity tracking
├── 📄 webhook.js           # Handles incoming WhatsApp webhooks & routing
├── 📄 service-account.json # (NOT INCLUDED) Google Sheets Auth file
└── 📄 package.json         # Project dependencies
```

---

## 🚀 Setup & Installation

### 1. Prerequisites

- [Node.js](https://nodejs.org/) installed.
- A **Meta Developer Account** with a WhatsApp Cloud API setup.
- A **Google AI Studio** Gemini API Key.
- A **Google Cloud Console** Service Account with Google Sheets API access.

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create `.env`:

```env
PORT=3000
VERIFY_TOKEN=your_custom_webhook_verify_token
PHONE_NUMBER_ID=your_whatsapp_phone_number_id
ACCESS_TOKEN=your_facebook_graph_api_access_token
GEMINI_API_KEY=your_gemini_api_key
SPREADSHEET_ID=your_google_sheet_id
ADMIN_PHONE=919876543210
```

Also, upload your `service-account.json` downloaded from Google Cloud to the root directory for your Sheets integration.

### 4. Start the Application

```bash
node index.js
```

---

## 🔄 Deployment & Webhooks (ngrok)

To test the bot locally with WhatsApp:
1. Run `node index.js`.
2. Map your local port 3000 to the web using `ngrok http 3000`.
3. In your Meta Developer Dashboard, set the Webhook Callback URL to your ngrok URL `https://xxxx.ngrok-free.app/webhook`.
4. Define your `VERIFY_TOKEN`.
5. Send a message to your assigned Meta test number!
