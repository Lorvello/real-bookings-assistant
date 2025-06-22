
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, CheckCircle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserRegistration } from '@/hooks/useUserRegistration';
import { AccountDetailsStep } from './steps/AccountDetailsStep';
import { BusinessInfoStep } from './steps/BusinessInfoStep';
import { ServiceTypesStep } from './steps/ServiceTypesStep';
import { AvailabilityStep } from './steps/AvailabilityStep';
import { ReviewStep } from './steps/ReviewStep';

interface RegistrationData {
  // Account details
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  
  // Business info
  businessName: string;
  businessType: string;
  businessAddress: {
    street: string;
    number: string;
    postal: string;
    city: string;
    country: string;
  };
  businessEmail: string;
  
  // Service types
  serviceTypes: Array<{
    name: string;
    duration: number;
    price?: number;
    description?: string;
  }>;
  
  // Availability
  availability: {
    monday: { start: string; end: string } | null;
    tuesday: { start: string; end: string } | null;
    wednesday: { start: string; end: string } | null;
    thursday: { start: string; end: string } | null;
    friday: { start: string; end: string } | null;
    saturday: { start: string; end: string } | null;
    sunday: { start: string; end: string } | null;
  };
}

const initialData: RegistrationData = {
  email: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  businessName: '',
  businessType: '',
  businessAddress: {
    street: '',
    number: '',
    postal: '',
    city: '',
    country: 'Nederland'
  },
  businessEmail: '',
  serviceTypes: [],
  availability: {
    monday: { start: '09:00', end: '17:00' },
    tuesday: { start: '09:00', end: '17:00' },
    wednesday: { start: '09:00', end: '17:00' },
    thursday: { start: '09:00', end: '17:00' },
    friday: { start: '09:00', end: '17:00' },
    saturday: null,
    sunday: null
  }
};

const steps = [
  { id: 1, title: 'Account Details', description: 'Basis accountgegevens' },
  { id: 2, title: 'Bedrijfsinfo', description: 'Bedrijfs- en contactgegevens' },
  { id: 3, title: 'Service Types', description: 'Wat voor diensten bied je aan?' },
  { id: 4, title: 'Beschikbaarheid', description: 'Wanneer ben je beschikbaar?' },
  { id: 5, title: 'Overzicht', description: 'Controleer je gegevens' }
];

export const MultiStepRegistration: React.FC = () => {
  const navigate = useNavigate();
  const { registerUser, loading } = useUserRegistration();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<RegistrationData>(initialData);
  const [error, setError] = useState('');

  const updateData = (updates: Partial<RegistrationData>) => {
    setData(prev => ({ ...prev, ...updates }));
    if (error) setError('');
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!data.email || !data.password || !data.fullName) {
          setError('Vul alle verplichte velden in');
          return false;
        }
        if (data.password !== data.confirmPassword) {
          setError('Wachtwoorden komen niet overeen');
          return false;
        }
        if (data.password.length < 6) {
          setError('Wachtwoord moet minimaal 6 karakters lang zijn');
          return false;
        }
        break;
      case 2:
        if (!data.businessName || !data.businessType || !data.businessEmail) {
          setError('Vul alle verplichte bedrijfsgegevens in');
          return false;
        }
        break;
      case 3:
        if (data.serviceTypes.length === 0) {
          setError('Voeg minimaal één service type toe');
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setError('');
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep - 1)) return;

    try {
      const result = await registerUser(data);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Registratie gefaald');
      }
    } catch (error: any) {
      setError('Er is een onverwachte fout opgetreden');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <AccountDetailsStep data={data} updateData={updateData} />;
      case 2:
        return <BusinessInfoStep data={data} updateData={updateData} />;
      case 3:
        return <ServiceTypesStep data={data} updateData={updateData} />;
      case 4:
        return <AvailabilityStep data={data} updateData={updateData} />;
      case 5:
        return <ReviewStep data={data} />;
      default:
        return null;
    }
  };

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-4xl">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">
              Account Aanmaken
            </CardTitle>
            <CardDescription className="text-lg">
              Stap {currentStep} van {steps.length}: {steps[currentStep - 1].title}
            </CardDescription>
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step Indicator */}
            <div className="flex justify-between items-center mb-8">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.id < currentStep 
                      ? 'bg-green-600 text-white' 
                      : step.id === currentStep 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step.id < currentStep ? <CheckCircle className="w-4 h-4" /> : step.id}
                  </div>
                  <div className="text-xs text-center mt-1 max-w-20">
                    <div className="font-medium">{step.title}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Info Banner */}
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Let op:</strong> Alle informatie die je hier invult kan later nog worden aangepast in de instellingen van je account.
              </AlertDescription>
            </Alert>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step Content */}
            <div className="min-h-[400px]">
              {renderStep()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Vorige</span>
              </Button>

              {currentStep < steps.length ? (
                <Button
                  onClick={nextStep}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                >
                  <span>Volgende</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Account aanmaken...' : 'Account Aanmaken'}
                  <CheckCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
