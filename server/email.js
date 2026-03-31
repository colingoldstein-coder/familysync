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

async function sendBrandedEmail({ to, subject, bodyHtml }) {
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; overflow: hidden;">
      <div style="background: #1DB954; padding: 20px 32px;">
        <h1 style="margin: 0; color: #fff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">FamilySync</h1>
      </div>
      <div style="padding: 32px; color: #e0e0e0; font-size: 15px; line-height: 1.7;">
        <h2 style="color: #fff; font-size: 18px; margin: 0 0 16px;">${escapeHtml(subject)}</h2>
        ${bodyHtml}
      </div>
      <div style="padding: 16px 32px; border-top: 1px solid #333; color: #888; font-size: 12px; text-align: center;">
        Sent by FamilySync &bull; <a href="${CLIENT_URL}" style="color: #1DB954; text-decoration: none;">Open App</a>
      </div>
    </div>
  `;

  if (!process.env.RESEND_API_KEY) {
    logger.warn({ to: Array.isArray(to) ? to.length + ' recipients' : to }, 'No email provider configured — skipping branded email');
    return;
  }

  const recipients = Array.isArray(to) ? to : [to];

  for (const recipient of recipients) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipient,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ to: recipient, status: res.status, body }, 'Resend API error (branded)');
      throw new Error(`Resend API error for ${recipient}: ${res.status} ${body}`);
    }
  }

  logger.info({ recipientCount: recipients.length }, 'Branded email sent');
}

module.exports = { sendInviteEmail, sendContactEmail, sendBrandedEmail, escapeHtml };
