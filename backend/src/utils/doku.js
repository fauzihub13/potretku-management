const crypto = require('crypto');

const DOKU_SANDBOX_API = 'https://api-sandbox.doku.com';
const DOKU_PRODUCTION_API = 'https://api.doku.com';
const DOKU_SANDBOX_JS = 'https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js';
const DOKU_PRODUCTION_JS = 'https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js';

function getApiBase() {
  return process.env.DOKU_ENV === 'production' ? DOKU_PRODUCTION_API : DOKU_SANDBOX_API;
}

function getJsUrl() {
  return process.env.DOKU_ENV === 'production' ? DOKU_PRODUCTION_JS : DOKU_SANDBOX_JS;
}

function generateRequestId() {
  return crypto.randomUUID();
}

function getTimestamp() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function generateSignature(clientSecret, clientId, requestId, timestamp, endpoint, bodyHash) {
  const stringToSign = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nRequest-Target:${endpoint}\nDigest:${bodyHash}`;
  const hmac = crypto.createHmac('sha256', clientSecret);
  hmac.update(stringToSign);
  return 'HMACSHA256=' + hmac.digest('base64');
}

function hashBody(body) {
  const bodyStr = JSON.stringify(body);
  return crypto.createHash('sha256').update(bodyStr).digest('base64');
}

async function createPayment(booking, vendorSettings, addons, slug) {
  const clientId = process.env.DOKU_CLIENT_ID;
  const clientSecret = process.env.DOKU_CLIENT_SECRET;
  const isProduction = process.env.DOKU_ENV === 'production';

  const invoiceNumber = `INV-${booking.bookingCode}-${Date.now()}`;
  const amount = Math.round(booking.totalAmount);
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const callbackUrl = `${frontendUrl}/${slug}/status/${booking.bookingCode}`;
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';

  const lineItems = [
    {
      id: '1',
      name: booking.packageName,
      price: Math.round(booking.packagePrice),
      quantity: 1,
      sku: booking.bookingCode,
      category: 'services'
    }
  ];

  addons.forEach((addon, idx) => {
    lineItems.push({
      id: String(idx + 2),
      name: addon.name,
      price: Math.round(addon.price),
      quantity: addon.quantity,
      sku: `${booking.bookingCode}-ADD${idx + 1}`,
      category: 'services'
    });
  });

  const body = {
    order: {
      amount,
      invoice_number: invoiceNumber,
      currency: 'IDR',
      callback_url: callbackUrl,
      callback_url_result: callbackUrl,
      callback_url_cancel: `${frontendUrl}/${slug}/status/${booking.bookingCode}`,
      language: 'ID',
      auto_redirect: true,
      line_items: lineItems
    },
    payment: {
      payment_due_date: 60,
      // payment_method_types: [
      //   'VIRTUAL_ACCOUNT_BCA',
      //   'VIRTUAL_ACCOUNT_BANK_MANDIRI',
      //   'VIRTUAL_ACCOUNT_BRI',
      //   'VIRTUAL_ACCOUNT_BNI',
      //   'QRIS',
      //   'EMONEY_SHOPEEPAY',
      //   'EMONEY_DANA',
      //   'CREDIT_CARD'
      // ]
    },
    customer: {
      id: booking.bookingCode,
      name: booking.clientName,
      phone: booking.clientPhone || '',
      email: booking.clientEmail || ''
    }
  };

  const timestamp = getTimestamp();
  const requestId = generateRequestId();
  const bodyHash = hashBody(body);
  const endpoint = '/checkout/v1/payment';
  const signature = generateSignature(clientSecret, clientId, requestId, timestamp, endpoint, bodyHash);

  const url = `${getApiBase()}${endpoint}`;

  console.log('[DOKU] Request headers:');
  console.log('  Client-Id:', clientId);
  console.log('  Request-Id:', requestId);
  console.log('  Request-Timestamp:', timestamp);
  console.log('  Body Hash:', bodyHash);
  console.log('  Signature:', signature);
  console.log('[DOKU] Body:', JSON.stringify(body));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': clientId,
      'Request-Id': requestId,
      'Request-Timestamp': timestamp,
      'Signature': signature
    },
    body: JSON.stringify(body)
  });

  const result = await response.json();

  if (result.message && result.message.includes('SUCCESS')) {
      // Parse expired_date from format yyyyMMddHHmmss to Date
      let expiredDate = null;
      const expStr = result.response.payment.expired_date;
      if (expStr && expStr.length === 14) {
        const y = expStr.substring(0, 4);
        const m = expStr.substring(4, 6);
        const d = expStr.substring(6, 8);
        const h = expStr.substring(8, 10);
        const mi = expStr.substring(10, 12);
        const s = expStr.substring(12, 14);
        expiredDate = new Date(`${y}-${m}-${d}T${h}:${mi}:${s}+07:00`);
      }

      return {
        success: true,
        paymentUrl: result.response.payment.url,
        sessionId: result.response.order.session_id,
        invoiceNumber,
        tokenId: result.response.payment.token_id,
        expiredDate
      };
  }

  console.error('[DOKU] Payment creation failed:', result);
  return {
    success: false,
    error: result.error_messages || result.message || 'Gagal membuat pembayaran'
  };
}

function verifyNotification(notificationBody, headers) {
  const clientSecret = process.env.DOKU_CLIENT_SECRET;
  const signature = headers['signature'];
  if (!signature) return false;

  const bodyHash = hashBody(notificationBody);
  const endpoint = '/checkout/v1/payment/notification';
  const timestamp = headers['request-timestamp'] || getTimestamp();
  const expectedSig = generateSignature(clientSecret, 'POST', endpoint, '', bodyHash, timestamp);

  return signature === expectedSig;
}

module.exports = { createPayment, verifyNotification, getJsUrl, generateRequestId };
