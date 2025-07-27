import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProfessionalTimePicker } from '../ProfessionalTimePicker';
import type { TimeBlock } from '@/types/availability';

interface TimeBlockEditorProps {
  dayKey: string;
  timeBlocks: TimeBlock[];
  onUpdateTimeBlock: (blockId: string, field: 'startTime' | 'endTime', value: string) => void;
  onAddTimeBlock: () => void;
  onRemoveTimeBlock: (blockId: string) => void;
  maxBlocks?: number;
}

export const TimeBlockEditor: React.FC<TimeBlockEditorProps> = ({
  dayKey,
  timeBlocks,
  onUpdateTimeBlock,
  onAddTimeBlock,
  onRemoveTimeBlock,
  maxBlocks = 3,
}) => {
  const [selectedTimeBlock, setSelectedTimeBlock] = React.useState<{
    blockId: string;
    field: 'startTime' | 'endTime';
  } | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Working Hours</h4>
        {timeBlocks.length < maxBlocks && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddTimeBlock}
            className="text-primary border-primary/20 hover:bg-primary/10"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Block
          </Button>
        )}
      </div>

      {timeBlocks.map((block, index) => (
        <Card key={block.id} className="border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">
                Time Block {index + 1}
              </span>
              {timeBlocks.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveTimeBlock(block.id)}
                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 h-8 w-8 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Start Time
                </label>
                <ProfessionalTimePicker
                  value={block.startTime}
                  onChange={(value) => onUpdateTimeBlock(block.id, 'startTime', value)}
                  isOpen={
                    selectedTimeBlock?.blockId === block.id &&
                    selectedTimeBlock?.field === 'startTime'
                  }
                  onToggle={() =>
                    setSelectedTimeBlock(
                      selectedTimeBlock?.blockId === block.id &&
                      selectedTimeBlock?.field === 'startTime'
                        ? null
                        : { blockId: block.id, field: 'startTime' }
                    )
                  }
                  onClose={() => setSelectedTimeBlock(null)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  End Time
                </label>
                <ProfessionalTimePicker
                  value={block.endTime}
                  onChange={(value) => onUpdateTimeBlock(block.id, 'endTime', value)}
                  isOpen={
                    selectedTimeBlock?.blockId === block.id &&
                    selectedTimeBlock?.field === 'endTime'
                  }
                  onToggle={() =>
                    setSelectedTimeBlock(
                      selectedTimeBlock?.blockId === block.id &&
                      selectedTimeBlock?.field === 'endTime'
                        ? null
                        : { blockId: block.id, field: 'endTime' }
                    )
                  }
                  onClose={() => setSelectedTimeBlock(null)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};