import React from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Crown,
  User,
  Eye,
  Lock,
  Check,
  X,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsSection } from '../SettingsSection';

export interface TeamUser {
  id: string;
  user?: { full_name?: string; email?: string };
  role: string;
  calendar?: { name?: string };
  type: 'member' | 'invitation';
  status?: string;
  expires_at?: string;
}

interface MemberActionHandlers {
  onRoleChange: (memberId: string, role: 'editor' | 'viewer') => void;
  onRemove: (memberId: string) => void;
  onResend: (invitationId: string) => void;
  onCancelInvite: (invitationId: string) => void;
}

interface TeamMembersSectionProps extends MemberActionHandlers {
  users: TeamUser[];
  loading: boolean;
  /** Pro-gated: when true the table is hidden behind an upgrade panel. */
  locked: boolean;
  /** No calendars yet → can't invite anyone. */
  canAddMember: boolean;
  onAddMember: () => void;
  onUnlock: () => void;
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string }> = {
    owner: { icon: <Crown className="h-3.5 w-3.5 text-gold-foreground" />, label: 'Owner' },
    editor: { icon: <User className="h-3.5 w-3.5 text-accent-foreground" />, label: 'Editor' },
    viewer: { icon: <Eye className="h-3.5 w-3.5 text-muted-foreground" />, label: 'Viewer' },
  };
  const r = map[role] ?? { icon: <User className="h-3.5 w-3.5 text-muted-foreground" />, label: 'Unknown' };
  return (
    <span className="inline-flex items-center gap-2 text-sm text-foreground">
      {r.icon}
      {r.label}
    </span>
  );
}

