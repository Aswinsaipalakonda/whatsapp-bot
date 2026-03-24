/**
 * Daily Follow-up Cron Job
 * Runs daily at 10 AM IST to follow up with inactive users
 */

const { getInactiveUsers, saveUser } = require('../../lib/sheets');
const { sendTextMessage } = require('../../lib/whatsapp');

module.exports = async function handler(req, res) {
  // Verify this is a cron request (Vercel sends this header)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  // In production, verify the request is from Vercel Cron
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Allow manual trigger in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  console.log('Starting daily follow-up job...');

  try {
    // Get all inactive users (no message in 24 hours)
    const inactiveUsers = await getInactiveUsers();

    console.log(`Found ${inactiveUsers.length} inactive users`);

    const results = {
      total: inactiveUsers.length,
      success: 0,
      failed: 0,
      users: []
    };

    for (const user of inactiveUsers) {
      try {
        const message = buildFollowUpMessage(user);

        await sendTextMessage(user.phone, message);

        // Update last message time
        await saveUser(user.phone, {
          lastMessageTime: new Date().toISOString()
        });

        results.success++;
        results.users.push({
          phone: user.phone,
          status: 'sent',
          stage: user.stage
        });

        // Add small delay between messages to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Failed to send follow-up to ${user.phone}:`, error);
        results.failed++;
        results.users.push({
          phone: user.phone,
          status: 'failed',
          error: error.message
        });
      }
    }

    console.log('Follow-up job completed:', results);

    return res.status(200).json({
      success: true,
      message: `Sent ${results.success} follow-up messages`,
      results
    });

  } catch (error) {
    console.error('Follow-up job error:', error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Build personalized follow-up message based on user's stage
 */
function buildFollowUpMessage(user) {
  const name = user.name || 'there';
  const stage = user.stage || '';

  if (stage === 'COLLECT_CIBIL_NAME' || stage === 'COLLECT_CIBIL_DOB' || stage === 'COLLECT_CIBIL_PAN') {
    return `Hi ${name}!\n\nWe noticed you were in the process of checking your *CIBIL Score* with us.\n\nWould you like to continue? Just reply *yes* and we'll pick up right where we left off.\n\n_Nidha Easy Loans_`;
  }

  if (stage === 'AWAITING_PAYMENT') {
    return `Hi ${name}!\n\nYour *CIBIL Score payment* is still pending.\n\nComplete the payment to get your CIBIL score report instantly. Type *new link* if you need a fresh payment link.\n\n_Nidha Easy Loans_`;
  }

  if (stage === 'COLLECT_LOAN_EMPLOYMENT' || stage === 'COLLECT_LOAN_INCOME' ||
    stage === 'COLLECT_LOAN_AMOUNT' || stage === 'COLLECT_LOAN_EMI') {
    return `Hi ${name}!\n\nWe noticed you were checking your *Personal Loan eligibility* with us yesterday.\n\nWould you like to continue? Just reply and we'll pick up right where we left off.\n\n_Nidha Easy Loans_`;
  }

  if (stage === 'CONTACTED_TEAM') {
    return `Hi ${name}!\n\nOur team has been trying to reach you regarding your loan inquiry.\n\nIf you're still interested, please reply or call us at +91 70368 11812.\n\n_Nidha Easy Loans_`;
  }

  // Default message
  return `Hi ${name}!\n\nWe noticed you reached out to us recently about loan or CIBIL services.\n\nWe're here to help whenever you're ready! Just say *Hi* to get started.\n\n_Nidha Easy Loans_`;
}
