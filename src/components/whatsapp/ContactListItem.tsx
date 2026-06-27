import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { WhatsAppContactOverview } from '@/types/whatsappOverview';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ContactListItemProps {
  contact: WhatsAppContactOverview;
  isSelected: boolean;
  onClick: () => void;
}

export function ContactListItem({ contact, isSelected, onClick }: ContactListItemProps) {
  const { t } = useTranslation('appPages');
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
      case 'active': return 'bg-success/10 text-success-foreground ring-1 ring-success/20 border-transparent';
      case 'pending': return 'bg-warning/10 text-warning-foreground ring-1 ring-warning/20 border-transparent';
      case 'closed': return 'bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent';
      default: return 'bg-muted text-muted-foreground ring-1 ring-white/[0.08] border-transparent';
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'active': return 'Active';
      case 'pending': return 'Pending';
      case 'closed': return 'Closed';
      default: return 'Unknown';
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('convPage.openConversationAriaLabel', 'Open conversation with {{displayName}}', { displayName })}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer border outline-none transition-[transform,background-color,border-color] duration-150 active:scale-[0.99] motion-reduce:active:scale-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
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
          {/* Secondary line = the customer's phone (NOT the business name — that's obviously us
              and only confused; W2). Hidden when the name already IS the phone, to avoid a duplicate. */}
          <span className="text-xs text-muted-foreground truncate">
            {displayName !== contact.phone_number ? contact.phone_number : ''}
          </span>
          {contact.last_message_at && (
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(new Date(contact.last_message_at), {
                addSuffix: true,
                locale: enUS
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
