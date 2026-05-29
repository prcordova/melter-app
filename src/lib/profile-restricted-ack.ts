/** Espelha `sessionStorage` do web — ack válido enquanto o app estiver aberto. */
const ackedUsernames = new Set<string>();

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function hasProfileRestrictedAck(username: string): boolean {
  return ackedUsernames.has(normalizeUsername(username));
}

export function markProfileRestrictedAck(username: string): void {
  ackedUsernames.add(normalizeUsername(username));
}

export function clearProfileRestrictedAck(username: string): void {
  ackedUsernames.delete(normalizeUsername(username));
}
