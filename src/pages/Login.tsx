
import React from 'react';
import Navbar from '@/components/Navbar';
import { LoginForm } from '@/components/auth/LoginForm';
import { useLoginEffects } from '@/hooks/useLoginEffects';

const Login = () => {
  useLoginEffects();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2C3E50' }}>
      <Navbar />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
