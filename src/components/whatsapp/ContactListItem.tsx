import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { WhatsAppContactOverview } from '@/types/whatsappOverview';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ContactListItemProps {
  contact: WhatsAppContactOverview;
  isSelected: boolean;
  onClick: () => void;
}

export function ContactListItem({ contact, isSelected, onClick }: ContactListItemProps) {
  const displayName = contact.display_name || 
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 
    contact.phone_number;

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 border-transparent';
      case 'pending': return 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 border-transparent';
      case 'closed': return 'bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent';
      default: return 'bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent';
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'active': return 'Actief';
      case 'pending': return 'Wachtend';
      case 'closed': return 'Gesloten';
      default: return 'Unknown';
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
        isSelected 
          ? "bg-primary/10 border-primary/20" 
          : "bg-card border-border hover:bg-muted/50"
      )}
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-foreground truncate">
            {displayName}
          </span>
          <Badge 
            variant="outline" 
            className={cn("text-xs shrink-0", getStatusColor(contact.conversation_status))}
          >
            {getStatusLabel(contact.conversation_status)}
          </Badge>
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground truncate">
            {contact.all_bookings?.[0]?.business_name || contact.phone_number}
          </span>
          {contact.last_message_at && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(contact.last_message_at), { 
                addSuffix: true, 
                locale: nl 
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
