
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full bg-gray-900">
          <div className="text-center">
            <div className="w-8 h-8 bg-cyan-600 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-lg text-gray-300">Loading Profile...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-900 min-h-full p-3 md:p-8">
        <div className="mb-4 md:mb-8">
          <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-3 md:p-6">
            <h1 className="text-lg md:text-3xl font-bold text-white mb-1 md:mb-2">
              Profile
            </h1>
            <p className="text-gray-400 text-xs md:text-base">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-3 md:p-6 border border-gray-700">
          <h2 className="text-base md:text-xl font-semibold text-white mb-4 md:mb-6">Account Information</h2>
          
          <div className="space-y-3 md:space-y-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                Email
              </label>
              <div className="w-full px-3 md:px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm md:text-base">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                User ID
              </label>
              <div className="w-full px-3 md:px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-xs md:text-sm">
                {user.id}
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1 md:mb-2">
                Account Created
              </label>
              <div className="w-full px-3 md:px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm md:text-base">
                {new Date(user.created_at).toLocaleDateString('nl-NL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
