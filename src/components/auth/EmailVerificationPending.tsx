import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('auth');
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
        title: t('auth.verify.toastWaitTitle', 'Please Wait'),
        description: t('auth.verify.toastWaitDesc', 'Please wait at least 1 minute before requesting another verification email.'),
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
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('[EmailVerification] Resend error:', error);

        if (error.message.includes('already confirmed')) {
          toast({
            title: t('auth.verify.toastVerifiedTitle', 'Already Verified'),
            description: t('auth.verify.toastVerifiedDesc', 'Your email is already verified. You can now sign in.'),
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
        title: t('auth.verify.toastSentTitle', 'Email Sent'),
        description: t('auth.verify.toastSentDesc', 'A new verification email has been sent. Please check your inbox and spam folder.'),
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
    <Card className="w-full max-w-md rounded-2xl border-white/10 bg-white/[0.025] shadow-2xl shadow-black/40 backdrop-blur">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-primary/15 ring-1 ring-primary/25">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold text-foreground">
          {t('auth.verify.title', 'Verify Your Email')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('auth.verify.subtitle', "We've sent a verification link to {{email}}", { email })}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-3">
          <div className="p-3 rounded-lg bg-primary/[0.06] border border-primary/20">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="font-medium text-foreground">{t('auth.verify.nextSteps', 'Next Steps:')}</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-foreground/70">
              <li>{t('auth.verify.step1', 'Check your email inbox')}</li>
              <li>{t('auth.verify.step2', 'Click the verification link')}</li>
              <li>{t('auth.verify.step3', 'Return here to sign in')}</li>
            </ol>
          </div>

          <div className="p-3 rounded-lg bg-amber-500/[0.06] border border-amber-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span className="font-medium text-amber-200">{t('auth.verify.cantFind', "Can't find the email?")}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-100/70">
              <li>{t('auth.verify.tip1', 'Check your spam or junk folder')}</li>
              <li>{t('auth.verify.tip2', 'Make sure {{email}} is correct', { email })}</li>
              <li>{t('auth.verify.tip3', 'Wait a few minutes for delivery')}</li>
              <li>{t('auth.verify.tip4', 'Add our domain to your safe senders list')}</li>
            </ul>
          </div>

          {resendCount > 0 && (
            <div className="text-center text-sm text-emerald-400">
              {t('auth.verify.sentConfirm', '✓ Verification email sent {{count}} time{{plural}}', { count: resendCount, plural: resendCount > 1 ? 's' : '' })}
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
                {t('auth.verify.sending', 'Sending...')}
              </>
            ) : nextResendTime > 0 ? (
              t('auth.verify.resendIn', 'Resend in {{seconds}}s', { seconds: nextResendTime })
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('auth.verify.resend', 'Resend Verification Email')}
              </>
            )}
          </Button>

          <Button
            onClick={onBackToLogin}
            variant="ghost"
            className="w-full"
          >
            {t('auth.verify.backToLogin', 'Back to Login')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
