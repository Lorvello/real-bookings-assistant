
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Settings, Save, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OAuthProvider {
  id: string;
  provider: string;
  client_id: string | null;
  client_secret: string | null;
  is_active: boolean;
}

export const CalendarOAuthConfig: React.FC = () => {
  const [providers, setProviders] = useState<OAuthProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('oauth_providers')
        .select('id, provider, client_id, client_secret, is_active')
        .in('provider', ['google', 'microsoft']);

      if (error) {
        console.error('Error fetching OAuth providers:', error);
        return;
      }

      setProviders(data || []);
    } catch (error) {
      console.error('Unexpected error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProvider = async (providerId: string, updates: Partial<OAuthProvider>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('oauth_providers')
        .update(updates)
        .eq('id', providerId);

      if (error) {
        console.error('Error updating provider:', error);
        toast({
          title: "Error",
          description: "Failed to update OAuth configuration",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "OAuth configuration updated successfully",
      });

      await fetchProviders();
    } catch (error) {
      console.error('Unexpected error updating provider:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (providerId: string, field: string, value: string) => {
    setProviders(prev => prev.map(provider => 
      provider.id === providerId 
        ? { ...provider, [field]: value }
        : provider
    ));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading OAuth configuration...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          OAuth Settings
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:w-[600px]">
        <SheetHeader>
          <SheetTitle>Calendar OAuth Configuration</SheetTitle>
          <SheetDescription>
            Configure OAuth credentials for calendar providers. You need to register your app with each provider first.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Setup Required:</strong> You need to register OAuth applications with Google and Microsoft first.
              <br />
              <a 
                href="https://console.developers.google.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Google Cloud Console
              </a>
              {' | '}
              <a 
                href="https://portal.azure.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Microsoft Azure Portal
              </a>
            </AlertDescription>
          </Alert>

          {providers.map((provider) => (
            <Card key={provider.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {provider.provider === 'google' ? (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">G</div>
                  ) : (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">O</div>
                  )}
                  {provider.provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'}
                  {provider.client_id && provider.client_secret && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor={`${provider.provider}-client-id`}>Client ID</Label>
                  <Input
                    id={`${provider.provider}-client-id`}
                    type="text"
                    placeholder="Enter OAuth Client ID"
                    value={provider.client_id || ''}
                    onChange={(e) => handleInputChange(provider.id, 'client_id', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor={`${provider.provider}-client-secret`}>Client Secret</Label>
                  <Input
                    id={`${provider.provider}-client-secret`}
                    type="password"
                    placeholder="Enter OAuth Client Secret"
                    value={provider.client_secret || ''}
                    onChange={(e) => handleInputChange(provider.id, 'client_secret', e.target.value)}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Redirect URI:</strong> {window.location.origin}/functions/v1/{provider.provider}-calendar-auth
                </div>
                <Button 
                  onClick={() => updateProvider(provider.id, {
                    client_id: provider.client_id,
                    client_secret: provider.client_secret,
                    is_active: !!(provider.client_id && provider.client_secret)
                  })}
                  disabled={saving || !provider.client_id || !provider.client_secret}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <Save className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
