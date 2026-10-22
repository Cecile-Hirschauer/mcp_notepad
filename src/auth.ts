const AGENT_NAME_HEADER = 'x-agent-name';
const UNKNOWN_AGENT = 'unknown';

export function readAgentName(request: Request | undefined): string {
  const raw = request?.headers.get(AGENT_NAME_HEADER)?.trim();
  if (raw === undefined || raw === '') {
    return UNKNOWN_AGENT;
  }
  return raw.slice(0, 64);
}
