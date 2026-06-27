import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCalendarMembers } from '@/hooks/useCalendarMembers';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';

interface TeamMemberSelectorProps {
  calendarId: string;
  selectedMemberIds: string[];
  onSelectionChange: (memberIds: string[]) => void;
  disabled?: boolean;
}

export const TeamMemberSelector: React.FC<TeamMemberSelectorProps> = ({
  calendarId,
  selectedMemberIds,
  onSelectionChange,
  disabled = false
}) => {
  const { t } = useTranslation('settings');
  const { members, loading } = useCalendarMembers(calendarId);

  if (loading) {
    return (
      <div className="space-y-2">
        <span className="text-[13px] font-medium leading-[18px] text-foreground">{t('settings.services.teamMembers.label', 'Team members')}</span>
        <p className="text-xs leading-5 text-muted-foreground">{t('settings.services.teamMembers.loading', 'Loading team members…')}</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="space-y-2">
        <span className="text-[13px] font-medium leading-[18px] text-foreground">{t('settings.services.teamMembers.label', 'Team members')}</span>
        <div className="rounded-lg border border-dashed border-white/[0.12] bg-muted/30 p-4 text-center">
          <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-foreground">{t('settings.services.teamMembers.emptyHeading', 'No team members yet')}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t('settings.services.teamMembers.emptyDescription', 'Invite team members in Settings to assign them to services.')}
          </p>
        </div>
      </div>
    );
  }

  const handleSelectAll = () => {
    const allMemberIds = members.map(m => m.user_id);
    onSelectionChange(allMemberIds);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  const toggleMember = (userId: string) => {
    if (selectedMemberIds.includes(userId)) {
      onSelectionChange(selectedMemberIds.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedMemberIds, userId]);
    }
  };

  const allSelected = members.length > 0 && selectedMemberIds.length === members.length;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-[13px] font-medium leading-[18px] text-foreground">
            {t('settings.services.teamMembers.fieldLabel', 'Team members {{optionalLabel}}', { optionalLabel: '' })}
            <span className="text-xs font-normal text-subtle-foreground">{t('settings.common.optional', 'Optional')}</span>
          </span>
          <p className="text-xs leading-5 text-muted-foreground">
            {t('settings.services.teamMembers.description', 'Select which team members can perform this service. Leave empty to make it available to everyone. Only relevant on Professional or Enterprise plans.')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled || allSelected}
            className="rounded text-xs text-accent-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            {t('settings.services.teamMembers.selectAllButton', 'Select all')}
          </button>
          <span className="text-xs text-subtle-foreground">|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            disabled={disabled || selectedMemberIds.length === 0}
            className="rounded text-xs text-accent-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            {t('settings.services.teamMembers.deselectAllButton', 'Deselect all')}
          </button>
        </div>
      </div>

      <div className="space-y-1 rounded-lg border border-white/[0.08] bg-muted/30 p-2">
        {members.map((member) => {
          const isSelected = selectedMemberIds.includes(member.user_id);
          const isViewer = member.role === 'viewer';
          const initials = member.user?.full_name
            ?.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase() || '?';

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/70"
            >
              <Checkbox
                id={`member-${member.id}`}
                checked={isSelected}
                onCheckedChange={() => toggleMember(member.user_id)}
                disabled={disabled}
              />
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <Label
                  htmlFor={`member-${member.id}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {member.user?.full_name || 'Unknown'}
                </Label>
                <p className="text-xs text-muted-foreground truncate">
                  {member.user?.email || ''}
                </p>
              </div>
              <Badge variant={member.role === 'editor' ? 'default' : 'secondary'} className="text-xs">
                {member.role}
              </Badge>
            </div>
          );
        })}
      </div>

      {selectedMemberIds.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('settings.services.teamMembers.countSelected', '{{count}} member{{plural}} selected', { count: selectedMemberIds.length, plural: selectedMemberIds.length !== 1 ? 's' : '' })}
        </p>
      )}
    </div>
  );
};
