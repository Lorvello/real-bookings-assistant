
import React from 'react';
import { useTranslation } from 'react-i18next';
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
  dayLabel: string;
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
  dayLabel,
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
  const { t } = useTranslation('appPages');
  const startDropdownId = `${dayKey}-${block.id}-start`;
  const endDropdownId = `${dayKey}-${block.id}-end`;

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      <div className="flex items-center gap-1 ml-1 sm:ml-2">
        {/* Add button - only on last block */}
        {isLastBlock && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAddTimeBlock(dayKey)}
            className="h-8 w-8 min-w-11 md:min-w-0 text-muted-foreground hover:text-foreground hover:bg-accent"
            title={t('availPage.timeBlockRow.addTitle', 'Add time slot')}
            aria-label={t('availPage.timeBlockRow.addAria', 'Add another time slot for {{day}}', { day: dayLabel })}
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
            className="h-8 w-8 min-w-11 md:min-w-0 text-muted-foreground hover:text-foreground hover:bg-accent"
            title={t('availPage.timeBlockRow.copyTitle', 'Copy to next day')}
            aria-label={t('availPage.timeBlockRow.copyAria', 'Copy {{day}} hours to the next day', { day: dayLabel })}
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
            className="h-8 w-8 min-w-11 md:min-w-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title={t('availPage.timeBlockRow.removeTitle', 'Remove time slot')}
            aria-label={t('availPage.timeBlockRow.removeAria', 'Remove this time slot for {{day}}', { day: dayLabel })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
