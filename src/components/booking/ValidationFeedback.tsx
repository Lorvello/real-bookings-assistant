import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ValidationFeedbackProps {
  status: 'valid' | 'warning' | 'error' | 'idle';
  message?: string;
  className?: string;
}

export const ValidationFeedback = ({ status, message, className }: ValidationFeedbackProps) => {
  if (status === 'idle') return null;
  
  const icons = {
    valid: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
    error: <XCircle className="h-4 w-4 text-destructive" />
  };
  
  const colors = {
    valid: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-destructive'
  };
  
  return (
    <div className={cn('flex items-center gap-2 text-sm mt-1', colors[status], className)}>
      {icons[status]}
      {message && <span>{message}</span>}
    </div>
  );
};
