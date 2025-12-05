import React from 'react';
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
  const { members, loading } = useCalendarMembers(calendarId);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">Team Member Assignment</Label>
        <p className="text-sm text-muted-foreground">Loading team members...</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">Team Member Assignment</Label>
        <div className="rounded-lg border border-dashed p-4 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No team members yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Invite team members in Settings to assign them to services
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
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Team Member Assignment (Optional)</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Select which team members can perform this service
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1 italic">
            Leave empty to make this service available to all team members. This feature is only relevant for Professional or Enterprise plans.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled || allSelected}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            Select All
          </button>
          <span className="text-xs text-muted-foreground">|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            disabled={disabled || selectedMemberIds.length === 0}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
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
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
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
          {selectedMemberIds.length} member{selectedMemberIds.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
};
