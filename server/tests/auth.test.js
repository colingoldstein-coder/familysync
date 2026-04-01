const request = require('supertest');
const app = require('../app');
const db = require('../db');
const { setup, teardown, cleanup } = require('./setup');

function getCookie(res) {
  const raw = res.headers['set-cookie'];
  if (!raw) return '';
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map(c => c.split(';')[0]).join('; ');
}

describe('Auth API', () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(cleanup);

  describe('POST /api/auth/register-family', () => {
    it('should register a new family and set auth cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register-family')
        .send({ familyName: 'Test Family', name: 'Parent', email: 'parent@test.com', password: 'Password1test' });

      expect(res.status).toBe(200);
      expect(getCookie(res)).toContain('familysync_session=');
      expect(res.body.user.name).toBe('Parent');
      expect(res.body.user.role).toBe('parent');
      expect(res.body.user.isAdmin).toBe(true);
    });

    it('should reject duplicate email', async () => {
      const data = { familyName: 'Test', name: 'Parent', email: 'dup@test.com', password: 'Password1test' };
      await request(app).post('/api/auth/register-family').send(data);
      const res = await request(app).post('/api/auth/register-family').send(data);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Unable to register');
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register-family')
        .send({ familyName: 'Test', name: 'Parent', email: 'notanemail', password: 'Password1test' });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register-family')
        .send({ familyName: 'Test', name: 'Parent', email: 'parent@test.com', password: '123' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      await request(app)
        .post('/api/auth/register-family')
        .send({ familyName: 'Test', name: 'Parent', email: 'login@test.com', password: 'Password1test' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'Password1test' });

      expect(res.status).toBe(200);
      expect(getCookie(res)).toContain('familysync_session=');
      expect(res.body.user.email).toBe('login@test.com');
    });

    it('should reject invalid password', async () => {
      await request(app)
        .post('/api/auth/register-family')
        .send({ familyName: 'Test', name: 'Parent', email: 'login2@test.com', password: 'Password1test' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login2@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid cookie', async () => {
      const reg = await request(app)
        .post('/api/auth/register-family')
        .send({ familyName: 'Test', name: 'Parent', email: 'me@test.com', password: 'Password1test' });

      const cookie = getCookie(reg);

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('me@test.com');
      expect(res.body.family).toBeDefined();
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('Invitation flow', () => {
    it('should send invite and accept it', async () => {
      const reg = await request(app)
        .post('/api/auth/register-family')
        .send({ familyName: 'Test', name: 'Parent', email: 'admin@test.com', password: 'Password1test' });

      const cookie = getCookie(reg);

      const inviteRes = await request(app)
        .post('/api/auth/invite')
        .set('Cookie', cookie)
        .send({ email: 'child@test.com', role: 'child' });

      expect(inviteRes.status).toBe(200);

      const invite = await db('invitations').where({ email: 'child@test.com' }).first();
      const inviteToken = invite.token;

      const getInvite = await request(app)
        .get(`/api/auth/invite/${inviteToken}`);

      expect(getInvite.status).toBe(200);
      expect(getInvite.body.email).toBe('child@test.com');

      const acceptRes = await request(app)
        .post('/api/auth/accept-invite')
        .send({ token: inviteToken, name: 'Child', password: 'Password1test' });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.user.role).toBe('child');
    });
  });
});
