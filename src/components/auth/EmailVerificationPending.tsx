import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface EmailVerificationPendingProps {
  email: string;
  onBackToLogin: () => void;
}

export const EmailVerificationPending: React.FC<EmailVerificationPendingProps> = ({
  email,
  onBackToLogin
}) => {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const [resending, setResending] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [lastResendTime, setLastResendTime] = useState<Date | null>(null);

  const canResend = () => {
    if (!lastResendTime) return true;
    const timeSinceLastResend = Date.now() - lastResendTime.getTime();
    return timeSinceLastResend > 60000; // 1 minute cooldown
  };

  const handleResendVerification = async () => {
    if (!canResend()) {
      toast({
        title: "Please Wait",
        description: "Please wait at least 1 minute before requesting another verification email.",
        variant: "destructive",
      });
      return;
    }

    setResending(true);

    try {
      console.log('[EmailVerification] Resending verification email to:', email);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        console.error('[EmailVerification] Resend error:', error);
        
        if (error.message.includes('already confirmed')) {
          toast({
            title: "Already Verified",
            description: "Your email is already verified. You can now sign in.",
          });
          onBackToLogin();
          return;
        }
        
        handleError(error, 'Email verification resend');
        return;
      }

      console.log('[EmailVerification] Verification email resent successfully');
      setResendCount(prev => prev + 1);
      setLastResendTime(new Date());
      
      toast({
        title: "Email Sent",
        description: "A new verification email has been sent. Please check your inbox and spam folder.",
      });

    } catch (error) {
      console.error('[EmailVerification] Unexpected error:', error);
      handleError(error, 'Email verification resend');
    } finally {
      setResending(false);
    }
  };

  const getNextResendTime = () => {
    if (!lastResendTime) return 0;
    const timeSinceLastResend = Date.now() - lastResendTime.getTime();
    const timeRemaining = Math.max(0, 60000 - timeSinceLastResend);
    return Math.ceil(timeRemaining / 1000);
  };

  const nextResendTime = getNextResendTime();

  return (
    <Card className="w-full max-w-md bg-card border-border shadow-xl">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">
          Verify Your Email
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          We've sent a verification link to {email}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-3">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-800">Next Steps:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Check your email inbox</li>
              <li>Click the verification link</li>
              <li>Return here to sign in</li>
            </ol>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="font-medium text-yellow-800">Can't find the email?</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-yellow-700">
              <li>Check your spam or junk folder</li>
              <li>Make sure {email} is correct</li>
              <li>Wait a few minutes for delivery</li>
              <li>Add our domain to your safe senders list</li>
            </ul>
          </div>

          {resendCount > 0 && (
            <div className="text-center text-sm text-green-600">
              ✓ Verification email sent {resendCount} time{resendCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-3">
          <Button
            onClick={handleResendVerification}
            disabled={resending || !canResend()}
            variant="outline"
            className="w-full"
          >
            {resending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : nextResendTime > 0 ? (
              `Resend in ${nextResendTime}s`
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </Button>
          
          <Button
            onClick={onBackToLogin}
            variant="ghost"
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};