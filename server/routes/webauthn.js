const express = require('express');
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const db = require('../db');
const { authenticate } = require('../middleware/auth');
const { setAuthCookie } = require('../cookie');
const { makeToken } = require('../makeToken');
const { validate, validateParamId, schemas } = require('../validation');
const logger = require('../logger');
const { toBool } = require('../utils');

const router = express.Router();

const rpName = 'FamilySync';

function getRpId(req) {
  const host = req.hostname;
  // Strip port and www prefix for RP ID
  return host.replace(/^www\./, '').split(':')[0];
}

function getOrigin(req) {
  const proto = req.header('x-forwarded-proto') || req.protocol;
  return `${proto}://${req.hostname}`;
}

// ===== REGISTRATION (requires auth - user adds biometric to their account) =====

router.post('/register-options', authenticate, async (req, res) => {
  try {
    const user = await db('users').where({ id: req.user.id }).first();
    const existingCreds = await db('webauthn_credentials').where({ user_id: user.id });

    if (existingCreds.length >= 10) {
      return res.status(400).json({ error: 'Maximum of 10 devices allowed. Please remove an existing device first.' });
    }

    const options = await generateRegistrationOptions({
      rpName,
      rpID: getRpId(req),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials: existingCreds.map(c => ({
        id: c.credential_id,
        transports: c.transports ? JSON.parse(c.transports) : undefined,
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
    });

    await db('users').where({ id: user.id }).update({
      webauthn_challenge: options.challenge,
      webauthn_challenge_at: new Date(),
    });

    res.json(options);
  } catch (err) {
    logger.error({ msg: 'WebAuthn register-options error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', authenticate, validate(schemas.webauthnRegister), async (req, res) => {
  try {
    const user = await db('users').where({ id: req.user.id }).first();

    if (!user.webauthn_challenge) {
      return res.status(400).json({ error: 'No registration challenge found' });
    }
    if (user.webauthn_challenge_at && Date.now() - new Date(user.webauthn_challenge_at).getTime() > 5 * 60 * 1000) {
      await db('users').where({ id: user.id }).update({ webauthn_challenge: null, webauthn_challenge_at: null });
      return res.status(400).json({ error: 'Challenge expired. Please try again.' });
    }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: user.webauthn_challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const { credential } = verification.registrationInfo;

    await db('webauthn_credentials').insert({
      user_id: user.id,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      device_name: req.body.deviceName || 'This device',
      transports: req.body.response?.transports ? JSON.stringify(req.body.response.transports) : null,
    });

    // Clear challenge
    await db('users').where({ id: user.id }).update({ webauthn_challenge: null });

    res.json({ verified: true });
  } catch (err) {
    logger.error({ msg: 'WebAuthn register error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== AUTHENTICATION (public - biometric login) =====

router.post('/login-options', validate(schemas.webauthnLoginOptions), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await db('users').where({ email }).first();
    if (!user) {
      // Don't reveal whether user exists - return plausible options
      return res.status(400).json({ error: 'No biometric credentials found' });
    }

    const credentials = await db('webauthn_credentials').where({ user_id: user.id });
    if (credentials.length === 0) {
      return res.status(400).json({ error: 'No biometric credentials found' });
    }

    const options = await generateAuthenticationOptions({
      rpID: getRpId(req),
      userVerification: 'required',
      allowCredentials: credentials.map(c => ({
        id: c.credential_id,
        transports: c.transports ? JSON.parse(c.transports) : undefined,
      })),
    });

    await db('users').where({ id: user.id }).update({
      webauthn_challenge: options.challenge,
      webauthn_challenge_at: new Date(),
    });

    res.json(options);
  } catch (err) {
    logger.error({ msg: 'WebAuthn login-options error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', validate(schemas.webauthnLogin), async (req, res) => {
  try {
    const { email, response } = req.body;

    const user = await db('users').where({ email }).first();
    if (!user || !user.webauthn_challenge) {
      return res.status(400).json({ error: 'Authentication failed' });
    }
    if (user.webauthn_challenge_at && Date.now() - new Date(user.webauthn_challenge_at).getTime() > 5 * 60 * 1000) {
      await db('users').where({ id: user.id }).update({ webauthn_challenge: null, webauthn_challenge_at: null });
      return res.status(400).json({ error: 'Authentication failed' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'This account has been deactivated. Please contact your family admin.' });
    }
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(429).json({ error: `Account temporarily locked. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` });
    }

    const credential = await db('webauthn_credentials')
      .where({ credential_id: response.id, user_id: user.id })
      .first();

    if (!credential) {
      return res.status(400).json({ error: 'Authentication failed' });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: user.webauthn_challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
      credential: {
        id: credential.credential_id,
        publicKey: Buffer.from(credential.public_key, 'base64'),
        counter: Number(credential.counter),
        transports: credential.transports ? JSON.parse(credential.transports) : undefined,
      },
    });

    if (!verification.verified) {
      return res.status(400).json({ error: 'Authentication failed' });
    }

    // Update counter
    await db('webauthn_credentials')
      .where({ id: credential.id })
      .update({ counter: verification.authenticationInfo.newCounter });

    // Clear challenge
    await db('users').where({ id: user.id }).update({ webauthn_challenge: null });

    const token = makeToken(user, user.family_id);

    setAuthCookie(res, token);
    res.json({
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        avatarColor: user.avatar_color,
        avatarUrl: user.avatar_url || null,
        isAdmin: toBool(user.is_admin), isSuperAdmin: toBool(user.is_super_admin),
        familyId: user.family_id,
      },
    });
  } catch (err) {
    logger.error({ msg: 'WebAuthn login error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// ===== MANAGE CREDENTIALS =====

router.get('/credentials', authenticate, async (req, res) => {
  try {
    const credentials = await db('webauthn_credentials')
      .where({ user_id: req.user.id })
      .select('id', 'device_name', 'created_at');
    res.json({ credentials });
  } catch (err) {
    logger.error({ msg: 'WebAuthn credentials error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/credentials/:id', authenticate, validateParamId, async (req, res) => {
  try {
    const deleted = await db('webauthn_credentials')
      .where({ id: req.params.id, user_id: req.user.id })
      .del();
    if (!deleted) {
      return res.status(404).json({ error: 'Credential not found' });
    }
    res.json({ message: 'Credential removed' });
  } catch (err) {
    logger.error({ msg: 'WebAuthn delete error', error: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
