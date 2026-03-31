const request = require('supertest');
const app = require('../app');
const { setup, teardown, cleanup } = require('./setup');

async function createFamilyWithChild() {
  const reg = await request(app)
    .post('/api/auth/register-family')
    .send({ familyName: 'Test', name: 'Parent', email: 'parent@test.com', password: 'Password1test' });

  const parentToken = reg.body.token;

  const invite = await request(app)
    .post('/api/auth/invite')
    .set('Authorization', `Bearer ${parentToken}`)
    .send({ email: 'child@test.com', role: 'child' });

  const accept = await request(app)
    .post('/api/auth/accept-invite')
    .send({ token: invite.body.inviteToken, name: 'Child', password: 'Password1test' });

  return { parentToken, childToken: accept.body.token, childId: accept.body.user.id };
}

describe('Tasks API', () => {
  beforeAll(setup);
  afterAll(teardown);
  beforeEach(cleanup);

  it('should create and list tasks', async () => {
    const { parentToken, childToken, childId } = await createFamilyWithChild();

    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: 'Do homework', assignedTo: childId });

    expect(create.status).toBe(200);

    const parentTasks = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`);

    expect(parentTasks.body.tasks).toHaveLength(1);
    expect(parentTasks.body.tasks[0].title).toBe('Do homework');

    const childTasks = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${childToken}`);

    expect(childTasks.body.tasks).toHaveLength(1);
  });

  it('should update task status', async () => {
    const { parentToken, childToken, childId } = await createFamilyWithChild();

    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: 'Clean room', assignedTo: childId });

    const taskId = create.body.taskId;

    const update = await request(app)
      .patch(`/api/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${childToken}`)
      .send({ status: 'completed' });

    expect(update.status).toBe(200);
  });

  it('should prevent child from creating tasks', async () => {
    const { childToken } = await createFamilyWithChild();

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ title: 'No', assignedTo: 1 });

    expect(res.status).toBe(403);
  });

  it('should delete task as parent', async () => {
    const { parentToken, childId } = await createFamilyWithChild();

    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ title: 'Temp', assignedTo: childId });

    const del = await request(app)
      .delete(`/api/tasks/${create.body.taskId}`)
      .set('Authorization', `Bearer ${parentToken}`);

    expect(del.status).toBe(200);
  });
});
