import React, { useRef, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { WhatsAppContactOverview } from '@/types/whatsappOverview';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useCloseConversation } from '@/hooks/useWhatsAppConversations';
import { NewBookingModal } from '@/components/NewBookingModal';
import { useToast } from '@/hooks/use-toast';
import { getBookingStatusBadge } from './utils/badgeUtils';

import {
  Calendar,
  CheckCircle2,
  Phone,
  User,
  Clock,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConversationDetailPanelProps {
  contact: WhatsAppContactOverview;
  calendarId: string;
}

export function ConversationDetailPanel({ contact, calendarId }: ConversationDetailPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [isLocallyClosed, setIsLocallyClosed] = useState(false);
  const closeConversation = useCloseConversation();

  const isClosed = isLocallyClosed || contact.conversation_status === 'closed';

  const handleCloseConversation = () => {
    closeConversation.mutate(contact.contact_id, {
      onSuccess: () => {
        setIsLocallyClosed(true);
        toast({ title: 'Conversation closed' });
      },
      onError: (e) => toast({
        title: 'Could not close conversation',
        description: e instanceof Error ? e.message : 'Please try again',
        variant: 'destructive',
      }),
    });
  };

  // Use contact_id for fetching messages
  const { data: messages, isLoading: messagesLoading } = useWhatsAppMessages(
    contact.contact_id || ''
  );

  const displayName = contact.display_name ||
    [contact.first_name, contact.last_name].filter(Boolean).join(' ') ||
    contact.phone_number;

  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Custom smooth scroll with ease-out cubic for a natural settle.
  const smoothScrollTo = (element: HTMLElement, targetPosition: number, duration: number = 600) => {
    const startPosition = element.scrollTop;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOut = 1 - Math.pow(1 - progress, 3);
      element.scrollTop = startPosition + distance * easeOut;

      if (progress < 1) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest message via the content's scroll viewport parent.
  useEffect(() => {
    const timer = setTimeout(() => {
      const content = contentRef.current;
      if (!content) return;

      const viewport = content.parentElement as HTMLElement | null;
      if (viewport && viewport.scrollHeight > viewport.clientHeight) {
        // Respect reduced-motion: jump instead of the 800ms eased scroll.
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduced) {
          viewport.scrollTop = viewport.scrollHeight;
          return;
        }
        viewport.scrollTop = 0;
        requestAnimationFrame(() => {
          smoothScrollTo(viewport, viewport.scrollHeight, 800);
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [messages]);


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
    <div className="flex flex-col h-full surface-raised rounded-xl">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={cn("text-xs", getStatusColor(isClosed ? 'closed' : contact.conversation_status))}
                >
                  {getStatusLabel(isClosed ? 'closed' : contact.conversation_status)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-2" aria-label="Schedule appointment" onClick={() => setBookingModalOpen(true)}>
              <Calendar aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule appointment</span>
            </Button>
            {!isClosed && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                aria-label="Close conversation"
                disabled={closeConversation.isPending}
                onClick={handleCloseConversation}
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                <span className="hidden sm:inline">{closeConversation.isPending ? 'Closing...' : 'Close'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 min-h-0 overflow-hidden">
        {/* Left: Contact Info */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-medium text-sm text-foreground">Contact Information</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground tabular-nums">{contact.phone_number}</span>
              </div>
              {contact.first_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
              {/* Business name intentionally NOT shown on the customer's contact card — it is
                  obviously the owner's own business and only added confusion (W2). */}
              {contact.conversation_created_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground tabular-nums">
                    Contact since {format(new Date(contact.conversation_created_at), 'd MMM yyyy', { locale: enUS })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bookings */}
          {contact.all_bookings && contact.all_bookings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium text-sm text-foreground tabular-nums">
                  Bookings ({contact.all_bookings.length})
                </h3>
              </CardHeader>
              <CardContent className="space-y-3 max-h-48 overflow-y-auto">
                {contact.all_bookings.slice(0, 5).map((booking) => (
                  <div key={booking.booking_id} className="p-2 bg-muted/30 rounded border border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground tabular-nums">
                        {format(new Date(booking.start_time), 'd MMMM yyyy HH:mm', { locale: enUS })}
                      </span>
                    </div>
                    {booking.service_name && (
                      <p className="text-sm text-muted-foreground mt-1">{booking.service_name}</p>
                    )}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs text-muted-foreground truncate">{booking.calendar_name}</span>
                      {booking.status && (
                        <span className="shrink-0">{getBookingStatusBadge(booking.status)}</span>
                      )}
                    </div>
                  </div>
                ))}
                {contact.all_bookings.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{contact.all_bookings.length - 5} more bookings
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Conversation History */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 max-h-[calc(100vh-300px)]">
            <CardHeader className="pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare aria-hidden="true" className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-sm text-foreground">Conversation</h3>
                {messages && (
                  <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                    {messages.length} messages
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
              {/* Messages - Fixed height for scrolling */}
              <ScrollArea ref={scrollAreaRef} className="h-full max-h-[500px] pr-4">
                {messagesLoading ? (
                  <div className="space-y-3 p-2">
                    {[1, 2, 3].map(i => (
                      <div
                        key={i}
                        className={cn(
                          "shimmer h-12 rounded-2xl bg-white/[0.04]",
                          i % 2 === 0 ? "ml-auto w-1/2" : "w-2/3"
                        )}
                      />
                    ))}
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <div className="glow-accent relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                      <MessageSquare aria-hidden="true" className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">No messages yet</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">The conversation will appear here.</p>
                  </div>
                ) : (
                  <div ref={contentRef} role="log" aria-live="polite" aria-label="Conversation messages" className="space-y-4 py-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] px-4 py-2.5 relative",
                            msg.direction === 'outbound'
                              ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
                              : 'bg-muted text-foreground rounded-2xl rounded-bl-md border border-border'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          <p className={cn(
                            "text-xs mt-1.5 text-right tabular-nums",
                            msg.direction === 'outbound'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          )}>
                            {format(new Date(msg.created_at), 'HH:mm', { locale: enUS })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

            </CardContent>
          </Card>
        </div>
      </div>

      <NewBookingModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        calendarId={calendarId}
        prefill={{ customerName: displayName, customerPhone: contact.phone_number }}
      />
    </div>
  );
}
