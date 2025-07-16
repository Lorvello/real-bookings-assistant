import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Settings, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SetupIncompleteMessageProps {
  title: string;
  message: string;
  actionText?: string;
  actionLink?: string;
}

export const SetupIncompleteMessage: React.FC<SetupIncompleteMessageProps> = ({
  title,
  message,
  actionText = "Complete Setup",
  actionLink = "/settings"
}) => {
  const navigate = useNavigate();

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <AlertCircle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Alert className="border-yellow-200 bg-yellow-50 mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-yellow-800">
            {message}
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-between items-center">
          <p className="text-sm text-yellow-700">
            Please complete your setup to access this feature.
          </p>
          <Button 
            onClick={() => navigate(actionLink)}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            {actionText}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};