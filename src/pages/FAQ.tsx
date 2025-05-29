
import React from 'react';
import Navbar from '@/components/Navbar';

const FAQ = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-4xl mx-auto py-20 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600">
            Coming soon - We're preparing comprehensive answers to all your questions about AI booking automation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;
