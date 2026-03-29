const nodemailer = require('nodemailer');
const logger = require('./logger');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

let transporter;

if (process.env.RESEND_API_KEY) {
  transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: process.env.RESEND_API_KEY,
    },
  });
} else if (process.env.GMAIL_USER) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

const fromAddress = process.env.EMAIL_FROM || `"FamilySync" <${process.env.GMAIL_USER || 'noreply@familysync.app'}>`;

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

  if (!transporter) {
    logger.warn({ to, joinUrl }, 'No email provider configured — logging invite link');
    return;
  }

  try {
    await transporter.sendMail({
      from: fromAddress,
      to,
      subject: `${inviterName} invited you to join ${familyName} on FamilySync`,
      html,
    });
    logger.info({ to }, 'Invite email sent');
  } catch (err) {
    logger.error({ to, err: err.message }, 'Failed to send invite email');
    logger.info({ to, joinUrl }, 'Invite link (email failed)');
  }
}

module.exports = { sendInviteEmail };
