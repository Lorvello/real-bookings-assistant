
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Copy } from 'lucide-react';
import { CompactTimePicker } from './CompactTimePicker';

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
  isFirstBlock: boolean;
  openDropdowns: Record<string, boolean>;
  onUpdateTimeBlock: (dayKey: string, blockId: string, field: 'startTime' | 'endTime', value: string) => void;
  onAddTimeBlock: (dayKey: string) => void;
  onRemoveTimeBlock: (dayKey: string, blockId: string) => void;
  onCopyDay?: (dayKey: string) => void;
  onToggleDropdown: (dropdownId: string) => void;
  onCloseDropdown: (dropdownId: string) => void;
}

export const TimeBlockRow: React.FC<TimeBlockRowProps> = ({
  block,
  dayKey,
  canDelete,
  isLastBlock,
  isFirstBlock,
  openDropdowns,
  onUpdateTimeBlock,
  onAddTimeBlock,
  onRemoveTimeBlock,
  onCopyDay,
  onToggleDropdown,
  onCloseDropdown,
}) => {
  const startDropdownId = `${dayKey}-${block.id}-start`;
  const endDropdownId = `${dayKey}-${block.id}-end`;

  return (
    <div className="flex items-center gap-2">
      {/* Start time */}
      <CompactTimePicker
        value={block.startTime}
        onChange={(value) => onUpdateTimeBlock(dayKey, block.id, 'startTime', value)}
        isOpen={openDropdowns[startDropdownId] || false}
        onToggle={() => onToggleDropdown(startDropdownId)}
        onClose={() => onCloseDropdown(startDropdownId)}
      />
      
      {/* Separator */}
      <span className="text-muted-foreground text-sm">-</span>
      
      {/* End time */}
      <CompactTimePicker
        value={block.endTime}
        onChange={(value) => onUpdateTimeBlock(dayKey, block.id, 'endTime', value)}
        isOpen={openDropdowns[endDropdownId] || false}
        onToggle={() => onToggleDropdown(endDropdownId)}
        onClose={() => onCloseDropdown(endDropdownId)}
      />
      
      {/* Action buttons */}
      <div className="flex items-center gap-1 ml-2">
        {/* Add button - only on last block */}
        {isLastBlock && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAddTimeBlock(dayKey)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
            title="Add time slot"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
        
        {/* Copy button - only on first block */}
        {isFirstBlock && onCopyDay && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopyDay(dayKey)}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
            title="Copy to next day"
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
        
        {/* Delete button - only if multiple blocks */}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemoveTimeBlock(dayKey, block.id)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Remove time slot"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
