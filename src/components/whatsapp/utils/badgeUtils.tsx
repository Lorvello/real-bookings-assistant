
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle,
  AlertCircle,
  Archive,
  Clock
} from 'lucide-react';

export const getStatusBadge = (status?: string) => {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-success/10 text-success-foreground ring-1 ring-success/20 border-transparent">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    case 'closed':
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent">
          <Archive className="w-3 h-3 mr-1" />
          Closed
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent">
          <Archive className="w-3 h-3 mr-1" />
          Archived
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-white/[0.08]">
          <AlertCircle className="w-3 h-3 mr-1" />
          Unknown
        </Badge>
      );
  }
};

export const getBookingStatusBadge = (status?: string) => {
  switch (status) {
    case 'confirmed':
      return (
        <Badge className="bg-success/10 text-success-foreground ring-1 ring-success/20 border-transparent">
          <CheckCircle className="w-3 h-3 mr-1" />
          Confirmed
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-warning/10 text-warning-foreground ring-1 ring-warning/20 border-transparent">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-destructive/10 text-destructive-foreground ring-1 ring-destructive/20 border-transparent">
          <AlertCircle className="w-3 h-3 mr-1" />
          Cancelled
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-success/10 text-success-foreground ring-1 ring-success/20 border-transparent">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    default:
      return null;
  }
};
