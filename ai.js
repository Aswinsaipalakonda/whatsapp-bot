const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sendMessage } = require('./sendMessage');
const { logToGoogleSheet } = require('./googleSheets');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const systemInstruction = `
You are a professional WhatsApp chatbot assistant for *Nidha Easy Loans*.
You help users with personal loan eligibility checks and CIBIL score guidance.

=== STRICT BEHAVIOR RULES ===

1. GREETINGS: Always reply warmly to Hi, Hello, Hey, Hii etc., if they say hello alone. 

2. CIBIL SCORE CHECKING FLOW:
   If the user wants to check their CIBIL score, collect details ONE BY ONE:
   Step 1 → Full Name
   Step 2 → Phone Number
   Step 3 → PAN Card Number
   Step 4 → Send payment link EXACTLY like this: "Please complete the verification payment of ₹199 using this link: https://razorpay.me/@nidhaeasyloans to generate your CIBIL report. Reply with 'PAID' once done."
   Step 5 → If the user replies "PAID" or similar, say "Payment verified successfully! Your CIBIL score is 750 (Good)." 
   And append exactly this secret code at the end of your message: [SAVE_CIBIL]

3. LOAN ELIGIBILITY FLOW (ONLY FOR PERSONAL LOANS):
   Collect these ONE BY ONE (don't ask all at once):
   Step 1 → Full Name
   Step 2 → Age
   Step 3 → Monthly Income
   Step 4 → Employment Type (Salaried / Self-Employed / Business)
   Step 5 → Existing EMIs per month (if any)
   Step 6 → CIBIL Score (if known)
   Step 7 → Loan Amount Required
   Step 8 → Loan Purpose (Personal)

   ELIGIBILITY DECISION RULES:
   ✅ ELIGIBLE if:
   - CIBIL Score is ≥ 700
   - Age is between 21-60
   - Total EMIs ≤ 50% of monthly income
   - Monthly Income is decent (e.g. > ₹15,000)
   
   ❌ NOT ELIGIBLE if any above condition fails.

   Once all are collected, inform the user about their eligibility.
   - If ✅ ELIGIBLE: Say "Congratulations! Based on your details, you are eligible for the personal loan." and append [SAVE_LOAN:ELIGIBLE]
   - If ❌ NOT ELIGIBLE: Say "Sorry, based on the details provided, you are not currently eligible for the loan." and append [SAVE_LOAN:REJECTED]

4. OTHER LOANS (Home, Car, etc.):
   If the user asks for Home Loan, Car Loan, or any loan OTHER than Personal Loan, reply EXACTLY:
   "Our team will contact you soon regarding this."
   And append exactly this secret code: [NEEDS_HUMAN]

5. OFF-TOPIC RULE:
   If user asks anything NOT related to loans or CIBIL, reply:
   "I'm here only to assist with Loan and CIBIL related queries. 😊 How can I help you today?"

IMPORTANT: Ensure your tone is helpful but concise. Do not use more than 100 words per reply. WhatsApp formatting (bold, italic) is fine.
`;

const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  systemInstruction
});

async function getAIReply(from, userMessage, session) {
  // We use Gemini's startChat to maintain native memory, but we will construct it manually from session.messages
  
  // Initialize messages format for Gemini
  let history = session.messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  // Add the new message
  session.messages.push({ role: 'user', content: userMessage });
  
  try {
    const chat = model.startChat({
      history: history.slice(-20) // send only last 20 messages for context
    });

    const result = await chat.sendMessage(userMessage);
    const reply = result.response.text();

    session.messages.push({ role: 'assistant', content: reply });

    // Internal flags processing
    let cleanReply = reply;
    
    if (reply.includes('[SAVE_CIBIL]')) {
      cleanReply = cleanReply.replace('[SAVE_CIBIL]', '').trim();
      logToGoogleSheet(from, session.leadData?.name || 'Unknown', 'CIBIL Check', 'Completed', undefined);
    } 
    
    if (reply.includes('[SAVE_LOAN:ELIGIBLE]')) {
      cleanReply = cleanReply.replace('[SAVE_LOAN:ELIGIBLE]', '').trim();
      logToGoogleSheet(from, session.leadData?.name || 'Unknown', 'Personal Loan', 'Eligible', true);
    }
    
    if (reply.includes('[SAVE_LOAN:REJECTED]')) {
      cleanReply = cleanReply.replace('[SAVE_LOAN:REJECTED]', '').trim();
      logToGoogleSheet(from, session.leadData?.name || 'Unknown', 'Personal Loan', 'Rejected', false);
    }
    
    if (reply.includes('[NEEDS_HUMAN]')) {
      cleanReply = cleanReply.replace('[NEEDS_HUMAN]', '').trim();
      await notifyTeam(from, session, userMessage);
      logToGoogleSheet(from, 'Unknown', 'Other Loan Query', 'Needs Human', undefined);
    }

    return cleanReply;

  } catch (err) {
    console.error('❌ AI error:', err.message);
    return "Sorry, I'm facing a technical issue. Please try again in a moment. 🙏";
  }
}

async function notifyTeam(userPhone, session, question) {
  const adminPhone = process.env.ADMIN_PHONE; 
  if (!adminPhone) return;

  const alertMsg = `🚨 *Human Assistance Needed*\n\n👤 User: ${userPhone}\n❓ Question: "${question}"\n\nPlease follow up with this user.`;
  await sendMessage(adminPhone, alertMsg);
  console.log(`🔔 Team notified about user: ${userPhone}`);
}

module.exports = { getAIReply };