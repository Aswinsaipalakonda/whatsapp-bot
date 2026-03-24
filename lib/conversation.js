/**
 * Conversation State Machine
 * Manages the flow of conversation based on user stage
 */

const { sendTextMessage, sendButtonMessage, isGreeting } = require('./whatsapp');
const { getUser, saveUser, logMessage, updateEligibilityColor } = require('./sheets');
const { classifyIntent, generateGreetingResponse, checkLoanEligibility, validatePAN, validateDOB, extractNumber } = require('./ai');
const { createPaymentLink } = require('./razorpay');

/**
 * Conversation stages
 */
const STAGES = {
  NEW: 'NEW',
  AWAITING_SERVICE_CHOICE: 'AWAITING_SERVICE_CHOICE',

  // CIBIL Flow
  COLLECT_CIBIL_NAME: 'COLLECT_CIBIL_NAME',
  COLLECT_CIBIL_DOB: 'COLLECT_CIBIL_DOB',
  COLLECT_CIBIL_PAN: 'COLLECT_CIBIL_PAN',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  CIBIL_DONE: 'CIBIL_DONE',

  // Loan Flow
  COLLECT_LOAN_EMPLOYMENT: 'COLLECT_LOAN_EMPLOYMENT',
  COLLECT_LOAN_INCOME: 'COLLECT_LOAN_INCOME',
  COLLECT_LOAN_AMOUNT: 'COLLECT_LOAN_AMOUNT',
  COLLECT_LOAN_EMI: 'COLLECT_LOAN_EMI',
  LOAN_DONE: 'LOAN_DONE',

  // Other
  CONTACTED_TEAM: 'CONTACTED_TEAM',
  COMPLETED: 'COMPLETED'
};

/**
 * Main conversation handler
 */
async function handleConversation(phone, name, text, messageType) {
  // Log incoming message
  await logMessage(phone, 'IN', text);

  // Get or create user
  let user = await getUser(phone);

  if (!user) {
    user = {
      phone,
      name: name,
      stage: STAGES.NEW
    };
    await saveUser(phone, user);
  }

  // Update last message time
  await saveUser(phone, { lastMessageTime: new Date().toISOString() });

  // Handle based on current stage and intent
  let response;

  // Check if it's a greeting - always restart conversation
  if (isGreeting(text)) {
    response = await handleGreeting(phone, name);
  } else {
    // Handle based on current stage
    switch (user.stage) {
      case STAGES.NEW:
      case STAGES.AWAITING_SERVICE_CHOICE:
        response = await handleServiceChoice(phone, name, text, user);
        break;

      // CIBIL Flow
      case STAGES.COLLECT_CIBIL_NAME:
        response = await handleCibilName(phone, text, user);
        break;
      case STAGES.COLLECT_CIBIL_DOB:
        response = await handleCibilDOB(phone, text, user);
        break;
      case STAGES.COLLECT_CIBIL_PAN:
        response = await handleCibilPAN(phone, text, user);
        break;
      case STAGES.AWAITING_PAYMENT:
        response = await handleAwaitingPayment(phone, text, user);
        break;

      // Loan Flow
      case STAGES.COLLECT_LOAN_EMPLOYMENT:
        response = await handleLoanEmployment(phone, text, user);
        break;
      case STAGES.COLLECT_LOAN_INCOME:
        response = await handleLoanIncome(phone, text, user);
        break;
      case STAGES.COLLECT_LOAN_AMOUNT:
        response = await handleLoanAmount(phone, text, user);
        break;
      case STAGES.COLLECT_LOAN_EMI:
        response = await handleLoanEMI(phone, text, user);
        break;

      // Completed stages
      case STAGES.CIBIL_DONE:
      case STAGES.LOAN_DONE:
      case STAGES.CONTACTED_TEAM:
      case STAGES.COMPLETED:
        response = await handleCompletedUser(phone, name, text, user);
        break;

      default:
        response = await handleGreeting(phone, name);
    }
  }

  // Log outgoing message
  if (response) {
    await logMessage(phone, 'OUT', response);
  }

  return response;
}

/**
 * Handle greeting - send welcome message with options
 */
async function handleGreeting(phone, name) {
  await saveUser(phone, { stage: STAGES.AWAITING_SERVICE_CHOICE, name });

  const greeting = await generateGreetingResponse(name);

  await sendTextMessage(phone, greeting);

  // Send service choice buttons
  await sendButtonMessage(phone,
    'How can I help you today?',
    [
      { id: 'cibil_score', title: 'Check CIBIL Score' },
      { id: 'personal_loan', title: 'Personal Loan' },
      { id: 'other_loans', title: 'Other Loans' }
    ]
  );

  return greeting;
}

