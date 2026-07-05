// Regression test for BUG-STATUSBADGE-IGNORES-ACCEPTED-AT (IUX T2 round, R104 item 3):
// StatusBadge used to show "Active" for every `type: 'member'` row unconditionally,
// never checking `calendar_members.accepted_at`, so a genuinely pending (not yet
// accepted) membership was misreported to the account owner as already active.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n';
import { TeamMembersSection, type TeamUser } from '@/components/settings/users/TeamMembersSection';

function renderSection(users: TeamUser[]) {
  return render(
    <I18nextProvider i18n={i18n}>
      <TeamMembersSection
        users={users}
        loading={false}
        locked={false}
        canAddMember={true}
        onAddMember={() => {}}
        onUnlock={() => {}}
        onRoleChange={() => {}}
        onRemove={() => {}}
        onResend={() => {}}
        onCancelInvite={() => {}}
      />
    </I18nextProvider>
  );
}

describe('StatusBadge accepted_at gate (BUG-STATUSBADGE-IGNORES-ACCEPTED-AT fix)', () => {
  it('shows Pending for a real calendar_members row with accepted_at = null', () => {
    const users: TeamUser[] = [
      {
        id: 'owner',
        user: { full_name: 'Owner', email: 'owner@test.dev' },
        role: 'owner',
        calendar: { name: 'All Calendars' },
        type: 'member',
        accepted_at: new Date().toISOString(),
      },
      {
        id: 'member-pending-1',
        user: { full_name: 'Jamie Smith', email: 'jamie@test.dev' },
        role: 'viewer',
        calendar: { name: 'Main Calendar' },
        type: 'member',
        accepted_at: null,
      },
    ];
    renderSection(users);
    // Component renders both the mobile-card list AND the desktop table at once
    // (CSS, not conditional mount, toggles which is visible), so every real row
    // appears twice in the DOM. Assert on that doubled count rather than 1/2.
    expect(screen.getAllByText(/Pending/i).length).toBe(2);
    // Must NOT render "Active" for the pending row: only the owner row is Active.
    expect(screen.getAllByText(/^Active$/).length).toBe(2);
  });

  it('shows Active for a real calendar_members row with a real accepted_at', () => {
    const users: TeamUser[] = [
      {
        id: 'owner',
        user: { full_name: 'Owner', email: 'owner@test.dev' },
        role: 'owner',
        calendar: { name: 'All Calendars' },
        type: 'member',
        accepted_at: new Date().toISOString(),
      },
      {
        id: 'member-accepted-1',
        user: { full_name: 'Accepted Colleague', email: 'accepted@test.dev' },
        role: 'editor',
        calendar: { name: 'Main Calendar' },
        type: 'member',
        accepted_at: '2026-06-20T10:00:00Z',
      },
    ];
    renderSection(users);
    expect(screen.getAllByText(/^Active$/).length).toBe(4);
    expect(screen.queryByText(/Pending/i)).toBeNull();
  });
});
