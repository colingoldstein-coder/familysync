const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload.email_verified) {
    throw new Error('Google email not verified');
  }
  return {
    provider: 'google',
    providerId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
  };
}

module.exports = { verifyGoogleToken };
