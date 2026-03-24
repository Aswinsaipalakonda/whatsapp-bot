/**
 * Razorpay Payment Integration
 * Handles payment link generation and verification
 */

const Razorpay = require('razorpay');

let razorpayInstance = null;

/**
 * Initialize Razorpay client
 */
function initRazorpay() {
  if (razorpayInstance) return razorpayInstance;

  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  return razorpayInstance;
}

/**
 * Create a payment link for CIBIL check
 */
async function createPaymentLink(phone, name, amount = 99) {
  const razorpay = initRazorpay();

  const appUrl = process.env.APP_URL || 'https://your-app.vercel.app';
  const amountInPaise = amount * 100;

  try {
    const paymentLink = await razorpay.paymentLink.create({
      amount: amountInPaise,
      currency: 'INR',
      accept_partial: false,
      description: 'CIBIL Score Check - Nidha Easy Loans',
      customer: {
        name: name,
        contact: `+${phone}`
      },
      notify: {
        sms: true,
        email: false
      },
      reminder_enable: true,
      notes: {
        phone: phone,
        purpose: 'CIBIL_CHECK'
      },
      callback_url: `${appUrl}/api/payment-callback?from=${phone}`,
      callback_method: 'get',
      reference_id: phone, // Use phone as reference for easy lookup
      expire_by: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    });

    return {
      success: true,
      paymentLinkId: paymentLink.id,
      shortUrl: paymentLink.short_url,
      amount: amount
    };
  } catch (error) {
    console.error('Razorpay payment link error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verify payment status
 */
async function verifyPayment(paymentId) {
  const razorpay = initRazorpay();

  try {
    const payment = await razorpay.payments.fetch(paymentId);

    return {
      success: payment.status === 'captured',
      status: payment.status,
      amount: payment.amount / 100,
      method: payment.method,
      phone: payment.notes?.phone || '',
      paymentId: payment.id
    };
  } catch (error) {
    console.error('Razorpay verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get payment link status
 */
async function getPaymentLinkStatus(paymentLinkId) {
  const razorpay = initRazorpay();

  try {
    const paymentLink = await razorpay.paymentLink.fetch(paymentLinkId);

    return {
      success: true,
      status: paymentLink.status,
      isPaid: paymentLink.status === 'paid',
      amount: paymentLink.amount / 100,
      shortUrl: paymentLink.short_url
    };
  } catch (error) {
    console.error('Razorpay fetch error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  initRazorpay,
  createPaymentLink,
  verifyPayment,
  getPaymentLinkStatus
};
