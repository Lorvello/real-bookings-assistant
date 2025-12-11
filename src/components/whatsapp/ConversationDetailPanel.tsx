import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { WhatsAppContactOverview } from '@/types/whatsappOverview';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  CheckCircle2, 
  Phone, 
  User, 
  Building2,
  Clock,
  Send,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ConversationDetailPanelProps {
  contact: WhatsAppContactOverview;
}

export function ConversationDetailPanel({ contact }: ConversationDetailPanelProps) {
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Use session_id as conversation_id for messages
  const { data: messages, isLoading: messagesLoading } = useWhatsAppMessages(
    contact.session_id || ''
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    console.log('Sending message:', message);
    toast({
      title: "Bericht",
      description: "Berichten versturen is nog niet geïmplementeerd."
    });
    setMessage('');
  };

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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Left: Contact Info */}
        <div className="lg:col-span-1 space-y-4">
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
          <Card className="flex-1 flex flex-col min-h-0">
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
              {/* Messages */}
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                {messagesLoading ? (
                  <div className="space-y-3">
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
                  <div className="space-y-3 pb-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-3 py-2",
                            msg.direction === 'outgoing'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={cn(
                            "text-xs mt-1",
                            msg.direction === 'outgoing' 
                              ? 'text-primary-foreground/70' 
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

              {/* Message Input */}
              <Separator className="my-3" />
              <div className="flex gap-2 shrink-0">
                <Input
                  placeholder="Typ een bericht..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} size="icon" disabled={!message.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
