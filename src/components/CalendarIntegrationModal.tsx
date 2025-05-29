
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  CheckCircle, 
  Loader2, 
  ExternalLink,
  Shield,
  Mail,
  User,
  RefreshCw
} from 'lucide-react';

interface CalendarProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  isComingSoon?: boolean;
}

interface CalendarIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const calendarProviders: CalendarProvider[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Most popular choice - syncs instantly',
    icon: <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">G</div>,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    description: 'Perfect for business users',
    icon: <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">O</div>,
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    description: 'Seamless integration with Mac/iPhone',
    icon: <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-white">🍎</div>,
    color: 'bg-gray-50 border-gray-200 hover:bg-gray-100'
  },
  {
    id: 'other',
    name: 'Other Calendar',
    description: 'Manual setup or other providers',
    icon: <Calendar className="w-8 h-8 text-gray-600" />,
    color: 'bg-gray-50 border-gray-200 hover:bg-gray-100'
  }
];

export const CalendarIntegrationModal: React.FC<CalendarIntegrationModalProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  const [step, setStep] = useState<'select' | 'connecting' | 'connected' | 'error'>('select');
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<{
    email: string;
    calendarName: string;
  } | null>(null);
  const [error, setError] = useState<string>('');

  const handleProviderSelect = async (provider: CalendarProvider) => {
    if (provider.id === 'other') {
      // Handle manual setup differently
      setError('Manual calendar setup is not yet available. Please choose another provider.');
      setStep('error');
      return;
    }

    setSelectedProvider(provider);
    setStep('connecting');
    setError('');

    // Simulate OAuth connection process
    try {
      // In real implementation, this would open OAuth popup/redirect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful connection
      setConnectedAccount({
        email: 'user@example.com',
        calendarName: `${provider.name} Primary`
      });
      setStep('connected');
    } catch (err) {
      setError(`Failed to connect to ${provider.name}. Please try again.`);
      setStep('error');
    }
  };

  const handleTestConnection = async () => {
    setStep('connecting');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setStep('connected');
  };

  const handleContinue = () => {
    onComplete();
    onOpenChange(false);
    // Reset state for next time
    setTimeout(() => {
      setStep('select');
      setSelectedProvider(null);
      setConnectedAccount(null);
      setError('');
    }, 300);
  };

  const handleChangeCalendar = () => {
    setStep('select');
    setSelectedProvider(null);
    setConnectedAccount(null);
    setError('');
  };

  const renderSelectStep = () => (
    <>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Calendar</h2>
        <p className="text-gray-600 mb-4">Choose your calendar provider to sync appointments automatically</p>
        <Badge variant="outline" className="text-sm">
          Step 1 of 3
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {calendarProviders.map((provider) => (
          <Card 
            key={provider.id}
            className={`cursor-pointer transition-all duration-200 ${provider.color} hover:shadow-md`}
            onClick={() => handleProviderSelect(provider)}
          >
            <CardContent className="p-6 text-center">
              <div className="flex justify-center mb-4">
                {provider.icon}
              </div>
              <h3 className="font-semibold text-lg mb-2">{provider.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{provider.description}</p>
              <Button 
                className={`w-full ${provider.id === 'other' ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-600 hover:bg-green-700'} text-white`}
                size="sm"
              >
                {provider.id === 'other' ? 'Setup' : 'Connect'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert className="border-green-200 bg-green-50">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="flex items-center justify-between">
            <span className="text-sm">
              We only access your calendar availability, not personal details
            </span>
            <Button variant="link" size="sm" className="text-green-700 p-0 h-auto">
              <ExternalLink className="h-3 w-3 ml-1" />
              Privacy Policy
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </>
  );

  const renderConnectingStep = () => (
    <div className="text-center py-8">
      <div className="flex justify-center mb-4">
        {selectedProvider?.icon}
      </div>
      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
      <h3 className="text-xl font-semibold mb-2">
        Connecting to {selectedProvider?.name}...
      </h3>
      <p className="text-gray-600">
        Please complete the authentication in the popup window
      </p>
    </div>
  );

  const renderConnectedStep = () => (
    <>
      <div className="text-center mb-6">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">✅ Connected Successfully!</h2>
        <p className="text-gray-600">Your calendar is now connected and ready to sync</p>
      </div>

      <Card className="mb-6 border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {selectedProvider?.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-green-900">{selectedProvider?.name}</h4>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex items-center gap-4 text-sm text-green-800">
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {connectedAccount?.email}
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {connectedAccount?.calendarName}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 mb-6">
        <Button 
          variant="outline" 
          onClick={handleChangeCalendar}
          className="flex-1"
        >
          Change Calendar
        </Button>
        <Button 
          variant="outline" 
          onClick={handleTestConnection}
          className="flex-1"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Test Connection
        </Button>
      </div>

      <Button 
        onClick={handleContinue}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
        size="lg"
      >
        Continue to Step 2
      </Button>
    </>
  );

  const renderErrorStep = () => (
    <div className="text-center py-8">
      <div className="text-red-500 mb-4">
        <Calendar className="h-16 w-16 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-red-900">Connection Failed</h3>
      <p className="text-red-700 mb-6">{error}</p>
      
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => setStep('select')}
          className="flex-1"
        >
          Try Again
        </Button>
        <Button 
          variant="outline" 
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Contact Support
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sr-only">
          <DialogTitle>Calendar Integration Setup</DialogTitle>
        </DialogHeader>
        
        <div className="p-2">
          {step === 'select' && renderSelectStep()}
          {step === 'connecting' && renderConnectingStep()}
          {step === 'connected' && renderConnectedStep()}
          {step === 'error' && renderErrorStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
