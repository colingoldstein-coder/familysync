const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_NAME = 'familysync_session';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/',
  maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
};

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: isProduction, sameSite: 'strict', path: '/' });
}

module.exports = { COOKIE_NAME, setAuthCookie, clearAuthCookie };
