import request from 'supertest';
import { createApp } from '../src/app';
import { agentRepository } from '../src/repositories/agent.repository';
import { ConflictError, NotFoundError } from '../src/utils/errors';
import { AGENT_ID, makeAgent } from './helpers';

// Only the repository (the Prisma boundary) is replaced. Routing, validation,
// services, controllers and error handling all run for real.
jest.mock('../src/repositories/agent.repository', () => ({
  agentRepository: {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getStats: jest.fn(),
  },
}));

// No Redis in route tests: the cache is a pass-through to the loader.
jest.mock('../src/services/cache.service', () => ({
  ...jest.requireActual('../src/services/cache.service'),
  cacheService: {
    remember: (_key: string, _ttl: number, loader: () => Promise<unknown>) => loader(),
    getListVersion: async () => null,
    invalidateLists: async () => undefined,
    invalidateKey: async () => undefined,
  },
}));

const repo = jest.mocked(agentRepository);
const app = createApp();
const base = '/api/v1/agents';

const validBody = {
  fullName: 'Asha Rao',
  phone: '+91 98765 43210',
  email: 'Asha@Example.com',
  serviceArea: 'Indiranagar',
};

describe('POST /agents', () => {
  it('creates an agent with normalized data and returns 201', async () => {
    repo.create.mockResolvedValue(makeAgent());
    const res = await request(app).post(base).send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(AGENT_ID);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+919876543210', email: 'asha@example.com' }),
    );
  });

  it('returns 400 with field details for invalid input and never hits the repository', async () => {
    const res = await request(app)
      .post(base)
      .send({ ...validBody, email: 'nope', phone: '1' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'phone']));
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('returns 409 when the repository reports a duplicate', async () => {
    repo.create.mockRejectedValue(new ConflictError('An agent with this email already exists'));
    const res = await request(app).post(base).send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post(base)
      .set('Content-Type', 'application/json')
      .send('{"fullName": ');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Malformed JSON body');
  });
});

describe('GET /agents', () => {
  it('passes search, filters and pagination to the repository', async () => {
    repo.findMany.mockResolvedValue({ items: [makeAgent()], total: 25 });
    const res = await request(app).get(
      `${base}?page=3&limit=5&search=asha&status=ACTIVE&serviceArea=North`,
    );

    expect(res.status).toBe(200);
    expect(repo.findMany).toHaveBeenCalledWith(
      { search: 'asha', status: 'ACTIVE', serviceArea: 'North' },
      10,
      5,
    );
    expect(res.body.meta.pagination).toEqual({ page: 3, limit: 5, total: 25, totalPages: 5 });
  });

  it('uses defaults and returns an empty page cleanly', async () => {
    repo.findMany.mockResolvedValue({ items: [], total: 0 });
    const res = await request(app).get(base);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta.pagination).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
    expect(repo.findMany).toHaveBeenCalledWith({}, 0, 10);
  });

  it('rejects invalid query values with 400', async () => {
    const res = await request(app).get(`${base}?limit=1000&status=BUSY`);
    expect(res.status).toBe(400);
    expect(repo.findMany).not.toHaveBeenCalled();
  });
});

describe('GET /agents/stats', () => {
  it('is not swallowed by the /:id route', async () => {
    const stats = { total: 3, active: 2, inactive: 1, byVehicleType: [], byServiceArea: [] };
    repo.getStats.mockResolvedValue(stats);
    const res = await request(app).get(`${base}/stats`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(stats);
    expect(repo.findById).not.toHaveBeenCalled();
  });
});

describe('GET /agents/:id', () => {
  it('returns the agent', async () => {
    repo.findById.mockResolvedValue(makeAgent());
    const res = await request(app).get(`${base}/${AGENT_ID}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('asha@example.com');
  });

  it('returns 404 when missing', async () => {
    repo.findById.mockResolvedValue(null);
    const res = await request(app).get(`${base}/${AGENT_ID}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a non-UUID id', async () => {
    const res = await request(app).get(`${base}/not-a-uuid`);
    expect(res.status).toBe(400);
    expect(repo.findById).not.toHaveBeenCalled();
  });
});

describe('PATCH /agents/:id', () => {
  it('applies a partial update', async () => {
    repo.update.mockResolvedValue(makeAgent({ status: 'INACTIVE' }));
    const res = await request(app).patch(`${base}/${AGENT_ID}`).send({ status: 'INACTIVE' });

    expect(res.status).toBe(200);
    expect(repo.update).toHaveBeenCalledWith(AGENT_ID, { status: 'INACTIVE' });
    expect(res.body.data.status).toBe('INACTIVE');
  });

  it('returns 400 for an empty body', async () => {
    const res = await request(app).patch(`${base}/${AGENT_ID}`).send({});
    expect(res.status).toBe(400);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the agent does not exist', async () => {
    repo.update.mockRejectedValue(new NotFoundError('Agent not found'));
    const res = await request(app).patch(`${base}/${AGENT_ID}`).send({ notes: 'x' });
    expect(res.status).toBe(404);
  });

  it('returns 409 on duplicate phone/email', async () => {
    repo.update.mockRejectedValue(new ConflictError('An agent with this phone already exists'));
    const res = await request(app).patch(`${base}/${AGENT_ID}`).send({ phone: '+919999999999' });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /agents/:id', () => {
  it('deletes and returns the id', async () => {
    repo.delete.mockResolvedValue(undefined);
    const res = await request(app).delete(`${base}/${AGENT_ID}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { id: AGENT_ID } });
  });

  it('returns 404 when the agent does not exist', async () => {
    repo.delete.mockRejectedValue(new NotFoundError('Agent not found'));
    const res = await request(app).delete(`${base}/${AGENT_ID}`);
    expect(res.status).toBe(404);
  });
});

describe('error handling', () => {
  it('hides internal error details behind a 500', async () => {
    repo.findById.mockRejectedValue(new Error('connection string leaked: postgres://secret'));
    const res = await request(app).get(`${base}/${AGENT_ID}`);

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/unknown');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /ping', () => {
  it('answers 200 without touching the database or Redis', async () => {
    const res = await request(app).get('/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('CORS', () => {
  it('allows the configured origin and not others', async () => {
    const allowed = await request(app).get('/ping').set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const other = await request(app).get('/ping').set('Origin', 'https://evil.example');
    expect(other.headers['access-control-allow-origin']).toBeUndefined();
  });
});
