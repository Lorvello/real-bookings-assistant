
import React from 'react';
import { Link } from 'react-router-dom';

export const LoginLink: React.FC = () => {
  return (
    <div className="fixed bottom-4 left-4">
      <Link 
        to="/login" 
        className="text-sm text-gray-600 hover:text-gray-800 underline"
      >
        Heb je al een account? Inloggen
      </Link>
    </div>
  );
};
