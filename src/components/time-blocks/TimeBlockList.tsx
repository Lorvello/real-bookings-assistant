
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
          <div className="text-center py-12 bg-card/50 rounded-3xl border border-border/40">
            <div className="p-4 bg-primary/10 rounded-2xl w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Clock className="h-8 w-8 text-primary opacity-50" />
            </div>
            <p className="text-foreground font-medium mb-2">Geen tijdblokken gedefinieerd</p>
            <p className="text-sm text-muted-foreground">Voeg een tijdblok toe om te beginnen</p>
          </div>
        )}
      </div>

      {/* Add Block Button */}
      <Button
        variant="outline"
        onClick={onAddBlock}
        className="w-full border-border/60 border-dashed rounded-2xl hover:bg-accent/50 transition-all duration-200"
      >
        <Plus className="h-4 w-4 mr-2" />
        Tijdblok Toevoegen
      </Button>
    </div>
  );
}