/**
 * Handle service choice
 */
async function handleServiceChoice(phone, name, text, user) {
  const normalizedText = text.toLowerCase().trim();

  // Classify intent
  const { intent } = await classifyIntent(text, user.stage);

  if (intent === 'CIBIL_SCORE' || normalizedText.includes('cibil') || normalizedText === 'check cibil score') {
    return await startCibilFlow(phone, name);
  } else if (intent === 'PERSONAL_LOAN' || normalizedText.includes('personal loan') || normalizedText === 'personal loan') {
    return await startLoanFlow(phone, name);
  } else if (intent === 'HOME_LOAN' || intent === 'CAR_LOAN' || intent === 'EDUCATION_LOAN' ||
    intent === 'BUSINESS_LOAN' || intent === 'OTHER_LOAN' ||
    normalizedText.includes('home loan') || normalizedText.includes('car loan') ||
    normalizedText === 'other loans') {
    return await handleOtherLoans(phone, name, text);
  } else {
    // Default to greeting again
    return await handleGreeting(phone, name);
  }
}

/**
 * Start CIBIL check flow
 */
async function startCibilFlow(phone, name) {
  await saveUser(phone, { stage: STAGES.COLLECT_CIBIL_NAME });

  const message = `Great! Let me help you check your CIBIL score.\n\nFirst, please tell me your *full name* as per your PAN card.`;

  await sendTextMessage(phone, message);
  return message;
}

/**
 * Handle CIBIL name collection
 */
async function handleCibilName(phone, text, user) {
  const name = text.trim();

  if (name.length < 3) {
    const message = `Please enter your full name (at least 3 characters).`;
    await sendTextMessage(phone, message);
    return message;
  }

  await saveUser(phone, { name, stage: STAGES.COLLECT_CIBIL_DOB });

  const message = `Thanks ${name}!\n\nNow, please share your *Date of Birth* in DD/MM/YYYY format.\n\nExample: 15/05/1990`;

  await sendTextMessage(phone, message);
  return message;
}

/**
 * Handle CIBIL DOB collection
 */
async function handleCibilDOB(phone, text, user) {
  const dobResult = validateDOB(text.trim());

  if (!dobResult.valid) {
    const message = `Please enter a valid date of birth in DD/MM/YYYY format.\n\nExample: 15/05/1990`;
    await sendTextMessage(phone, message);
    return message;
  }

  await saveUser(phone, { dob: dobResult.formatted, stage: STAGES.COLLECT_CIBIL_PAN });

  const message = `Now, please share your *PAN Card Number*.\n\nFormat: ABCDE1234F (5 letters, 4 digits, 1 letter)`;

  await sendTextMessage(phone, message);
  return message;
}

/**
 * Handle CIBIL PAN collection and send payment link
 */
async function handleCibilPAN(phone, text, user) {
  const pan = text.trim().toUpperCase();

  if (!validatePAN(pan)) {
    const message = `Please enter a valid PAN number.\n\nFormat: ABCDE1234F (5 letters, 4 digits, 1 letter)`;
    await sendTextMessage(phone, message);
    return message;
  }

  await saveUser(phone, { pan, stage: STAGES.AWAITING_PAYMENT });

  // Create payment link
  const price = parseInt(process.env.CIBIL_CHECK_PRICE) || 99;
  const paymentResult = await createPaymentLink(phone, user.name || 'Customer', price);

  let message;
  if (paymentResult.success) {
    await saveUser(phone, { paymentId: paymentResult.paymentLinkId });

    message = ` Your details have been saved!\n\nTo get your CIBIL Score report, please complete the payment of *Rs. ${price}*.\n\n *Payment Link:*\n${paymentResult.shortUrl}\n\n Once payment is confirmed, you'll receive your CIBIL score report instantly.\n\n_Link valid for 24 hours_`;
  } else {
    message = `Your details have been saved!\n\nThere was an issue generating the payment link. Please try again by typing *new link* or contact support.\n\n_Nidha Easy Loans: +91 70368 11812_`;
  }

  await sendTextMessage(phone, message);
  return message;
}

/**
 * Handle awaiting payment stage
 */
