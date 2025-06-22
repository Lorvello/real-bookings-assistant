
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Clock } from 'lucide-react';
import { TimeBlockItem } from './TimeBlockItem';

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface TimeBlockListProps {
  blocks: TimeBlock[];
  onUpdateBlock: (blockId: string, updates: Partial<TimeBlock>) => void;
  onRemoveBlock: (blockId: string) => void;
  onAddBlock: () => void;
  validateTimeBlock: (block: TimeBlock) => boolean;
}

export function TimeBlockList({
  blocks,
  onUpdateBlock,
  onRemoveBlock,
  onAddBlock,
  validateTimeBlock
}: TimeBlockListProps) {
  return (
    <div className="space-y-4">
      {/* Time Blocks List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {blocks.map((block, index) => {
          const isValid = validateTimeBlock(block);
          
          return (
            <TimeBlockItem
              key={block.id}
              block={block}
              index={index}
              isValid={isValid}
              onUpdate={onUpdateBlock}
              onRemove={onRemoveBlock}
            />
          );
        })}

        {blocks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Geen tijdblokken gedefinieerd</p>
            <p className="text-sm">Voeg een tijdblok toe om te beginnen</p>
          </div>
        )}
      </div>

      {/* Add Block Button */}
      <Button
        variant="outline"
        onClick={onAddBlock}
        className="w-full border-border border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" />
        Tijdblok Toevoegen
      </Button>
    </div>
  );
}
