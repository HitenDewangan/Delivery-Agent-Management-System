import { parseOrigins } from '../src/utils/origins';

describe('parseOrigins', () => {
  it('parses a single origin', () => {
    expect(parseOrigins('http://localhost:3000')).toEqual(['http://localhost:3000']);
  });

  it('splits a comma-separated list and trims whitespace', () => {
    expect(parseOrigins(' https://a.vercel.app , https://b.example.com ')).toEqual([
      'https://a.vercel.app',
      'https://b.example.com',
    ]);
  });

  it('removes trailing slashes, which browsers never send', () => {
    expect(parseOrigins('https://a.vercel.app/')).toEqual(['https://a.vercel.app']);
  });

  it('ignores empty entries', () => {
    expect(parseOrigins('https://a.vercel.app,,')).toEqual(['https://a.vercel.app']);
    expect(parseOrigins('')).toEqual([]);
  });
});
