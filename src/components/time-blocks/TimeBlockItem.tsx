
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, GripVertical } from 'lucide-react';

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface TimeBlockItemProps {
  block: TimeBlock;
  index: number;
  isValid: boolean;
  onUpdate: (blockId: string, updates: Partial<TimeBlock>) => void;
  onRemove: (blockId: string) => void;
}

export function TimeBlockItem({
  block,
  index,
  isValid,
  onUpdate,
  onRemove
}: TimeBlockItemProps) {
  return (
    <div
      className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all duration-200 ${
        isValid 
          ? 'bg-background/80 border-border/60 hover:border-primary/30' 
          : 'bg-destructive/10 border-destructive/50'
      }`}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
      
      <div className="flex items-center space-x-3 flex-1">
        <Badge variant="outline" className="text-xs rounded-xl">
          Blok {index + 1}
        </Badge>
        
        <div className="flex items-center space-x-2">
          <Label className="text-sm text-muted-foreground">Van:</Label>
          <Input
            type="time"
            value={block.startTime}
            onChange={(e) => onUpdate(block.id, { startTime: e.target.value })}
            className="w-24 bg-input/80 border-border/60 rounded-xl"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Label className="text-sm text-muted-foreground">Tot:</Label>
          <Input
            type="time"
            value={block.endTime}
            onChange={(e) => onUpdate(block.id, { endTime: e.target.value })}
            className="w-24 bg-input/80 border-border/60 rounded-xl"
          />
        </div>
      </div>

      {!isValid && (
        <Badge variant="destructive" className="text-xs rounded-xl">
          Ongeldig
        </Badge>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onRemove(block.id)}
        className="p-2 text-destructive hover:text-destructive rounded-xl hover:bg-destructive/10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
