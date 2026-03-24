/**
 * Gemini AI Integration
 * Handles intent classification and response generation
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

/**
 * Initialize Gemini AI
 */
function initGemini() {
  if (model) return model;

  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  return model;
}

/**
 * Classify user intent
 */
async function classifyIntent(userMessage, currentStage = '') {
  const aiModel = initGemini();

  const prompt = `You are an intent classifier for a loan and CIBIL score checking WhatsApp bot.

Current conversation stage: ${currentStage || 'NEW'}

User message: "${userMessage}"

Classify the user's intent into ONE of these categories:
- GREETING: User is saying hello, hi, hey, good morning, etc.
- CIBIL_SCORE: User wants to check their CIBIL/credit score
- PERSONAL_LOAN: User wants information about personal loan or check eligibility
- HOME_LOAN: User asking about home loan, housing loan, mortgage
- CAR_LOAN: User asking about car loan, vehicle loan, auto loan
- EDUCATION_LOAN: User asking about education loan, student loan
- BUSINESS_LOAN: User asking about business loan
- OTHER_LOAN: Any other type of loan not mentioned above
- CONTINUE_FLOW: User is providing information (name, date, number, yes, no, etc.) to continue current flow
- PAYMENT_ISSUE: User mentions payment problem, retry, new link
- UNKNOWN: Cannot determine intent

Also rate the confidence (HIGH, MEDIUM, LOW).

Respond in this exact JSON format only, no other text:
{"intent": "INTENT_NAME", "confidence": "HIGH/MEDIUM/LOW"}`;

  try {
    const result = await aiModel.generateContent(prompt);
    const response = result.response.text();

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { intent: 'UNKNOWN', confidence: 'LOW' };
  } catch (error) {
    console.error('AI classification error:', error);
    return { intent: 'UNKNOWN', confidence: 'LOW' };
  }
}

/**
 * Generate greeting response
 */
async function generateGreetingResponse(userName) {
  const aiModel = initGemini();

  const prompt = `Generate a warm, friendly WhatsApp greeting message for a user named "${userName}" who just contacted a loan and CIBIL score checking service called "Nidha Easy Loans".

Keep it:
- Short (2-3 lines max)
- Professional but friendly
- Mention they can check CIBIL score or apply for personal loan
- Use 1-2 relevant emojis

Just output the message, no quotes or extra formatting.`;

  try {
    const result = await aiModel.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('AI greeting error:', error);
    return `Hi ${userName}! Welcome to Nidha Easy Loans. I can help you check your CIBIL score or explore personal loan options. How can I assist you today?`;
  }
}

/**
 * Check loan eligibility based on user data
 */
function checkLoanEligibility(userData) {
  const income = parseInt(userData.income) || 0;
  const loanAmount = parseInt(userData.loanAmount) || 0;
  const existingEmi = parseInt(userData.existingEmi) || 0;
  const cibilScore = parseInt(userData.cibilScore) || 0;

  const reasons = [];
  let isEligible = true;

  // Rule 1: Minimum income requirement
  if (income < 25000) {
    isEligible = false;
    reasons.push('Monthly income should be at least Rs. 25,000');
  }

  // Rule 2: EMI to income ratio (FOIR - Fixed Obligations to Income Ratio)
  const maxEmiAllowed = income * 0.5; // 50% of income
  const proposedEmi = loanAmount / 60; // Rough EMI for 5 years at ~12%
  const totalEmi = existingEmi + proposedEmi;

  if (totalEmi > maxEmiAllowed) {
    isEligible = false;
    reasons.push('Total EMI obligations exceed 50% of income');
  }

  // Rule 3: CIBIL score (if available)
  if (cibilScore > 0 && cibilScore < 650) {
    isEligible = false;
    reasons.push('CIBIL score should be above 650');
  }

  // Rule 4: Loan amount to income ratio
  const maxLoanAmount = income * 36; // 3 years of income
  if (loanAmount > maxLoanAmount) {
    isEligible = false;
    reasons.push(`Loan amount exceeds eligibility limit of Rs. ${maxLoanAmount.toLocaleString()}`);
  }

  return {
    isEligible,
    reasons,
    maxEligibleAmount: Math.min(loanAmount, maxLoanAmount),
    suggestedEmi: Math.round((loanAmount * 1.12) / 60) // Rough EMI calculation
  };
}

/**
 * Validate PAN number format
 */
function validatePAN(pan) {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.toUpperCase());
}

/**
 * Validate date of birth
 */
function validateDOB(dob) {
  // Accept formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const dateRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$|^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/;

  if (!dateRegex.test(dob)) {
    return { valid: false, formatted: null };
  }

  // Try to parse the date
  let day, month, year;
  const match = dob.match(dateRegex);

  if (match[4]) {
    // YYYY-MM-DD format
    year = parseInt(match[4]);
    month = parseInt(match[5]);
    day = parseInt(match[6]);
  } else {
    // DD/MM/YYYY format
    day = parseInt(match[1]);
    month = parseInt(match[2]);
    year = parseInt(match[3]);
  }

  // Validate ranges
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1940 || year > 2010) {
    return { valid: false, formatted: null };
  }

  const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { valid: true, formatted };
}

/**
 * Validate phone number (Indian)
 */
function validatePhone(phone) {
  // Remove country code and spaces
  const cleaned = phone.replace(/[\s\-\+]/g, '');
  const phoneRegex = /^(91)?[6-9]\d{9}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Extract number from text
 */
function extractNumber(text) {
  const matches = text.match(/\d+/g);
  if (matches) {
    return matches.join('');
  }
  return null;
}

module.exports = {
  initGemini,
  classifyIntent,
  generateGreetingResponse,
  checkLoanEligibility,
  validatePAN,
  validateDOB,
  validatePhone,
  extractNumber
};
