const request = require('supertest');
const app = require('../app');
const { setup, teardown, cleanup } = require('./setup');

describe('Auth API', () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(cleanup);

  describe('POST /api/auth/register-family', () => {
    it('should register a new family and return token', async () => {
      const res = await request(app)
        .post('/api/auth/register-family')
        .send({ familyName: 'Test Family', name: 'Parent', email: 'parent@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Parent');
      expect(res.body.user.role).toBe('parent');
      expect(res.body.user.isAdmin).toBe(true);
    });

    it('should reject duplicate email', async () => {
      const data = { familyName: 'Test', name: 'Parent', email: 'dup@test.com', password: 'password123' };
      await request(app).post('/api/auth/register-family').send(data);
      const res = await request(app).post('/api/auth/register-family').send(data);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already registered');
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register-family')
        .send({ familyName: 'Test', name: 'Parent', email: 'notanemail', password: 'password123' });

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
        .send({ familyName: 'Test', name: 'Parent', email: 'login@test.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('login@test.com');
    });

    it('should reject invalid password', async () => {
      await request(app)
        .post('/api/auth/register-family')
        .send({ familyName: 'Test', name: 'Parent', email: 'login2@test.com', password: 'password123' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login2@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user with valid token', async () => {
      const reg = await request(app)
        .post('/api/auth/register-family')
        .send({ familyName: 'Test', name: 'Parent', email: 'me@test.com', password: 'password123' });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.token}`);

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
        .send({ familyName: 'Test', name: 'Parent', email: 'admin@test.com', password: 'password123' });

      const token = reg.body.token;

      const inviteRes = await request(app)
        .post('/api/auth/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'child@test.com', role: 'child' });

      expect(inviteRes.status).toBe(200);
      expect(inviteRes.body.inviteToken).toBeDefined();

      const getInvite = await request(app)
        .get(`/api/auth/invite/${inviteRes.body.inviteToken}`);

      expect(getInvite.status).toBe(200);
      expect(getInvite.body.email).toBe('child@test.com');

      const acceptRes = await request(app)
        .post('/api/auth/accept-invite')
        .send({ token: inviteRes.body.inviteToken, name: 'Child', password: 'password123' });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.user.role).toBe('child');
    });
  });
});
