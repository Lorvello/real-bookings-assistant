import React from 'react';
import { UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SettingsField } from '../SettingsField';

interface CalendarOption {
  id: string;
  name: string;
  is_default?: boolean;
}

interface AddTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  role: 'editor' | 'viewer';
  calendarId: string;
  calendars: CalendarOption[];
  submitting: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onRoleChange: (value: 'editor' | 'viewer') => void;
  onCalendarChange: (value: string) => void;
  onSubmit: () => void;
}

/**
 * Pure controlled "Add team member" dialog (PREMIUM_DESIGN_PLAYBOOK §4 Dialog).
 * Header gets the shared icon-tile + sentence-case title treatment used across the
 * Settings dialogs (R14 services); raw <Label>+<input> become <SettingsField> +
 * premium <Input>/<Select>. All state lives in the orchestrator so the harness can
 * mount it open with mock values.
 */
export function AddTeamMemberDialog({
  open,
  onOpenChange,
  name,
  email,
  role,
  calendarId,
  calendars,
  submitting,
  onNameChange,
  onEmailChange,
  onRoleChange,
  onCalendarChange,
  onSubmit,
}: AddTeamMemberDialogProps) {
  const resolvedCalendarId =
    calendarId || (calendars.find((c) => c.is_default) || calendars[0])?.id || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader className="text-left">
          <div className="flex items-start gap-3 text-left">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/[0.10] text-accent-foreground">
              <UserPlus className="h-[18px] w-[18px]" />
            </span>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-semibold tracking-[-0.015em]">
                Invite a team member
              </DialogTitle>
              <DialogDescription>
                They get an email invite to join the calendar you choose.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SettingsField label="Full name" htmlFor="invite-name">
              <Input
                id="invite-name"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Jane Doe"
                autoComplete="off"
                required
              />
            </SettingsField>

            <SettingsField label="Email address" htmlFor="invite-email">
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="jane@example.com"
                autoComplete="off"
                required
              />
            </SettingsField>
          </div>

          <SettingsField
            label="Calendar"
            htmlFor="invite-calendar"
            description="The calendar this member can access."
          >
            <Select value={resolvedCalendarId} onValueChange={onCalendarChange}>
              <SelectTrigger id="invite-calendar">
                <SelectValue placeholder="Select a calendar" />
              </SelectTrigger>
              <SelectContent className="glass">
                {calendars.map((cal) => (
                  <SelectItem key={cal.id} value={cal.id}>
                    {cal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>

          <SettingsField
            label="Role"
            htmlFor="invite-role"
            description={
              role === 'editor'
                ? 'Editors can manage bookings and settings.'
                : 'Viewers can only view bookings.'
            }
          >
            <Select value={role} onValueChange={(v: 'editor' | 'viewer') => onRoleChange(v)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass">
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </SettingsField>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={onSubmit} loading={submitting} disabled={submitting || !name.trim() || !email.trim()}>
              Send invite
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
