const crypto = require('crypto');
const logger = require('./logger');

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0];
const fromAddress = process.env.EMAIL_FROM || '"FamilySync" <noreply@familysync.app>';

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function sendInviteEmail({ to, familyName, role, token, inviterName }) {
  const joinUrl = `${CLIENT_URL}/join/${token}`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #1DB954;">FamilySync</h2>
      <p>Hi there!</p>
      <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join the <strong>${escapeHtml(familyName)}</strong> family on FamilySync as a <strong>${escapeHtml(role)}</strong>.</p>
      <p>
        <a href="${joinUrl}" style="display: inline-block; background: #1DB954; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Join Family
        </a>
      </p>
      <p style="color: #888; font-size: 13px;">Or copy this link: ${joinUrl}</p>
    </div>
  `;

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to,
        subject: `${inviterName} invited you to join ${familyName} on FamilySync`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ to, status: res.status, body }, 'Resend API error');
      throw new Error(`Resend API error: ${res.status} ${body}`);
    }

    logger.info({ to }, 'Invite email sent');
  } else {
    logger.warn({ to, joinUrl }, 'No email provider configured — logging invite link');
  }
}

async function sendContactEmail({ name, email, message }) {
  const toAddress = process.env.CONTACT_EMAIL || 'myfamilysyncapp@gmail.com';

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #1DB954;">FamilySync — New Contact Message</h2>
      <p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email)})</p>
      <hr style="border: none; border-top: 1px solid #333; margin: 16px 0;" />
      <p style="white-space: pre-wrap;">${escapeHtml(message)}</p>
    </div>
  `;

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: toAddress,
        reply_to: email,
        subject: `FamilySync Contact: ${name}`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ email, status: res.status, body }, 'Resend API error (contact)');
      throw new Error(`Resend API error: ${res.status} ${body}`);
    }

    logger.info({ from: email }, 'Contact email sent');
  } else {
    logger.warn({ name, email, message }, 'No email provider configured — logging contact message');
  }
}

// recipients: array of { email, userId } or array of email strings (backwards compat)
async function sendBrandedEmail({ to, subject, bodyHtml }) {
  const logoUrl = `${CLIENT_URL}/pwa-192x192.png`;

  function buildHtml(unsubUrl) {
    return `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; overflow: hidden;">
      <div style="background: #1DB954; padding: 16px 32px;">
        <a href="${CLIENT_URL}" style="text-decoration: none; display: flex; align-items: center; gap: 12px;">
          <img src="${logoUrl}" alt="FamilySync" width="36" height="36" style="border-radius: 8px; display: block;" />
          <span style="color: #fff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">FamilySync</span>
        </a>
      </div>
      <div style="padding: 32px; color: #e0e0e0; font-size: 15px; line-height: 1.7;">
        <h2 style="color: #fff; font-size: 26px; margin: 0 0 16px;">${escapeHtml(subject)}</h2>
        ${bodyHtml}
      </div>
      <div style="padding: 16px 32px; border-top: 1px solid #333; color: #888; font-size: 12px; text-align: center;">
        Sent by FamilySync &bull; <a href="${CLIENT_URL}" style="color: #1DB954; text-decoration: none;">Open App</a>
        ${unsubUrl ? `<br/><a href="${unsubUrl}" style="color: #888; text-decoration: underline; font-size: 11px;">Manage email settings</a>` : ''}
      </div>
    </div>
    `;
  }

  const recipients = Array.isArray(to) ? to : [to];

  if (!process.env.RESEND_API_KEY) {
    logger.warn({ to: recipients.length + ' recipients' }, 'No email provider configured — skipping branded email');
    return recipients.map(r => {
      const email = typeof r === 'string' ? r : r.email;
      return { email, status: 'skipped' };
    });
  }

  const results = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const email = typeof recipient === 'string' ? recipient : recipient.email;
    const userId = typeof recipient === 'object' ? recipient.userId : null;
    const unsubUrl = userId ? getUnsubscribeUrl(userId) : null;

    // Rate limit: wait 300ms between sends to stay under Resend's 5/sec limit
    if (i > 0) await new Promise(r => setTimeout(r, 300));

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: email,
          subject,
          html: buildHtml(unsubUrl),
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        logger.error({ to: email, status: res.status, body }, 'Resend API error (branded)');
        results.push({ email, status: 'failed', error: `${res.status} ${body}` });
      } else {
        results.push({ email, status: 'sent' });
      }
    } catch (err) {
      logger.error({ to: email, error: err.message }, 'Resend API exception (branded)');
      results.push({ email, status: 'failed', error: err.message });
    }
  }

  const sentCount = results.filter(r => r.status === 'sent').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  logger.info({ recipientCount: recipients.length, sentCount, failedCount }, 'Branded email batch complete');

  return results;
}

function generateEmailPrefToken(userId) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const data = `email-pref:${userId}`;
  const hmac = crypto.createHmac('sha256', secret).update(data).digest('hex');
  return `${userId}.${hmac}`;
}

function verifyEmailPrefToken(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 2) return null;
  const userId = parseInt(parts[0]);
  if (isNaN(userId)) return null;
  const expected = generateEmailPrefToken(userId);
  if (token !== expected) return null;
  return userId;
}

function getUnsubscribeUrl(userId) {
  return `${CLIENT_URL}/account#email-preferences`;
}

module.exports = { sendInviteEmail, sendContactEmail, sendBrandedEmail, escapeHtml, getUnsubscribeUrl, verifyEmailPrefToken };
