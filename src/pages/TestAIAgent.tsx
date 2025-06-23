
import React from 'react';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function TestAIAgent() {
  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Test Your AI Agent</h1>
          <p className="text-gray-400 mt-1">
            Test en evalueer de functionaliteit van je AI booking assistant
          </p>
        </div>

        {/* AI Agent Test Chat */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <AIAgentTestChat />
        </div>
      </div>
    </DashboardLayout>
  );
}