async function handleAwaitingPayment(phone, text, user) {
  const normalizedText = text.toLowerCase().trim();

  if (normalizedText.includes('new link') || normalizedText.includes('retry') || normalizedText.includes('payment')) {
    // Generate new payment link
    const price = parseInt(process.env.CIBIL_CHECK_PRICE) || 99;
    const paymentResult = await createPaymentLink(phone, user.name || 'Customer', price);

    let message;
    if (paymentResult.success) {
      await saveUser(phone, { paymentId: paymentResult.paymentLinkId });

      message = `Here's your new payment link:\n\n${paymentResult.shortUrl}\n\nAmount: *Rs. ${price}*\n\n_Link valid for 24 hours_`;
    } else {
      message = `Sorry, there was an issue generating a new payment link. Please contact support: +91 70368 11812`;
    }

    await sendTextMessage(phone, message);
    return message;
  } else {
    const message = `Your payment is pending.\n\nPlease complete the payment to receive your CIBIL score.\n\n Type *new link* if you need a fresh payment link.`;
    await sendTextMessage(phone, message);
    return message;
  }
}

/**
 * Start Personal Loan flow
 */
async function startLoanFlow(phone, name) {
  await saveUser(phone, { stage: STAGES.COLLECT_LOAN_EMPLOYMENT });

  const message = `Great choice! Let me check your Personal Loan eligibility.\n\nFirst, what is your *employment type*?`;

  await sendButtonMessage(phone, message, [
    { id: 'salaried', title: 'Salaried' },
    { id: 'self_employed', title: 'Self Employed' },
    { id: 'business', title: 'Business Owner' }
  ]);

  return message;
}

/**
 * Handle loan employment type
 */
async function handleLoanEmployment(phone, text, user) {
  const employment = text.trim();

  await saveUser(phone, { employment, stage: STAGES.COLLECT_LOAN_INCOME });

  const message = `What is your *monthly income* (in Rs.)?\n\nJust enter the number, e.g., 50000`;

  await sendTextMessage(phone, message);
  return message;
}

/**
 * Handle loan income
 */
async function handleLoanIncome(phone, text, user) {
  const income = extractNumber(text);

  if (!income || parseInt(income) < 5000) {
    const message = `Please enter a valid monthly income amount.\n\nExample: 50000`;
    await sendTextMessage(phone, message);
    return message;
  }

  await saveUser(phone, { income, stage: STAGES.COLLECT_LOAN_AMOUNT });

  const message = `How much *loan amount* do you need (in Rs.)?\n\nExample: 500000`;

  await sendTextMessage(phone, message);
  return message;
}

/**
 * Handle loan amount
 */
async function handleLoanAmount(phone, text, user) {
  const loanAmount = extractNumber(text);

  if (!loanAmount || parseInt(loanAmount) < 10000) {
    const message = `Please enter a valid loan amount (minimum Rs. 10,000).\n\nExample: 500000`;
    await sendTextMessage(phone, message);
    return message;
  }

  await saveUser(phone, { loanAmount, stage: STAGES.COLLECT_LOAN_EMI });

  const message = `Do you have any *existing EMIs*?\n\nIf yes, enter the total monthly EMI amount. If no, just type *0* or *no*.`;

  await sendTextMessage(phone, message);
  return message;
}

/**
 * Handle loan EMI and check eligibility
 */
async function handleLoanEMI(phone, text, user) {
  let existingEmi = '0';
  const normalizedText = text.toLowerCase().trim();

  if (normalizedText === 'no' || normalizedText === 'nil' || normalizedText === 'none') {
    existingEmi = '0';
  } else {
    existingEmi = extractNumber(text) || '0';
  }

  // Get full user data
  const fullUser = await getUser(phone);
  const userData = {
    ...fullUser,
    existingEmi
  };

  await saveUser(phone, { existingEmi, stage: STAGES.LOAN_DONE });

  // Check eligibility
  const eligibility = checkLoanEligibility(userData);

  // Update color in sheet
  await updateEligibilityColor(phone, eligibility.isEligible);

  let message;
  if (eligibility.isEligible) {
    message = ` *Congratulations!*\n\nBased on your profile, you are *eligible* for a Personal Loan!\n\n *Eligibility Summary:*\n Maximum Loan: Rs. ${eligibility.maxEligibleAmount.toLocaleString()}\n Estimated EMI: Rs. ${eligibility.suggestedEmi.toLocaleString()}/month\n\nOur loan expert will contact you within 24 hours to proceed with your application.\n\n_Nidha Easy Loans_`;
  } else {
    message = ` *Thank you for your interest!*\n\nBased on the current assessment, we found some areas that need attention:\n\n${eligibility.reasons.map(r => `${r}`).join('\n')}\n\n*Suggestions:*\n Check and improve your CIBIL score\n Reduce existing EMI obligations\n Consider a lower loan amount\n\nOur team will still review your profile and contact you with options.\n\n_Nidha Easy Loans_`;
  }

  await sendTextMessage(phone, message);

  // Offer CIBIL check if score is missing
  if (!userData.cibilScore) {
    setTimeout(async () => {
      await sendButtonMessage(phone,
        'Would you like to check your CIBIL score? It helps in getting better loan offers.',
        [
          { id: 'cibil_yes', title: 'Check CIBIL Score' },
          { id: 'cibil_no', title: 'No, thanks' }
        ]
      );
    }, 2000);
  }

  return message;
}

