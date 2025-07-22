
import React from 'react';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function TestAIAgent() {
  return (
    <DashboardLayout>
      <div className="bg-background min-h-full p-2 md:p-8">
        <div className="space-y-3 md:space-y-6">
          {/* Header */}
          <div className="bg-card border border-border rounded-2xl shadow-lg p-2 md:p-6">
            <h1 className="text-base md:text-3xl font-bold text-white">Test AI Agent</h1>
            <p className="text-gray-400 mt-1 text-xs md:text-base">
              Test your booking assistant
            </p>
          </div>

          <div className="bg-card backdrop-blur-sm border border-border shadow-lg rounded-xl h-[600px] md:h-[700px]">
            <AIAgentTestChat />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
