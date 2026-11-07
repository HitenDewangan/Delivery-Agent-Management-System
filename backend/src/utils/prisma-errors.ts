import { ConflictError, NotFoundError } from './errors';

interface PrismaLikeError {
  code: string;
  meta?: unknown;
}

function isPrismaLikeError(err: unknown): err is PrismaLikeError {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { code?: unknown }).code === 'string' &&
    /^P\d{4}$/.test((err as { code: string }).code)
  );
}

// The shape of `meta` differs between Prisma engines and driver adapters, so
// instead of relying on one exact structure we look for the column names in it.
function conflictingFields(meta: unknown): string[] {
  let text = '';
  try {
    text = JSON.stringify(meta ?? {});
  } catch {
    return [];
  }
  return ['phone', 'email'].filter((field) => text.includes(field));
}

/** Converts known Prisma errors to AppErrors; anything else is returned unchanged. */
export function translatePrismaError(err: unknown, resource = 'Agent'): unknown {
  if (!isPrismaLikeError(err)) return err;

  if (err.code === 'P2002') {
    const fields = conflictingFields(err.meta);
    const message =
      fields.length > 0
        ? `An agent with this ${fields.join(' / ')} already exists`
        : 'An agent with this phone or email already exists';
    return new ConflictError(message, { fields });
  }

  if (err.code === 'P2025') {
    return new NotFoundError(`${resource} not found`);
  }

  return err;
}
