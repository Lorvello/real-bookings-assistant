
import React from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthShell } from '@/components/auth/AuthShell';
import { useLoginEffects } from '@/hooks/useLoginEffects';

const Login = () => {
  useLoginEffects();

  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
};

export default Login;
