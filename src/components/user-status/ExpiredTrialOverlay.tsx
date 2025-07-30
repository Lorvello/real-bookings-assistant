import React from 'react';
import { Button } from '@/components/ui/button';
import { Crown, ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ExpiredTrialOverlayProps {
  children: React.ReactNode;
}

export const ExpiredTrialOverlay: React.FC<ExpiredTrialOverlayProps> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Background content */}
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
        <div className="text-center p-8 max-w-md mx-auto">
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <Lock className="h-12 w-12 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Trial Expired
            </h2>
            <p className="text-gray-400 mb-6">
              Your free trial has ended. Upgrade to a premium plan to continue using the AI agent and access all features.
            </p>
            <Button 
              onClick={() => navigate('/settings')}
              className="bg-primary hover:bg-primary/90 text-white"
              size="lg"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};