import { describe, expect, it, vi } from 'vitest';
import {
  getOrCreateTeamInvitationRequestId,
  teamInvitationRequestKey,
} from './teamInvitationRequest';

const input = {
  calendarId: 'calendar-1',
  email: ' Invitee@Example.com ',
  fullName: ' Alex ',
  role: 'viewer' as const,
};

describe('team invitation request identity', () => {
  it('normalizes email and whitespace into one stable action key', () => {
    expect(teamInvitationRequestKey(input)).toBe(
      teamInvitationRequestKey({
        ...input,
        email: 'invitee@example.com',
        fullName: 'Alex',
      }),
    );
  });

  it('reuses one request ID until the successful action clears it', () => {
    const pending = new Map<string, string>();
    const createId = vi
      .fn()
      .mockReturnValueOnce('request-1')
      .mockReturnValueOnce('request-2');

    const first = getOrCreateTeamInvitationRequestId(pending, input, createId);
    const retry = getOrCreateTeamInvitationRequestId(pending, input, createId);
    expect(retry).toEqual(first);
    expect(createId).toHaveBeenCalledTimes(1);

    pending.delete(first.key);
    expect(
      getOrCreateTeamInvitationRequestId(pending, input, createId).requestId,
    ).toBe('request-2');
  });
});
