
import React from 'react';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function TestAIAgent() {
  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Test Your AI Agent</h1>
          <p className="text-gray-400 mt-1">
            Test en evalueer de functionaliteit van je AI booking assistant
          </p>
        </div>

        {/* AI Agent Test Chat with Clean Styling */}
        <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl">
          <AIAgentTestChat />
        </div>
      </div>
    </DashboardLayout>
  );
}
