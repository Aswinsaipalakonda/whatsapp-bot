const Anthropic = require('@anthropic-ai/sdk');
const { getKnowledge } = require('./pdfLoader');
const { sendMessage } = require('./sendMessage');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getAIReply(from, userMessage, session) {
  const knowledge = getKnowledge();

  const systemPrompt = `
You are a professional WhatsApp chatbot assistant for *Nidha Easy Loans*.
You help users with loan eligibility checks and CIBIL score guidance.

=== STRICT BEHAVIOR RULES ===

1. GREETINGS: Always reply warmly to Hi, Hello, Hey, Hii etc.

2. LOAN ELIGIBILITY FLOW: Collect these ONE BY ONE (don't ask all at once):
   Step 1 → Full Name
   Step 2 → Age
   Step 3 → Monthly Income
   Step 4 → Employment Type (Salaried / Self-Employed / Business)
   Step 5 → Existing EMIs per month (if any)
   Step 6 → CIBIL Score (if known)
   Step 7 → Loan Amount Required
   Step 8 → Loan Purpose

3. ELIGIBILITY DECISION RULES:
   ✅ ELIGIBLE if:
   - CIBIL Score ≥ 700
   - Age between 21-60
   - Total EMIs ≤ 50% of monthly income
   - Income meets minimum requirement
   
   ❌ NOT ELIGIBLE if any above condition fails
   → Then say: "Our team will contact you to discuss further options. 🙏"

4. UNKNOWN QUESTIONS RULE (VERY IMPORTANT):
   If the user asks something that is NOT covered in the knowledge base below,
   DO NOT make up an answer.
   Instead reply EXACTLY:
   "That's a great question! Our team will contact you shortly to assist with this. 🙏
   Is there anything else I can help you with?"
   Then internally flag: NEEDS_HUMAN=true

5. OFF-TOPIC RULE:
   If user asks anything NOT related to loans or CIBIL (eg: weather, sports, news),
   Reply: "I'm here only to assist with Loan and CIBIL related queries. 😊
   How can I help you with your loan today?"

6. KEEP MESSAGES SHORT — This is WhatsApp, not email.
   Max 150 words per reply. Use emojis sparingly.

=== KNOWLEDGE BASE ===
${knowledge}
=== END KNOWLEDGE BASE ===
`;

  session.messages.push({ role: 'user', content: userMessage });

  const recentMessages = session.messages.slice(-20);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: recentMessages
    });

    const reply = response.content[0].text;
    session.messages.push({ role: 'assistant', content: reply });

    // ✅ Detect if AI flagged human needed
    if (reply.includes('NEEDS_HUMAN=true') || reply.includes('Our team will contact you')) {
      await notifyTeam(from, session, userMessage);
    }

    // Clean any internal flags before sending to user
    const cleanReply = reply.replace('NEEDS_HUMAN=true', '').trim();
    return cleanReply;

  } catch (err) {
    console.error('❌ AI error:', err.message);
    return "Sorry, I'm facing a technical issue. Please try again in a moment. 🙏";
  }
}

// ✅ Notify your team when human help needed
async function notifyTeam(userPhone, session, question) {
  const adminPhone = process.env.ADMIN_PHONE; // your WhatsApp number with country code
  if (!adminPhone) return;

  const leadInfo = session.leadData || {};
  const alertMsg = `🚨 *Human Assistance Needed*

👤 User: ${userPhone}
❓ Question: "${question}"
📋 Lead Info: ${JSON.stringify(leadInfo, null, 2)}

Please follow up with this user.`;

  await sendMessage(adminPhone, alertMsg);
  console.log(`🔔 Team notified about user: ${userPhone}`);
}

module.exports = { getAIReply };