import { timingSafeEqual } from 'node:crypto';

const AGENT_NAME_HEADER = 'x-agent-name';
const UNKNOWN_AGENT = 'unknown';

export function readAgentName(request: Request | undefined): string {
  const raw = request?.headers.get(AGENT_NAME_HEADER)?.trim();
  if (raw === undefined || raw === '') {
    return UNKNOWN_AGENT;
  }
  return raw.slice(0, 64);
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

/** Core check, independent of any request representation. */
export function isAuthorizedKey(
  authorizationHeader: string | undefined,
  keyParam: string | undefined,
  expectedKey: string,
): boolean {
  let presented: string | undefined;

  if (authorizationHeader?.toLowerCase().startsWith('bearer ') === true) {
    presented = authorizationHeader.slice(7).trim();
  } else if (keyParam !== undefined && keyParam !== '') {
    presented = keyParam;
  }

  if (presented === undefined || presented === '') {
    return false;
  }
  return safeEqual(presented, expectedKey);
}

/** Read-only page access: the view key only, never the MCP key. */
export function isViewAuthorized(keyParam: string | undefined, expectedViewKey: string): boolean {
  if (keyParam === undefined || keyParam === '') {
    return false;
  }
  return safeEqual(keyParam, expectedViewKey);
}

/** Web-standard Request variant (used on Vercel). */
export function isAuthorized(request: Request, expectedKey: string): boolean {
  return isAuthorizedKey(
    request.headers.get('authorization') ?? undefined,
    new URL(request.url).searchParams.get('key') ?? undefined,
    expectedKey,
  );
}
