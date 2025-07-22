
import React from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { useLoginEffects } from '@/hooks/useLoginEffects';

const Login = () => {
  useLoginEffects();

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#2C3E50' }}>
      <LoginForm />
    </div>
  );
};

export default Login;
