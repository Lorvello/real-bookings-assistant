import React from 'react';
import { Button } from '@/components/ui/button';
import { Settings, ArrowRight, Circle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';

interface SetupIncompleteOverlayProps {
  children: React.ReactNode;
}

export const SetupIncompleteOverlay: React.FC<SetupIncompleteOverlayProps> = ({ children }) => {
  const navigate = useNavigate();
  const { allSteps, completedSteps, totalSteps } = useOnboardingProgress();

  // Show exactly which steps are still missing instead of a vague "finish setup".
  const remaining = allSteps.filter((s) => !s.completed);

  // Send the CTA straight to the first missing step (same routes as the
  // OnboardingWizard) instead of dumping the user on /dashboard to hunt for it.
  const stepRoutes: Record<string, string> = {
    business_info: '/settings?tab=knowledge',
    service_types: '/settings?tab=services',
    calendar_creation: '/settings',
    availability: '/availability',
  };
  const setupTarget = remaining[0] ? (stepRoutes[remaining[0].key] ?? '/settings') : '/dashboard';

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
            <Settings className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Complete Setup To Edit This Area
            </h2>
            <p className="text-gray-400 mb-5">
              {totalSteps > 0
                ? `You've completed ${completedSteps} of ${totalSteps} setup steps. Finish the rest to unlock this area:`
                : 'Finish your business setup to access all features and start managing your bookings.'}
            </p>

            {remaining.length > 0 && (
              <ul className="mb-6 space-y-2 text-left">
                {allSteps.map((step) => (
                  <li key={step.key} className="flex items-start gap-2.5">
                    {step.completed ? (
                      <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-gray-500" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${step.completed ? 'text-gray-500 line-through' : 'text-white'}`}>
                        {step.name}
                      </p>
                      {!step.completed && (
                        <p className="text-xs text-gray-400">{step.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Button
              onClick={() => navigate(setupTarget)}
              className="bg-primary hover:bg-primary/90 text-white"
              size="lg"
            >
              <Settings className="h-4 w-4 mr-2" />
              Complete Setup
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};