/**
 * Handle other loan types
 */
async function handleOtherLoans(phone, name, text) {
  await saveUser(phone, { stage: STAGES.CONTACTED_TEAM });

  // Detect loan type
  let loanType = 'loan';
  const normalizedText = text.toLowerCase();
  if (normalizedText.includes('home')) loanType = 'Home Loan';
  else if (normalizedText.includes('car') || normalizedText.includes('vehicle')) loanType = 'Car Loan';
  else if (normalizedText.includes('education') || normalizedText.includes('student')) loanType = 'Education Loan';
  else if (normalizedText.includes('business')) loanType = 'Business Loan';
  else loanType = 'specialized loan';

  const message = `Thank you for your interest in *${loanType}*!\n\nOur specialized team will contact you soon to discuss your requirements and guide you through the process.\n\n *Contact:* +91 70368 11812\n\nIn the meantime, would you like to:\n Check your CIBIL score\n Explore Personal Loan options\n\n_Nidha Easy Loans_`;

  await sendButtonMessage(phone, message, [
    { id: 'cibil_score', title: 'Check CIBIL Score' },
    { id: 'personal_loan', title: 'Personal Loan' }
  ]);

  return message;
}

/**
 * Handle completed user returning
 */
async function handleCompletedUser(phone, name, text, user) {
  const normalizedText = text.toLowerCase().trim();
  const { intent } = await classifyIntent(text, user.stage);

  // Check if they want to start something new
  if (intent === 'CIBIL_SCORE' || normalizedText.includes('cibil')) {
    if (user.stage === STAGES.CIBIL_DONE && user.cibilScore) {
      const message = `You already have your CIBIL score: *${user.cibilScore}*\n\nWould you like to check again or explore loan options?`;
      await sendButtonMessage(phone, message, [
        { id: 'check_again', title: 'Check Again' },
        { id: 'personal_loan', title: 'Personal Loan' }
      ]);
      return message;
    } else {
      return await startCibilFlow(phone, name);
    }
  } else if (intent === 'PERSONAL_LOAN' || normalizedText.includes('personal loan') || normalizedText === 'yes') {
    return await startLoanFlow(phone, name);
  } else if (normalizedText === 'check again') {
    return await startCibilFlow(phone, name);
  } else {
    return await handleGreeting(phone, name);
  }
}

/**
 * Handle CIBIL score delivery after payment
 */
async function deliverCibilScore(phone, paymentId) {
  const user = await getUser(phone);

  if (!user) {
    console.error('User not found for CIBIL delivery:', phone);
    return false;
  }

  // In production, integrate with actual CIBIL API
  // For now, generate a mock score
  const mockCibilScore = Math.floor(Math.random() * (850 - 550 + 1)) + 550;

  const rating = mockCibilScore >= 750 ? 'Excellent' :
    mockCibilScore >= 700 ? 'Good' :
      mockCibilScore >= 650 ? 'Fair' : 'Needs Improvement';

  await saveUser(phone, {
    cibilScore: mockCibilScore.toString(),
    stage: STAGES.CIBIL_DONE
  });

  const message = ` *Payment Confirmed!*\nPayment ID: ${paymentId}\n\n *Your CIBIL Score Report*\n━━━━━━━━━━━━━━━━━━━━\n *Score: ${mockCibilScore} / 900*\n Rating: *${rating}*\n━━━━━━━━━━━━━━━━━━━━\n\n${mockCibilScore >= 700
    ? ' Great news! Your score is good. You may be eligible for a Personal Loan with attractive rates!'
    : ' Your score needs improvement. Our experts can help you improve your CIBIL score.'
    }\n\n_Powered by Nidha Easy Loans_`;

  await sendTextMessage(phone, message);

  // Offer next steps based on score
  setTimeout(async () => {
    if (mockCibilScore >= 650) {
      await sendButtonMessage(phone,
        'Would you like to check your Personal Loan eligibility?',
        [
          { id: 'personal_loan', title: 'Check Eligibility' },
          { id: 'later', title: 'Maybe Later' }
        ]
      );
    } else {
      await sendTextMessage(phone,
        'Our team will contact you with tips to improve your CIBIL score. Type *hi* anytime to explore other services!'
      );
    }
  }, 3000);

  // Update eligibility color based on CIBIL score
  await updateEligibilityColor(phone, mockCibilScore >= 650);

  return true;
}

module.exports = {
  handleConversation,
  deliverCibilScore,
  STAGES
};
