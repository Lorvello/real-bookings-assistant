
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrphanedConversations } from '@/hooks/useOrphanedConversations';
import { MessageCircle, RefreshCw, Users, Calendar, Clock, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export function ConversationManagement() {
  const { data: unlinkedConversations, isLoading, refetch } = useOrphanedConversations();

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-xl">
        <CardHeader className="border-b border-border bg-muted/30">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageCircle className="w-5 h-5 text-primary" />
            Gespreksbeheer
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-xl">
      <CardHeader className="border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageCircle className="w-5 h-5 text-primary" />
            Gespreksbeheer
            {unlinkedConversations && unlinkedConversations.length > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {unlinkedConversations.length}
              </Badge>
            )}
          </CardTitle>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="border-border text-foreground hover:bg-muted"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Vernieuwen
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {!unlinkedConversations || unlinkedConversations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Alle gesprekken zijn beheerd</h3>
            <p className="text-muted-foreground">
              Er zijn momenteel geen WhatsApp gesprekken die aandacht behoeven.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground mb-1">WhatsApp Gesprekken Zonder Afspraak</h4>
                  <p className="text-sm text-muted-foreground">
                    Deze klanten hebben contact opgenomen via WhatsApp maar hebben nog geen afspraak ingepland. 
                    Bekijk hun berichten en help ze bij het maken van een afspraak.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {unlinkedConversations.map((conversation) => (
                <div
                  key={conversation.conversation_id}
                  className="bg-muted/30 rounded-lg p-4 border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-foreground">
                          {conversation.contact_name || 'Onbekend contact'}
                        </h4>
                        <Badge variant="outline" className="bg-background border-border text-foreground">
                          Nieuwe lead
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Phone className="w-4 h-4" />
                        <span className="font-mono">{conversation.contact_phone}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{conversation.message_count} berichten</span>
                        </div>
                        {conversation.last_activity && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {format(new Date(conversation.last_activity), 'dd MMM HH:mm', { locale: nl })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/20 text-primary hover:bg-primary/10"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Bekijk Chat
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Plan Afspraak
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
