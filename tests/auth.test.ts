import { describe, expect, it } from 'vitest';
import { isAuthorizedKey, readAgentName } from '../src/auth.js';

const KEY = 'a'.repeat(64);

describe('isAuthorizedKey', () => {
  it('accepts a bearer token', () => {
    expect(isAuthorizedKey(`Bearer ${KEY}`, undefined, KEY)).toBe(true);
  });

  it('accepts the key as a query parameter', () => {
    expect(isAuthorizedKey(undefined, KEY, KEY)).toBe(true);
  });

  it('is case-insensitive on the bearer scheme', () => {
    expect(isAuthorizedKey(`bearer ${KEY}`, undefined, KEY)).toBe(true);
  });

  it('rejects a missing key', () => {
    expect(isAuthorizedKey(undefined, undefined, KEY)).toBe(false);
  });

  it('rejects a wrong key', () => {
    expect(isAuthorizedKey(`Bearer ${'b'.repeat(64)}`, undefined, KEY)).toBe(false);
  });

  it('rejects a key of a different length', () => {
    expect(isAuthorizedKey('Bearer short', undefined, KEY)).toBe(false);
  });

  it('prefers the header when both are present', () => {
    expect(isAuthorizedKey(`Bearer ${KEY}`, 'wrong', KEY)).toBe(true);
  });
});

describe('readAgentName', () => {
  it('falls back to unknown when the header is absent', () => {
    expect(readAgentName(new Request('http://test.local/mcp'))).toBe('unknown');
  });

  it('reads the agent name from the header', () => {
    const request = new Request('http://test.local/mcp', {
      headers: { 'X-Agent-Name': 'cursor-cecile' },
    });
    expect(readAgentName(request)).toBe('cursor-cecile');
  });

  it('truncates an oversized agent name', () => {
    const request = new Request('http://test.local/mcp', {
      headers: { 'X-Agent-Name': 'x'.repeat(200) },
    });
    expect(readAgentName(request)).toHaveLength(64);
  });
});
