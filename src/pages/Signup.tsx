
import React from 'react';
import { Link } from 'react-router-dom';
import { MultiStepRegistration } from '@/components/registration/MultiStepRegistration';

const Signup = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <MultiStepRegistration />
      
      <div className="fixed bottom-4 left-4">
        <Link 
          to="/login" 
          className="text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Heb je al een account? Inloggen
        </Link>
      </div>
    </div>
  );
};

export default Signup;
