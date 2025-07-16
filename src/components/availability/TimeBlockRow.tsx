
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { ProfessionalTimePicker } from './ProfessionalTimePicker';

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
}

interface TimeBlockRowProps {
  block: TimeBlock;
  dayKey: string;
  canDelete: boolean;
  isLastBlock: boolean;
  openDropdowns: Record<string, boolean>;
  onUpdateTimeBlock: (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => void;
  onAddTimeBlock: (dayKey: string) => void;
  onRemoveTimeBlock: (dayKey: string, blockId: string) => void;
  onToggleDropdown: (dropdownId: string) => void;
  onCloseDropdown: (dropdownId: string) => void;
}

export const TimeBlockRow: React.FC<TimeBlockRowProps> = ({
  block,
  dayKey,
  canDelete,
  isLastBlock,
  openDropdowns,
  onUpdateTimeBlock,
  onAddTimeBlock,
  onRemoveTimeBlock,
  onToggleDropdown,
  onCloseDropdown,
}) => {
  const startDropdownId = `${dayKey}-${block.id}-start`;
  const endDropdownId = `${dayKey}-${block.id}-end`;

  return (
    <div className="flex items-center justify-between w-full py-2 px-3 bg-card/60 backdrop-blur-sm border border-border/40 rounded-xl hover:bg-card/80 hover:border-border/60 transition-all duration-200">
      {/* Time pickers - left side */}
      <div className="flex items-center space-x-3">
        <ProfessionalTimePicker
          value={block.startTime}
          onChange={(value) => onUpdateTimeBlock(dayKey, block.id, 'startTime', value)}
          isOpen={openDropdowns[startDropdownId] || false}
          onToggle={() => onToggleDropdown(startDropdownId)}
          onClose={() => onCloseDropdown(startDropdownId)}
        />
        <span className="text-muted-foreground text-sm font-medium">→</span>
        <ProfessionalTimePicker
          value={block.endTime}
          onChange={(value) => onUpdateTimeBlock(dayKey, block.id, 'endTime', value)}
          isOpen={openDropdowns[endDropdownId] || false}
          onToggle={() => onToggleDropdown(endDropdownId)}
          onClose={() => onCloseDropdown(endDropdownId)}
        />
      </div>

      {/* Action buttons - right side */}
      <div className="flex items-center space-x-2">
        {/* Delete button - only show if more than one time block */}
        {canDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemoveTimeBlock(dayKey, block.id)}
            className="bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 hover:border-destructive/50 p-2 h-8 w-8 transition-all duration-200"
            title="Remove time slot"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Add button - only show on the last time block */}
        {isLastBlock && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddTimeBlock(dayKey)}
            className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 p-2 h-8 w-8 transition-all duration-200"
            title="Add new time slot"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};
