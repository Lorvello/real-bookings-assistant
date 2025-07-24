
import React from 'react';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { DashboardLayout } from '@/components/DashboardLayout';
import { SimplePageHeader } from '@/components/ui/SimplePageHeader';

export default function TestAIAgent() {
  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-2 md:p-8">
        <div className="space-y-3 md:space-y-6">
          <SimplePageHeader title="Test AI Agent" />

          <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl h-[600px] md:h-[700px]">
            <AIAgentTestChat />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
