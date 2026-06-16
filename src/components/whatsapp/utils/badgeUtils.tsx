
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
          Actief
        </Badge>
      );
    case 'closed':
      return (
        <Badge variant="secondary" className="bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent">
          <Archive className="w-3 h-3 mr-1" />
          Gesloten
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="outline" className="bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent">
          <Archive className="w-3 h-3 mr-1" />
          Gearchiveerd
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
          Bevestigd
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 border-transparent">
          <Clock className="w-3 h-3 mr-1" />
          In afwachting
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-destructive/10 text-destructive-foreground ring-1 ring-destructive/20 border-transparent">
          <AlertCircle className="w-3 h-3 mr-1" />
          Geannuleerd
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-success/10 text-success-foreground ring-1 ring-success/20 border-transparent">
          <CheckCircle className="w-3 h-3 mr-1" />
          Voltooid
        </Badge>
      );
    default:
      return null;
  }
};
