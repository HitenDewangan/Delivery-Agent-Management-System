import { translatePrismaError } from '../src/utils/prisma-errors';
import { ConflictError, NotFoundError } from '../src/utils/errors';

describe('translatePrismaError', () => {
  it('maps P2002 to ConflictError and names the field', () => {
    const out = translatePrismaError({ code: 'P2002', meta: { target: ['email'] } });
    expect(out).toBeInstanceOf(ConflictError);
    expect((out as ConflictError).message).toContain('email');
  });

  it('finds the field in nested adapter-style meta', () => {
    const meta = { driverAdapterError: { cause: { constraint: { fields: ['phone'] } } } };
    const out = translatePrismaError({ code: 'P2002', meta }) as ConflictError;
    expect(out.message).toContain('phone');
  });

  it('falls back to a generic conflict message', () => {
    const out = translatePrismaError({ code: 'P2002' }) as ConflictError;
    expect(out.statusCode).toBe(409);
    expect(out.message).toContain('phone or email');
  });

  it('maps P2025 to NotFoundError', () => {
    expect(translatePrismaError({ code: 'P2025' })).toBeInstanceOf(NotFoundError);
  });

  it('passes unknown errors through untouched', () => {
    const err = new Error('boom');
    expect(translatePrismaError(err)).toBe(err);
    const other = { code: 'P1001' };
    expect(translatePrismaError(other)).toBe(other);
  });
});
