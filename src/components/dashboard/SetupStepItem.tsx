
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, RotateCcw, LucideIcon } from 'lucide-react';

interface SetupStepItemProps {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  icon: LucideIcon;
  onAction: (stepId: string, completed: boolean) => void;
}

export const SetupStepItem: React.FC<SetupStepItemProps> = ({
  id,
  title,
  description,
  completed,
  icon: IconComponent,
  onAction
}) => {
  const getButtonText = () => {
    if (completed) {
      switch (id) {
        case 'calendar_linked':
          return 'Reset Calendar';
        case 'availability_configured':
          return 'Reset';
        case 'booking_rules_set':
          return 'Reset';
        default:
          return 'Reset';
      }
    }
    return 'Complete';
  };

  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
        completed
          ? 'border-green-200 bg-green-50'
          : 'border-white/[0.08] bg-muted'
      }`}
    >
      <div className={`p-2 rounded-full ${
        completed ? 'bg-green-100' : 'bg-muted'
      }`}>
        {completed ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <IconComponent className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      
      <div className="flex-1">
        <h4 className={`font-medium ${
          completed ? 'text-green-900' : 'text-foreground'
        }`}>
          {title}
        </h4>
        <p className="text-sm text-subtle-foreground">{description}</p>
      </div>

      <Button
        variant={completed ? "outline" : "default"}
        size="sm"
        className={completed ? "text-red-600 hover:text-red-700 hover:bg-red-50" : ""}
        onClick={() => onAction(id, completed)}
      >
        {completed ? (
          <>
            <RotateCcw className="h-4 w-4 mr-1" />
            {getButtonText()}
          </>
        ) : (
          'Complete'
        )}
      </Button>
    </div>
  );
};
