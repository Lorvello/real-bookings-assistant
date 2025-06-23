
import React from 'react';
import Navbar from '@/components/Navbar';
import { LoginForm } from '@/components/auth/LoginForm';
import { useLoginEffects } from '@/hooks/useLoginEffects';

const Login = () => {
  useLoginEffects();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="py-20 px-4">
        <div className="flex justify-center">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default Login;
