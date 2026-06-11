
import React from 'react';
import { StreamlinedSignup } from '@/components/registration/StreamlinedSignup';
import { AuthShell } from '@/components/auth/AuthShell';

const Signup = () => {
  return (
    <AuthShell>
      <StreamlinedSignup />
    </AuthShell>
  );
};

export default Signup;
