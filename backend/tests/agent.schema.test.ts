import {
  agentIdParamSchema,
  createAgentSchema,
  listAgentsQuerySchema,
  updateAgentSchema,
} from '../src/schemas/agent.schema';

const valid = {
  fullName: '  Asha Rao ',
  phone: '+91 98765-43210',
  email: '  ASHA@Example.COM ',
  serviceArea: 'Indiranagar',
};

describe('createAgentSchema', () => {
  it('trims, normalizes phone and lowercases email', () => {
    const out = createAgentSchema.parse(valid);
    expect(out.fullName).toBe('Asha Rao');
    expect(out.phone).toBe('+919876543210');
    expect(out.email).toBe('asha@example.com');
  });

  it.each([
    ['missing fullName', { ...valid, fullName: undefined }],
    ['short phone', { ...valid, phone: '123' }],
    ['letters in phone', { ...valid, phone: 'abc1234567' }],
    ['bad email', { ...valid, email: 'not-an-email' }],
    ['bad status', { ...valid, status: 'BUSY' }],
    ['bad vehicleType', { ...valid, vehicleType: 'ROCKET' }],
    ['unknown field', { ...valid, id: 'x' }],
    ['notes too long', { ...valid, notes: 'a'.repeat(1001) }],
  ])('rejects %s', (_name, body) => {
    expect(createAgentSchema.safeParse(body).success).toBe(false);
  });

  it('accepts optional fields and null vehicleType/notes', () => {
    const out = createAgentSchema.parse({
      ...valid,
      status: 'INACTIVE',
      vehicleType: null,
      notes: null,
    });
    expect(out.status).toBe('INACTIVE');
    expect(out.vehicleType).toBeNull();
  });
});

describe('updateAgentSchema', () => {
  it('allows a partial update', () => {
    expect(updateAgentSchema.parse({ status: 'INACTIVE' })).toEqual({ status: 'INACTIVE' });
  });

  it('allows clearing optional fields with null', () => {
    expect(updateAgentSchema.parse({ notes: null, vehicleType: null })).toEqual({
      notes: null,
      vehicleType: null,
    });
  });

  it('rejects an empty body', () => {
    expect(updateAgentSchema.safeParse({}).success).toBe(false);
  });

  it('rejects unknown fields and null for required fields', () => {
    expect(updateAgentSchema.safeParse({ createdAt: 'x' }).success).toBe(false);
    expect(updateAgentSchema.safeParse({ email: null }).success).toBe(false);
  });
});

describe('agentIdParamSchema', () => {
  it('requires a UUID', () => {
    expect(agentIdParamSchema.safeParse({ id: 'abc' }).success).toBe(false);
    expect(
      agentIdParamSchema.safeParse({ id: '3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b' }).success,
    ).toBe(true);
  });
});

describe('listAgentsQuerySchema', () => {
  it('applies defaults', () => {
    expect(listAgentsQuerySchema.parse({})).toEqual({ page: 1, limit: 10 });
  });

  it('coerces numbers and treats empty strings as no filter', () => {
    const out = listAgentsQuerySchema.parse({
      page: '2',
      limit: '25',
      search: '',
      status: '',
      serviceArea: ' ',
    });
    expect(out).toEqual({ page: 2, limit: 25 });
  });

  it('keeps provided filters', () => {
    const out = listAgentsQuerySchema.parse({
      search: ' asha ',
      status: 'ACTIVE',
      serviceArea: 'North',
    });
    expect(out).toMatchObject({ search: 'asha', status: 'ACTIVE', serviceArea: 'North' });
  });

  it.each([{ page: '0' }, { limit: '101' }, { limit: 'abc' }, { status: 'BUSY' }])(
    'rejects %o',
    (q) => {
      expect(listAgentsQuerySchema.safeParse(q).success).toBe(false);
    },
  );
});
