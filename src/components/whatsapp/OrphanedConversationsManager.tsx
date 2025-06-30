
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
      <Card className="bg-gray-800/90 border-gray-700 shadow-xl">
        <CardHeader className="border-b border-gray-700 bg-gray-800/50">
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageCircle className="w-5 h-5 text-orange-400" />
            Ontkoppelde Gesprekken
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/90 border-gray-700 shadow-xl">
      <CardHeader className="border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageCircle className="w-5 h-5 text-orange-400" />
            Ontkoppelde Gesprekken
            {orphanedConversations && orphanedConversations.length > 0 && (
              <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
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
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Vernieuwen
            </Button>
            
            {orphanedConversations && orphanedConversations.length > 0 && (
              <Button
                onClick={handleLinkExisting}
                disabled={linkMutation.isPending}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Link className={`w-4 h-4 mr-2 ${linkMutation.isPending ? 'animate-spin' : ''}`} />
                Automatisch Koppelen
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {!orphanedConversations || orphanedConversations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Alle gesprekken zijn gekoppeld</h3>
            <p className="text-gray-400">
              Er zijn geen ontkoppelde WhatsApp gesprekken gevonden.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-300 mb-1">Ontkoppelde Gesprekken Gevonden</h4>
                  <p className="text-sm text-orange-200">
                    Deze WhatsApp gesprekken hebben bijbehorende afspraken maar zijn niet automatisch gekoppeld. 
                    Klik op "Automatisch Koppelen" om deze te koppelen.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {orphanedConversations.map((conversation) => (
                <div
                  key={conversation.conversation_id}
                  className="bg-gray-700/30 rounded-lg p-4 border border-gray-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white">
                        {conversation.contact_name || 'Onbekend contact'}
                      </h4>
                      <p className="text-sm text-gray-400 font-mono">
                        {conversation.contact_phone}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{conversation.message_count} berichten</span>
                        {conversation.last_activity && (
                          <span>
                            Laatste activiteit: {format(new Date(conversation.last_activity), 'dd MMM HH:mm', { locale: nl })}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <Badge variant="outline" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
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
