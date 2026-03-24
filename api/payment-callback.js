/**
 * Payment Callback Handler
 * Handles Razorpay payment verification and CIBIL score delivery
 */

const { verifyPayment } = require('../lib/razorpay');
const { deliverCibilScore } = require('../lib/conversation');
const { saveUser, getUser } = require('../lib/sheets');

module.exports = async function handler(req, res) {
  // This endpoint handles Razorpay callback after payment
  if (req.method === 'GET') {
    try {
      const {
        razorpay_payment_id,
        razorpay_payment_link_id,
        razorpay_payment_link_status,
        razorpay_payment_link_reference_id,
        from // Fallback phone from our callback URL
      } = req.query;

      const phone = razorpay_payment_link_reference_id || from;
      const paymentId = razorpay_payment_id;
      const status = razorpay_payment_link_status;

      console.log('Payment callback received:', {
        phone,
        paymentId,
        status
      });

      // Create a nice HTML response page
      const createHtmlResponse = (success, message) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment ${success ? 'Successful' : 'Failed'} - Nidha Easy Loans</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 40px;
        }
        .icon.success { background: #d4edda; }
        .icon.error { background: #f8d7da; }
        h1 {
            color: #333;
            margin-bottom: 15px;
            font-size: 24px;
        }
        p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .highlight {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .btn {
            display: inline-block;
            background: #25D366;
            color: white;
            padding: 15px 30px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 20px;
        }
        .btn:hover { background: #128C7E; }
        .brand {
            margin-top: 30px;
            color: #999;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon ${success ? 'success' : 'error'}">
            ${success ? '✓' : '✗'}
        </div>
        <h1>${success ? 'Payment Successful!' : 'Payment Issue'}</h1>
        <p>${message}</p>
        ${success ? `
        <div class="highlight">
            <strong>Payment ID:</strong><br>
            <code>${paymentId || 'N/A'}</code>
        </div>
        <p>Your CIBIL score report has been sent to your WhatsApp!</p>
        ` : `
        <p>Please try again or contact support.</p>
        `}
        <a href="https://wa.me/917036811812" class="btn">
            📱 Open WhatsApp
        </a>
        <p class="brand">Nidha Easy Loans</p>
    </div>
</body>
</html>
      `;

      // Check if payment was successful
      if (status === 'paid' && paymentId) {
        // Verify with Razorpay
        const verification = await verifyPayment(paymentId);

        if (verification.success) {
          // Update user payment status
          await saveUser(phone, {
            paymentId: paymentId,
            stage: 'CIBIL_DONE'
          });

          // Deliver CIBIL score via WhatsApp
          await deliverCibilScore(phone, paymentId);

          return res.status(200).send(createHtmlResponse(true,
            'Thank you for your payment! Your CIBIL score report is being processed.'
          ));
        }
      }

      // Payment failed or pending
      return res.status(200).send(createHtmlResponse(false,
        'We could not verify your payment. If amount was deducted, it will be refunded within 5-7 business days.'
      ));

    } catch (error) {
      console.error('Payment callback error:', error);

      return res.status(200).send(`
<!DOCTYPE html>
<html>
<head><title>Error - Nidha Easy Loans</title></head>
<body style="font-family: sans-serif; text-align: center; padding: 50px;">
    <h1>Something went wrong</h1>
    <p>Please contact support: +91 70368 11812</p>
    <a href="https://wa.me/917036811812">Open WhatsApp</a>
</body>
</html>
      `);
    }
  }

  // Handle POST for Razorpay webhook (server-to-server)
  if (req.method === 'POST') {
    try {
      const event = req.body;

      console.log('Razorpay webhook event:', event?.event);

      if (event?.event === 'payment_link.paid') {
        const paymentLink = event.payload?.payment_link?.entity;
        const payment = event.payload?.payment?.entity;

        const phone = paymentLink?.reference_id || paymentLink?.notes?.phone;
        const paymentId = payment?.id;

        if (phone && paymentId) {
          await saveUser(phone, { paymentId });
          await deliverCibilScore(phone, paymentId);
        }
      }

      return res.status(200).json({ status: 'ok' });

    } catch (error) {
      console.error('Razorpay webhook error:', error);
      return res.status(200).json({ status: 'error', message: error.message });
    }
  }

  return res.status(405).send('Method not allowed');
};
