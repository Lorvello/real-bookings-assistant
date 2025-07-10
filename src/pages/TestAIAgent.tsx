
import React from 'react';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function TestAIAgent() {
  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-2 md:p-8">
        <div className="space-y-3 md:space-y-6">
          {/* Header */}
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-2 md:p-6">
            <h1 className="text-base md:text-3xl font-bold text-white">Test AI Agent</h1>
            <p className="text-gray-400 mt-1 text-xs md:text-base">
              Test your booking assistant
            </p>
          </div>

          {/* AI Agent Test Chat with Clean Styling */}
          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl h-[600px] md:h-[700px]">
            <AIAgentTestChat />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
