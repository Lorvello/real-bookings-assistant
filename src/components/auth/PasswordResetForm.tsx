import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';
import { useAuthOperations } from '@/hooks/useAuthOperations';

export const PasswordResetForm: React.FC = () => {
  const { t } = useTranslation('auth');
  const { resetPassword, loading } = useAuthOperations();
  const [email, setEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await resetPassword({ email });
    
    if (result.success) {
      setResetSent(true);
    }
  };

  if (resetSent) {
    return (
      <Card className="w-full max-w-md rounded-2xl border-white/10 bg-white/[0.025] shadow-2xl shadow-black/40 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {t('auth.forgot.checkEmailTitle', 'Check Your Email')}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {t('auth.forgot.sentTo', "We've sent password reset instructions to {{email}}", { email })}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>{t('auth.forgot.checkClickLink', 'Please check your email and click the reset link to continue.')}</p>
            <p>{t('auth.forgot.ifNotSee', "If you don't see the email, please:")}</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>{t('auth.forgot.checkSpam', 'Check your spam or junk folder')}</li>
              <li>{t('auth.forgot.makeSureCorrect', 'Make sure {{email}} is correct', { email })}</li>
              <li>{t('auth.forgot.waitFew', 'Wait a few minutes for delivery')}</li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => setResetSent(false)}
              variant="outline"
              className="w-full"
            >
              {t('auth.forgot.tryDifferent', 'Try Different Email')}
            </Button>

            <Link to="/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('auth.forgot.backToLogin', 'Back to Login')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md rounded-2xl border-white/10 bg-white/[0.025] shadow-2xl shadow-black/40 backdrop-blur">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground">
          {t('auth.forgot.resetTitle', 'Reset Your Password')}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {t('auth.forgot.resetSubtitle', "Enter your email address and we'll send you a reset link")}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              {t('auth.forgot.email', 'Email Address')}
            </Label>
            <Input
              type="email"
              id="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              placeholder={t('auth.forgot.emailPlaceholder', 'Enter your email address')}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('auth.forgot.sending', 'Sending Reset Email...')}
              </>
            ) : (
              t('auth.forgot.send', 'Send Reset Email')
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login">
            <Button variant="ghost" className="text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('auth.forgot.backToLogin', 'Back to Login')}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};