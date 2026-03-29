const logger = require('./logger');

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0];
const fromAddress = process.env.EMAIL_FROM || '"FamilySync" <noreply@familysync.app>';

async function sendInviteEmail({ to, familyName, role, token, inviterName }) {
  const joinUrl = `${CLIENT_URL}/join/${token}`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
      <h2 style="color: #1DB954;">FamilySync</h2>
      <p>Hi there!</p>
      <p><strong>${inviterName}</strong> has invited you to join the <strong>${familyName}</strong> family on FamilySync as a <strong>${role}</strong>.</p>
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

module.exports = { sendInviteEmail };
