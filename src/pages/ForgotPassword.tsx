import React from 'react';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';

const ForgotPassword = () => {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#2C3E50' }}>
      <PasswordResetForm />
    </div>
  );
};

export default ForgotPassword;