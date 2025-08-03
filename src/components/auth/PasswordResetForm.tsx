import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeUserInput } from '@/utils/inputSanitization';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ArrowLeft, Mail, Loader2 } from 'lucide-react';

export const PasswordResetForm: React.FC = () => {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    const sanitizedEmail = sanitizeUserInput(email, 'email');
    
    if (!sanitizedEmail) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('[PasswordReset] Sending reset email to:', sanitizedEmail);
      
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('[PasswordReset] Error:', error);
        handleError(error, 'Password reset request');
        return;
      }

      console.log('[PasswordReset] Reset email sent successfully');
      setResetSent(true);
      
      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions. If you don't see it, check your spam folder.",
      });

    } catch (error) {
      console.error('[PasswordReset] Unexpected error:', error);
      handleError(error, 'Password reset request');
    } finally {
      setLoading(false);
    }
  };

  if (resetSent) {
    return (
      <Card className="w-full max-w-md bg-card border-border shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Check Your Email
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            We've sent password reset instructions to {email}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Please check your email and click the reset link to continue.</p>
            <p>If you don't see the email, please:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Check your spam or junk folder</li>
              <li>Make sure {email} is correct</li>
              <li>Wait a few minutes for delivery</li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            <Button
              onClick={() => setResetSent(false)}
              variant="outline"
              className="w-full"
            >
              Try Different Email
            </Button>
            
            <Link to="/login">
              <Button variant="ghost" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-card border-border shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-foreground">
          Reset Your Password
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your email address and we'll send you a reset link
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">
              Email Address
            </Label>
            <Input 
              type="email" 
              id="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              placeholder="Enter your email address" 
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
                Sending Reset Email...
              </>
            ) : (
              'Send Reset Email'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login">
            <Button variant="ghost" className="text-sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};