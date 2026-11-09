/**
 * Turns the CORS_ORIGIN env value into a list of allowed origins.
 * Accepts one origin or a comma-separated list, and drops trailing slashes
 * because browsers send origins without them ("https://app.vercel.app", never "…app/").
 */
export function parseOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0);
}
