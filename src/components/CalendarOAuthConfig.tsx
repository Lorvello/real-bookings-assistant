
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
import { Settings, Save, AlertTriangle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
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

  const ensureProvidersExist = async () => {
    const requiredProviders = ['google', 'microsoft'];
    
    for (const providerName of requiredProviders) {
      const { data: existing } = await supabase
        .from('oauth_providers')
        .select('id')
        .eq('provider', providerName)
        .single();

      if (!existing) {
        await supabase
          .from('oauth_providers')
          .insert({
            provider: providerName,
            client_id: null,
            client_secret: null,
            is_active: false
          });
      }
    }
  };

  const fetchProviders = async () => {
    try {
      // Ensure providers exist first
      await ensureProvidersExist();
      
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
      // Auto-activate if both client_id and client_secret are provided
      if (updates.client_id && updates.client_secret) {
        updates.is_active = true;
      }

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

  const checkEnvironmentVariable = (provider: string) => {
    const varName = provider === 'google' ? 'VITE_GOOGLE_CLIENT_ID' : 'VITE_OUTLOOK_CLIENT_ID';
    const value = import.meta.env[varName];
    return {
      name: varName,
      present: !!(value && value.trim() !== ''),
      value: value
    };
  };

  const getSetupInstructions = (provider: string) => {
    if (provider === 'google') {
      return {
        consoleUrl: 'https://console.developers.google.com/',
        consoleName: 'Google Cloud Console',
        steps: [
          'Go to Google Cloud Console and create/select a project',
          'Enable the Google Calendar API',
          'Go to Credentials → Create OAuth 2.0 Client ID',
          'Set Application type to "Web application"',
          `Add redirect URI: ${window.location.origin}/auth/google/callback`,
          'Copy the Client ID and Client Secret below',
          'Set environment variable: VITE_GOOGLE_CLIENT_ID=your_client_id'
        ]
      };
    } else {
      return {
        consoleUrl: 'https://portal.azure.com/',
        consoleName: 'Microsoft Azure Portal',
        steps: [
          'Go to Azure Portal → App registrations',
          'Create a new registration',
          'Set redirect URI to your app URL',
          'Copy the Client ID and Client Secret',
          'Set environment variable: VITE_OUTLOOK_CLIENT_ID=your_client_id'
        ]
      };
    }
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
      <SheetContent className="w-[700px] sm:w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Calendar OAuth Configuration</SheetTitle>
          <SheetDescription>
            Configure OAuth credentials for calendar providers. Follow the step-by-step instructions below.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {providers.map((provider) => {
            const envVar = checkEnvironmentVariable(provider.provider);
            const instructions = getSetupInstructions(provider.provider);
            const isFullyConfigured = provider.client_id && provider.client_secret && envVar.present;
            
            return (
              <Card key={provider.id} className={isFullyConfigured ? 'border-green-500' : 'border-orange-500'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {provider.provider === 'google' ? (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">G</div>
                    ) : (
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">O</div>
                    )}
                    {provider.provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'}
                    {isFullyConfigured ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Setup Instructions */}
                  <Alert className="border-blue-200 bg-blue-50">
                    <AlertTriangle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <div className="mb-2">
                        <strong>Setup Instructions:</strong>
                        <a 
                          href={instructions.consoleUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:underline inline-flex items-center"
                        >
                          Open {instructions.consoleName} <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        {instructions.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </AlertDescription>
                  </Alert>

                  {/* Environment Variable Status */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-sm font-medium">Environment Variable Status</Label>
                      {envVar.present ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>{envVar.name}:</strong> {envVar.present ? (
                        <span className="text-green-600">✓ Set (value: {envVar.value?.substring(0, 10)}...)</span>
                      ) : (
                        <span className="text-red-600">✗ Not set or empty</span>
                      )}
                    </div>
                    {!envVar.present && (
                      <div className="text-xs text-red-600 mt-1">
                        Add this to your environment variables or .env.local file
                      </div>
                    )}
                  </div>

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
                    <strong>Redirect URI:</strong> {window.location.origin}/auth/{provider.provider === 'google' ? 'google' : 'outlook'}/callback
                  </div>
                  
                  {!envVar.present && (
                    <Alert className="border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <strong>Missing Environment Variable:</strong> You need to set {envVar.name} in your environment.
                        <br />
                        For local development, add it to your .env.local file:
                        <br />
                        <code className="bg-gray-100 px-1 rounded text-xs">{envVar.name}=your_client_id_here</code>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button 
                    onClick={() => updateProvider(provider.id, {
                      client_id: provider.client_id,
                      client_secret: provider.client_secret
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
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
