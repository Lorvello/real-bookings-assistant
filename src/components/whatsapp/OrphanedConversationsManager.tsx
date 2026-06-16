
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrphanedConversations, useLinkExistingConversations } from '@/hooks/useOrphanedConversations';
import { MessageCircle, RefreshCw, Users, Link, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export function OrphanedConversationsManager() {
  const { data: orphanedConversations, isLoading, refetch } = useOrphanedConversations();
  const linkMutation = useLinkExistingConversations();

  const handleLinkExisting = async () => {
    try {
      await linkMutation.mutateAsync();
      refetch();
    } catch (error) {
      console.error('Error linking conversations:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-white/[0.08]">
        <CardHeader className="border-b border-white/[0.08] bg-card">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageCircle className="w-5 h-5 text-warning-foreground" />
            Orphaned Conversations
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
    <Card className="bg-card border-white/[0.08]">
      <CardHeader className="border-b border-white/[0.08] bg-card">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageCircle className="w-5 h-5 text-warning-foreground" />
            Orphaned Conversations
            {orphanedConversations && orphanedConversations.length > 0 && (
              <Badge variant="secondary" className="bg-warning/15 text-warning-foreground border-warning/30 tabular-nums">
                {orphanedConversations.length}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="border-white/[0.08] text-foreground hover:bg-white/[0.06]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Vernieuwen
            </Button>
            
            {orphanedConversations && orphanedConversations.length > 0 && (
              <Button
                onClick={handleLinkExisting}
                disabled={linkMutation.isPending}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Link className={`w-4 h-4 mr-2 ${linkMutation.isPending ? 'animate-spin' : ''}`} />
                Auto Link
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {!orphanedConversations || orphanedConversations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-accent-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">All conversations are linked</h3>
            <p className="text-muted-foreground">
              No orphaned WhatsApp conversations found.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning-foreground mt-0.5" />
                <div>
                  <h4 className="font-medium text-warning-foreground mb-1">Orphaned Conversations Found</h4>
                  <p className="text-sm text-warning-foreground">
                    These WhatsApp conversations have matching appointments but are not automatically linked. 
                    Click "Auto Link" to link them.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {orphanedConversations.map((conversation) => (
                <div
                  key={conversation.conversation_id}
                  className="bg-muted/30 rounded-lg p-4 border border-white/[0.08]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-foreground">
                        {conversation.contact_name || 'Unknown contact'}
                      </h4>
                      <p className="text-sm text-muted-foreground font-mono tabular-nums">
                        {conversation.contact_phone}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="tabular-nums">{conversation.message_count} messages</span>
                        {conversation.last_activity && (
                          <span className="tabular-nums">
                            Last activity: {format(new Date(conversation.last_activity), 'dd MMM HH:mm', { locale: nl })}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Badge variant="outline" className="bg-warning/15 text-warning-foreground border-warning/30">
                      Ontkoppeld
                    </Badge>
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
