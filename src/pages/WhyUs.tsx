
import React from 'react';
import Navbar from '@/components/Navbar';

const WhyUs = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-4xl mx-auto py-20 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Why Choose Us
          </h1>
          <p className="text-xl text-gray-600">
            Coming soon - Discover what makes our AI booking solution the best choice for your business.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhyUs;
