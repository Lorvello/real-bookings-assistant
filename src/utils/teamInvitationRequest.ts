export interface TeamInvitationRequestIdentity {
  calendarId: string;
  email: string;
  fullName: string;
  role: 'editor' | 'viewer';
}

export function teamInvitationRequestKey(
  input: TeamInvitationRequestIdentity,
): string {
  return JSON.stringify([
    input.calendarId,
    input.email.trim().toLowerCase(),
    input.fullName.trim(),
    input.role,
  ]);
}

export function getOrCreateTeamInvitationRequestId(
  pending: Map<string, string>,
  input: TeamInvitationRequestIdentity,
  createId: () => string = () => crypto.randomUUID(),
): { key: string; requestId: string } {
  const key = teamInvitationRequestKey(input);
  const existing = pending.get(key);
  if (existing) return { key, requestId: existing };

  const requestId = createId();
  pending.set(key, requestId);
  return { key, requestId };
}
