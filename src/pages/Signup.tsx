
import React from 'react';
import { MultiStepRegistration } from '@/components/registration/MultiStepRegistration';
import { LoginLink } from '@/components/auth/LoginLink';

const Signup = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <MultiStepRegistration />
      <LoginLink />
    </div>
  );
};

export default Signup;
