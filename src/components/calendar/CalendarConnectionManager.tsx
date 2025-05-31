/**
 * 📅 CALENDAR CONNECTION MANAGER - Enhanced with Nuclear Options
 * =============================================================
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { CalendarConnection } from '@/types/calendar';
import { DisconnectCalendarButton } from './DisconnectCalendarButton';
import { NuclearDisconnectButton } from './NuclearDisconnectButton';
import { User } from '@supabase/supabase-js';

interface CalendarConnectionManagerProps {
  user: User | null;
  connections: CalendarConnection[];
  loading: boolean;
  onRefresh: () => void;
  onAddCalendar: () => void;
}

/**
 * 🎮 Manager component for calendar connections overview
 * 
 * FEATURES:
 * - Connection cards with provider details
 * - Integrated disconnect buttons
 * - Refresh functionality for manual updates
 * - Add new calendar quick action
 * - Empty state guidance
 * 
 * UX PATTERNS:
 * - Clear visual hierarchy with provider branding
 * - Consistent action placement
 * - Loading states for smooth interactions
 * - Progressive disclosure of advanced options
 */
export const CalendarConnectionManager: React.FC<CalendarConnectionManagerProps> = ({
  user,
  connections,
  loading,
  onRefresh,
  onAddCalendar
}) => {
  /**
   * 🎨 Renders individual connection card
   * 
   * DESIGN:
   * - Provider branding and name
   * - Connection date for context
   * - Status indicators
   * - Integrated disconnect button
   */
  const renderConnectionCard = (connection: CalendarConnection) => {
    const getProviderDetails = (provider: string) => {
      switch (provider.toLowerCase()) {
        case 'google':
          return {
            name: 'Google Calendar',
            color: 'bg-blue-50 border-blue-200 text-blue-900',
            iconColor: 'text-blue-600'
          };
        case 'microsoft':
          return {
            name: 'Microsoft Outlook',
            color: 'bg-blue-50 border-blue-200 text-blue-900',
            iconColor: 'text-blue-600'
          };
        default:
          return {
            name: `${provider} Calendar`,
            color: 'bg-gray-50 border-gray-200 text-gray-900',
            iconColor: 'text-gray-600'
          };
      }
    };

    const providerDetails = getProviderDetails(connection.provider);

    return (
      <Card key={connection.id} className={`${providerDetails.color} border-2`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className={`h-5 w-5 ${providerDetails.iconColor}`} />
              <div>
                <div className="font-semibold">{providerDetails.name}</div>
                <div className="text-sm opacity-75">
                  Verbonden op {new Date(connection.created_at).toLocaleDateString('nl-NL')}
                </div>
                {connection.provider_account_id !== 'pending' && (
                  <div className="text-xs opacity-60 mt-1">
                    Account: {connection.provider_account_id}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-700 border-green-300">
                Actief
              </Badge>
              <DisconnectCalendarButton
                user={user}
                connectionId={connection.id}
                providerName={providerDetails.name}
                onDisconnectSuccess={onRefresh}
                variant="outline"
                size="sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 🔄 LOADING STATE
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-600" />
            Kalender Verbindingen
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-green-600" />
            <div className="text-sm text-gray-600">Verbindingen laden...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-green-600" />
          Kalender Verbindingen
          <Badge variant="outline" className="ml-auto">
            {connections.length} verbonden
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.length === 0 ? (
          // 🎨 EMPTY STATE
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Geen Kalender Verbindingen
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Verbind je kalender om automatische beschikbaarheidscontrole en 
              24/7 booking via WhatsApp mogelijk te maken.
            </p>
            <Button onClick={onAddCalendar} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Kalender Verbinden
            </Button>
          </div>
        ) : (
          // 🎨 CONNECTIONS LIST
          <div className="space-y-3">
            {connections.map(renderConnectionCard)}
            
            {/* 🔧 ACTION BUTTONS */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={onAddCalendar}
                variant="outline"
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Kalender
              </Button>
              <Button
                onClick={onRefresh}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Vernieuwen
              </Button>
            </div>

            {/* 🔥 NUCLEAR OPTION */}
            <div className="pt-4 border-t border-red-200">
              <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <div className="font-medium text-red-900">Nuclear Disconnect</div>
                    <div className="text-sm text-red-700">
                      Complete calendar reset - gebruik alleen bij problemen
                    </div>
                  </div>
                </div>
                <NuclearDisconnectButton onSuccess={onRefresh} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * 🎯 AFFABLE BOT SYSTEM NOTES:
 * ============================
 * 
 * Deze component vormt de interface voor calendar connection management,
 * wat essentieel is voor het autonome booking systeem. Zonder actieve
 * calendar verbindingen kan de WhatsApp bot geen beschikbaarheid controleren.
 * 
 * KEY BUSINESS VALUE:
 * - Visual connection status prevents user confusion
 * - Quick disconnect enables troubleshooting connection issues
 * - Clear re-connection path maintains system usability
 * - Proactive empty state guidance improves onboarding completion
 * 
 * SYSTEM DEPENDENCIES:
 * - CalendarConnection types: Database schema alignment
 * - DisconnectCalendarButton: Safe token cleanup
 * - Dashboard integration: Primary management interface
 * - Setup Progress: Fallback flows voor disconnected users
 * 
 * BUSINESS METRICS IMPACT:
 * - Connection uptime affects booking volume
 * - Quick reconnection reduces system downtime
 * - Clear status messaging reduces support tickets
 * - Streamlined management improves user retention
 */
