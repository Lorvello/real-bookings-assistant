import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { WhatsAppContactOverview } from '@/types/whatsappOverview';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';

import { 
  Calendar, 
  CheckCircle2, 
  Phone, 
  User, 
  Building2,
  Clock,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConversationDetailPanelProps {
  contact: WhatsAppContactOverview;
}

export function ConversationDetailPanel({ contact }: ConversationDetailPanelProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  // Custom smooth scroll functie met easing
  const smoothScrollTo = (element: HTMLElement, targetPosition: number, duration: number = 600) => {
    const startPosition = element.scrollTop;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    const animation = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic voor natuurlijke animatie
      const easeOut = 1 - Math.pow(1 - progress, 3);
      element.scrollTop = startPosition + distance * easeOut;
      
      if (progress < 1) {
        requestAnimationFrame(animation);
      }
    };
    
    requestAnimationFrame(animation);
  };

  // Ref voor de content container
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll naar nieuwste bericht via content parentElement
  useEffect(() => {
    const timer = setTimeout(() => {
      const content = contentRef.current;
      console.log('Content ref:', content);
      
      if (!content) {
        console.log('Content ref niet gevonden!');
        return;
      }
      
      const viewport = content.parentElement as HTMLElement | null;
      console.log('Viewport gevonden:', viewport);
      console.log('ScrollHeight:', viewport?.scrollHeight, 'ClientHeight:', viewport?.clientHeight);
      
      if (viewport && viewport.scrollHeight > viewport.clientHeight) {
        console.log('Start scroll animatie...');
        // Eerst instant naar boven scrollen
        viewport.scrollTop = 0;
        
        // Dan na kort moment smooth naar beneden met custom animatie
        requestAnimationFrame(() => {
          smoothScrollTo(viewport, viewport.scrollHeight, 800);
          console.log('Scroll animatie gestart naar:', viewport.scrollHeight);
        });
      } else {
        console.log('Geen scroll nodig of viewport niet gevonden');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [messages]);


  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'closed': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'active': return 'Actief';
      case 'pending': return 'Wachtend';
      case 'closed': return 'Gesloten';
      default: return 'Onbekend';
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{displayName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", getStatusColor(contact.conversation_status))}
                >
                  {getStatusLabel(contact.conversation_status)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Plan Afspraak</span>
            </Button>
            {contact.conversation_status !== 'closed' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">Sluiten</span>
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
              <h3 className="font-medium text-sm text-foreground">Contact Informatie</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">{contact.phone_number}</span>
              </div>
              {contact.first_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {[contact.first_name, contact.last_name].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
              {contact.business_name && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{contact.business_name}</span>
                </div>
              )}
              {contact.conversation_created_at && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Contact sinds {format(new Date(contact.conversation_created_at), 'd MMM yyyy', { locale: nl })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Latest Appointment */}
          {contact.laatste_booking && (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-medium text-sm text-foreground">Laatste Afspraak</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">
                    {format(new Date(contact.laatste_booking), 'd MMMM yyyy', { locale: nl })}
                  </span>
                </div>
                {contact.laatste_service && (
                  <p className="text-sm text-muted-foreground">{contact.laatste_service}</p>
                )}
                {contact.booking_status && (
                  <Badge variant="outline" className="text-xs">
                    {contact.booking_status}
                  </Badge>
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
                <MessageSquare className="h-4 w-4 text-primary" />
                <h3 className="font-medium text-sm text-foreground">Conversatie</h3>
                {messages && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {messages.length} berichten
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
                      <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : !messages || messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nog geen berichten</p>
                  </div>
                ) : (
                  <div ref={contentRef} className="space-y-4 py-4">
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
                            "max-w-[80%] px-4 py-2.5 shadow-sm relative",
                            msg.direction === 'outbound'
                              ? 'bg-[hsl(142,70%,35%)] text-white rounded-2xl rounded-br-md'
                              : 'bg-muted text-foreground rounded-2xl rounded-bl-md border border-border'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          <p className={cn(
                            "text-xs mt-1.5 text-right",
                            msg.direction === 'outbound' 
                              ? 'text-white/70' 
                              : 'text-muted-foreground'
                          )}>
                            {format(new Date(msg.created_at), 'HH:mm', { locale: nl })}
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
    </div>
  );
}
