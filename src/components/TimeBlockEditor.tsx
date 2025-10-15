
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Save } from 'lucide-react';
import { TimeBlockList } from './time-blocks/TimeBlockList';

interface TimeBlock {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface TimeBlockEditorProps {
  isOpen: boolean;
  onClose: () => void;
  dayLabel: string;
  initialBlocks: TimeBlock[];
  onSave: (blocks: TimeBlock[]) => Promise<void>;
}

export function TimeBlockEditor({
  isOpen,
  onClose,
  dayLabel,
  initialBlocks,
  onSave
}: TimeBlockEditorProps) {
  const [blocks, setBlocks] = useState<TimeBlock[]>(initialBlocks);
  const [saving, setSaving] = useState(false);

  const addTimeBlock = () => {
    const newBlock: TimeBlock = {
      id: Date.now().toString(),
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (blockId: string, updates: Partial<TimeBlock>) => {
    setBlocks(blocks.map(block => 
      block.id === blockId ? { ...block, ...updates } : block
    ));
  };

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter(block => block.id !== blockId));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(blocks);
      onClose();
    } catch (error) {
      console.error('Error saving time blocks:', error);
    } finally {
      setSaving(false);
    }
  };

  const validateTimeBlock = (block: TimeBlock): boolean => {
    if (block.startTime >= block.endTime) return false;
    
    // Check for overlaps with other blocks
    const otherBlocks = blocks.filter(b => b.id !== block.id);
    return !otherBlocks.some(otherBlock => {
      return (
        (block.startTime >= otherBlock.startTime && block.startTime < otherBlock.endTime) ||
        (block.endTime > otherBlock.startTime && block.endTime <= otherBlock.endTime) ||
        (block.startTime <= otherBlock.startTime && block.endTime >= otherBlock.endTime)
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            {dayLabel} - Edit Time Blocks
          </DialogTitle>
          <DialogDescription>
            Add multiple time blocks for this day. Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        <TimeBlockList
          blocks={blocks}
          onUpdateBlock={updateBlock}
          onRemoveBlock={removeBlock}
          onAddBlock={addTimeBlock}
          validateTimeBlock={validateTimeBlock}
        />

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="w-4 h-4 bg-current rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
