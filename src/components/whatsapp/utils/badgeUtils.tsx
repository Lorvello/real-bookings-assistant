
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
        <Badge className="bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Actief
        </Badge>
      );
    case 'closed':
      return (
        <Badge variant="secondary" className="bg-gray-600/20 text-gray-300 border-gray-600/30">
          <Archive className="w-3 h-3 mr-1" />
          Gesloten
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
          <Archive className="w-3 h-3 mr-1" />
          Gearchiveerd
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-600/20 text-gray-400 border-gray-600/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Onbekend
        </Badge>
      );
  }
};

export const getBookingStatusBadge = (status?: string) => {
  switch (status) {
    case 'confirmed':
      return (
        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Bevestigd
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
          <Clock className="w-3 h-3 mr-1" />
          In afwachting
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
          <AlertCircle className="w-3 h-3 mr-1" />
          Geannuleerd
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Voltooid
        </Badge>
      );
    default:
      return null;
  }
};
