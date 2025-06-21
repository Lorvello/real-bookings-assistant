
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { TimeDropdown } from './TimeDropdown';

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
    <div className="flex items-center justify-between w-full">
      {/* Time dropdowns - left side */}
      <div className="flex items-center space-x-4">
        <TimeDropdown
          value={block.startTime}
          onChange={(value) => onUpdateTimeBlock(dayKey, block.id, 'startTime', value)}
          isOpen={openDropdowns[startDropdownId] || false}
          onToggle={() => onToggleDropdown(startDropdownId)}
          onClose={() => onCloseDropdown(startDropdownId)}
        />
        <span className="text-gray-400 text-lg">-</span>
        <TimeDropdown
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
            className="bg-gray-800 border-gray-600 text-red-400 hover:bg-red-900/20 hover:border-red-500 p-2 h-8 w-8"
            title="Tijdslot verwijderen"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}

        {/* Add button - only show on the last time block */}
        {isLastBlock && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddTimeBlock(dayKey)}
            className="bg-green-800 border-green-600 text-green-400 hover:bg-green-900/20 hover:border-green-500 p-2 h-8 w-8"
            title="Nieuw tijdslot toevoegen"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};
