# WhatsApp Loan Bot

A WhatsApp chatbot for Personal Loans and CIBIL Score checking, built with Node.js and deployable on Vercel.

## Features

- **Greeting Handler**: Responds to hi, hello, hey, etc.
- **CIBIL Score Check**: Collects user details and sends payment link
- **Personal Loan Eligibility**: Checks loan eligibility based on income and EMIs
- **Other Loans**: Notifies team for home, car, education, and business loans
- **Google Sheets Integration**: Stores all user data and conversation logs
- **Daily Follow-up**: Automatically follows up with inactive users
- **AI-Powered Intent Classification**: Uses Gemini AI to understand user intent

## Setup

### 1. Prerequisites

- Node.js 18+
- Vercel CLI (`npm i -g vercel`)
- Meta Business Account with WhatsApp API access
- Google Cloud Service Account
- Razorpay Account
- Gemini API Key

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### 3. Google Sheets Setup

1. Create a new Google Sheet
2. Create a service account in Google Cloud Console
3. Share the sheet with the service account email
4. The bot will automatically create headers on first run

**Sheet Structure:**
| Phone | Name | DOB | PAN | Stage | CIBIL Score | Employment | Income | Loan Amount | Existing EMI | Eligibility | Last Message Time | Color | Payment ID |

### 4. Meta WhatsApp Setup

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a Business App
3. Add WhatsApp product
4. Configure webhook URL: `https://your-app.vercel.app/api/webhook`
5. Set verify token: `nidha_verify_token_2024`
6. Subscribe to `messages` webhook field

### 5. Razorpay Setup

1. Get your API keys from Razorpay Dashboard
2. Configure webhook URL: `https://your-app.vercel.app/api/payment-callback`
3. Enable `payment_link.paid` event

### 6. Deploy to Vercel

```bash
npm install
vercel --prod
```

### 7. Configure Environment in Vercel

Go to Vercel Dashboard → Project → Settings → Environment Variables and add all variables from `.env.example`.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhook` | GET | Meta webhook verification |
| `/api/webhook` | POST | Receive WhatsApp messages |
| `/api/payment-callback` | GET | Razorpay payment redirect |
| `/api/payment-callback` | POST | Razorpay webhook |
| `/api/cron/follow-up` | GET | Daily follow-up job |

## Conversation Flow

```
User: "Hi"
Bot: Welcome message + service buttons

User: "Check CIBIL Score"
Bot: Ask name → Ask DOB → Ask PAN → Send payment link

User: "Personal Loan"
Bot: Ask employment → Ask income → Ask loan amount → Ask EMIs → Show eligibility

User: "Home Loan"
Bot: "Our team will contact you soon"
```

## Eligibility Criteria

A user is marked **GREEN** (eligible) if:
- Monthly income ≥ ₹25,000
- Total EMIs ≤ 50% of income
- CIBIL score ≥ 650 (if available)
- Loan amount ≤ 36 months of income

Otherwise marked **RED** (not eligible).

## License

MIT
