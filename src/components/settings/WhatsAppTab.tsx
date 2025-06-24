
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, X } from 'lucide-react';

interface WhatsAppTabProps {
  whatsappSettings: any;
  setWhatsappSettings: (settings: any) => void;
}

export const WhatsAppTab: React.FC<WhatsAppTabProps> = ({
  whatsappSettings,
  setWhatsappSettings
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* WhatsApp Status - Always accessible */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">WhatsApp Business API</h2>
            <p className="text-sm text-gray-400 mt-1">Manage your WhatsApp booking assistant</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400">Connected</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            WhatsApp Business Number
          </label>
          <input
            type="tel"
            value={whatsappSettings.whatsapp_number}
            onChange={(e) => setWhatsappSettings({ ...whatsappSettings, whatsapp_number: e.target.value })}
            placeholder="+31 6 12345678"
            className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>
      </div>

      {/* Locked Features - Premium */}
      <div className="relative">
        {/* Overlay */}
        <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm rounded-xl z-10 flex items-center justify-center">
          <div className="text-center bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl">
            <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">WhatsApp Custom Branding</h3>
            <p className="text-gray-400 mb-6 max-w-md">
              Unlock advanced WhatsApp features including custom messages, AI responses, quick replies, and more.
            </p>
            <button
              onClick={() => navigate('/#pricing')}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Upgrade Plan to Unlock This
            </button>
          </div>
        </div>

        {/* Locked Content - Visible but disabled */}
        <div className="opacity-50 pointer-events-none space-y-8">
          {/* Business Hours Setting */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                checked={whatsappSettings.business_hours_only}
                disabled
                className="w-4 h-4 text-green-600 bg-gray-900 border-gray-700 rounded focus:ring-green-600"
              />
              <label className="text-gray-300">
                Only active during business hours
              </label>
            </div>
          </div>

          {/* Welcome Messages */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-6">Automatic Messages</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Welcome Message
                </label>
                <textarea
                  value={whatsappSettings.welcome_message}
                  disabled
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Variables: {'{business_name}'}, {'{customer_name}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Outside Hours Message
                </label>
                <textarea
                  value={whatsappSettings.outside_hours_message}
                  disabled
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Additional locked sections would go here */}
        </div>
      </div>

      {/* Save Button - Also locked */}
      <div className="relative">
        <div className="absolute inset-0 bg-gray-900/50 rounded-lg z-10"></div>
        <button
          disabled
          className="w-full py-3 px-4 bg-gray-600 text-gray-400 font-medium rounded-lg cursor-not-allowed"
        >
          Save WhatsApp Settings
        </button>
      </div>
    </div>
  );
};