function StatusBadge({ user }: { user: TeamUser }) {
  if (user.type === 'invitation') {
    switch (user.status) {
      case 'pending':
        return (
          <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Invited
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive-foreground">
            <X className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="border-border bg-background/20 text-muted-foreground">
            <X className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  }
  return (
    <Badge variant="outline" className="border-success/40 bg-success/10 text-success-foreground">
      <Check className="mr-1 h-3 w-3" />
      Active
    </Badge>
  );
}

/** The right-aligned action cluster, shared between the desktop table and the
 *  mobile cards so role/remove/resend logic lives in exactly one place. */
function MemberActions({
  user,
  align,
  onRoleChange,
  onRemove,
  onResend,
  onCancelInvite,
}: { user: TeamUser; align?: 'end' } & MemberActionHandlers) {
  const who = user.user?.full_name || user.user?.email || 'member';
  const justify = align === 'end' ? 'justify-end' : '';

  if (user.role === 'owner') {
    return <span className="text-xs text-subtle-foreground">—</span>;
  }

  if (user.type === 'invitation') {
    return (
      <div className={`flex items-center gap-1.5 ${justify}`}>
        {user.status === 'pending' && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onResend(user.id)}
              aria-label="Resend invitation"
              title="Resend invitation"
              className="h-8 w-8 min-w-11 md:min-w-0 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCancelInvite(user.id)}
              aria-label="Cancel invitation"
              title="Cancel invitation"
              className="h-8 w-8 min-w-11 md:min-w-0 text-muted-foreground hover:text-destructive-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
        {user.status === 'expired' && (
          <Button variant="outline" size="sm" onClick={() => onResend(user.id)} className="h-8">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Resend
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${justify}`}>
      <Select value={user.role} onValueChange={(v: 'editor' | 'viewer') => onRoleChange(user.id, v)}>
        <SelectTrigger aria-label={`Role for ${who}`} className="h-8 w-[104px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="glass">
          <SelectItem value="viewer">Viewer</SelectItem>
          <SelectItem value="editor">Editor</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(user.id)}
        aria-label={`Remove ${who}`}
        title="Remove member"
        className="h-8 w-8 min-w-11 md:min-w-0 text-muted-foreground hover:text-destructive-foreground"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function LockedPanel({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/25 bg-gold/[0.10] text-gold-foreground">
        <Lock className="h-6 w-6" />
      </div>
      <h3 className="mb-1.5 flex items-center gap-2 text-base font-semibold text-foreground">
        Team members
        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold-foreground">Pro</span>
      </h3>
      <p className="mb-6 max-w-sm text-sm leading-6 text-muted-foreground">
        Invite colleagues and give them their own access to your calendars. Available on the Pro plan.
      </p>
      {/* The one premium-upsell moment wears the gold language (lock tile + Pro pill),
          not the emerald used by every other primary action. */}
      <Button
        variant="outline"
        onClick={onUnlock}
        className="border-gold/30 bg-gold/15 text-gold-foreground hover:bg-gold/25 hover:text-gold-foreground"
      >
        Upgrade to Pro
      </Button>
    </div>
  );
}

function EmptyPanel({ canAddMember, onAddMember }: { canAddMember: boolean; onAddMember: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.10] text-accent-foreground">
        <Users className="h-6 w-6" />
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-foreground">No team members yet</h3>
      <p className="mb-6 max-w-sm text-sm leading-6 text-muted-foreground">
        {canAddMember
          ? 'Invite your first colleague to share access to your calendars.'
          : 'Create a calendar first, then you can invite colleagues to it.'}
      </p>
      <Button onClick={onAddMember} disabled={!canAddMember}>
        <UserPlus className="mr-2 h-4 w-4" />
        Invite a team member
      </Button>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-px">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4 md:px-6">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/[0.05]" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-40 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-3 w-52 animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

function MemberCard({ user, ...handlers }: { user: TeamUser } & MemberActionHandlers) {
  return (
    <li className="space-y-3 px-5 py-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{user.user?.full_name || 'Unknown user'}</p>
        <p className="truncate text-sm text-muted-foreground">{user.user?.email}</p>
        {user.type === 'invitation' && user.status === 'pending' && user.expires_at && (
          <p className="mt-1 text-xs text-subtle-foreground">
            Expires {new Date(user.expires_at).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <RoleBadge role={user.role} />
        <StatusBadge user={user} />
        <span className="text-sm text-muted-foreground">
          {user.role === 'owner' ? 'All calendars' : user.calendar?.name || 'Unknown'}
        </span>
      </div>
      {user.role !== 'owner' && (
        <div className="pt-0.5">
          <MemberActions user={user} {...handlers} />
        </div>
      )}
    </li>
  );
}

/**
 * Pure presentational "Team members" section. Owner-aware list with premium row
 * hover, status badges and right-aligned actions; loading skeleton, empty and
 * Pro-locked states all in-section. Responsive: a real table on md+, stacked cards
 * on mobile (so Status/Calendar/Actions never clip). No hooks — the orchestrator
 * passes the resolved user list + handlers, so the no-auth harness mounts it directly.
 */
export function TeamMembersSection({
  users,
  loading,
  locked,
  canAddMember,
  onAddMember,
  onUnlock,
  onRoleChange,
  onRemove,
  onResend,
  onCancelInvite,
}: TeamMembersSectionProps) {
  const handlers: MemberActionHandlers = { onRoleChange, onRemove, onResend, onCancelInvite };

  const body = () => {
    if (locked) return <LockedPanel onUnlock={onUnlock} />;
    if (loading) return <LoadingRows />;
    if (users.length === 0) return <EmptyPanel canAddMember={canAddMember} onAddMember={onAddMember} />;

    return (
      <>
        {/* Mobile: stacked cards (the table would clip its right columns) */}
        <ul className="divide-y divide-white/[0.05] md:hidden">
          {users.map((user) => (
            <MemberCard key={user.id} user={user} {...handlers} />
          ))}
        </ul>

        {/* Desktop: full table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.05] hover:bg-transparent">
                <TableHead className="pl-6 text-muted-foreground">Member</TableHead>
                <TableHead className="text-muted-foreground">Role</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Calendar</TableHead>
                <TableHead className="pr-6 text-right text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className="border-white/[0.05] transition-colors hover:bg-white/[0.02]">
                  <TableCell className="pl-6">
                    <p className="font-medium text-foreground">{user.user?.full_name || 'Unknown user'}</p>
                    <p className="text-sm text-muted-foreground">{user.user?.email}</p>
                    {user.type === 'invitation' && user.status === 'pending' && user.expires_at && (
                      <p className="mt-1 text-xs text-subtle-foreground">
                        Expires {new Date(user.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge user={user} />
                  </TableCell>
                  <TableCell>
                    {user.role === 'owner' ? (
                      <span className="text-sm text-muted-foreground">All calendars</span>
                    ) : (
                      <span className="text-sm text-foreground">{user.calendar?.name || 'Unknown'}</span>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <MemberActions user={user} align="end" {...handlers} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  return (
    <SettingsSection
      flush
      icon={Users}
      title="Team members"
      description="People who can access your calendars, and the invites you've sent."
      action={
        !locked ? (
          <Button onClick={onAddMember} disabled={!canAddMember}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add member
          </Button>
        ) : undefined
      }
    >
      {body()}
    </SettingsSection>
  );
}
