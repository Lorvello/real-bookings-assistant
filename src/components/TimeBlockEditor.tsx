
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Clock,
  GripVertical,
  Save
} from 'lucide-react';

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
            {dayLabel} - Tijdblokken Bewerken
          </DialogTitle>
          <DialogDescription>
            Voeg meerdere tijdblokken toe voor deze dag. Sleep om te herordenen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Time Blocks List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {blocks.map((block, index) => {
              const isValid = validateTimeBlock(block);
              
              return (
                <div
                  key={block.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                    isValid 
                      ? 'bg-background border-border' 
                      : 'bg-destructive/10 border-destructive/50'
                  }`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  
                  <div className="flex items-center space-x-2 flex-1">
                    <Badge variant="outline" className="text-xs">
                      Blok {index + 1}
                    </Badge>
                    
                    <div className="flex items-center space-x-2">
                      <Label className="text-sm text-muted-foreground">Van:</Label>
                      <Input
                        type="time"
                        value={block.startTime}
                        onChange={(e) => updateBlock(block.id, { startTime: e.target.value })}
                        className="w-24 bg-input border-border"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Label className="text-sm text-muted-foreground">Tot:</Label>
                      <Input
                        type="time"
                        value={block.endTime}
                        onChange={(e) => updateBlock(block.id, { endTime: e.target.value })}
                        className="w-24 bg-input border-border"
                      />
                    </div>
                  </div>

                  {!isValid && (
                    <Badge variant="destructive" className="text-xs">
                      Ongeldig
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBlock(block.id)}
                    className="p-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
            onClick={addTimeBlock}
            className="w-full border-border border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Tijdblok Toevoegen
          </Button>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Annuleren
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="w-4 h-4 bg-current rounded-full animate-spin mr-2" />
                  Opslaan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Opslaan
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
