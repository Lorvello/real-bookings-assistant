
import React from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProfileTabProps {
  profileData: any;
  setProfileData: (data: any) => void;
  loading: boolean;
  handleUpdateProfile: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profileData,
  setProfileData,
  loading,
  handleUpdateProfile
}) => {
  return (
    <div className="space-y-8">
      {/* Save Button */}
      <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-4">
        <div className="flex items-center space-x-3">
          <Save className="h-5 w-5 text-green-400" />
          <div>
            <p className="text-white font-medium">Wijzigingen Opslaan</p>
            <p className="text-gray-400 text-sm">Bewaar je profielgegevens</p>
          </div>
        </div>
        <Button
          onClick={handleUpdateProfile}
          disabled={loading}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Bezig met opslaan...' : 'Profiel Opslaan'}
        </Button>
      </div>

      {/* Basic Information */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Basisinformatie</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Volledige Naam *
            </label>
            <input
              type="text"
              value={profileData.full_name}
              onChange={(e) => setProfileData({
                ...profileData,
                full_name: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({
                ...profileData,
                email: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Telefoonnummer *
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({
                ...profileData,
                phone: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Geboortedatum
            </label>
            <input
              type="date"
              value={profileData.date_of_birth}
              onChange={(e) => setProfileData({
                ...profileData,
                date_of_birth: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Taal
            </label>
            <select
              value={profileData.language}
              onChange={(e) => setProfileData({
                ...profileData,
                language: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="nl">Nederlands</option>
              <option value="en">Engels</option>
              <option value="de">Duits</option>
              <option value="fr">Frans</option>
              <option value="es">Spaans</option>
              <option value="tr">Turks</option>
              <option value="ar">Arabisch</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tijdzone
            </label>
            <select
              value={profileData.timezone}
              onChange={(e) => setProfileData({
                ...profileData,
                timezone: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="Europe/Amsterdam">Amsterdam (CET)</option>
              <option value="Europe/London">Londen (GMT)</option>
              <option value="America/New_York">New York (EST)</option>
              <option value="America/Los_Angeles">Los Angeles (PST)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Adresgegevens</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Straatnaam
            </label>
            <input
              type="text"
              value={profileData.address_street}
              onChange={(e) => setProfileData({
                ...profileData,
                address_street: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Huisnummer
            </label>
            <input
              type="text"
              value={profileData.address_number}
              onChange={(e) => setProfileData({
                ...profileData,
                address_number: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Postcode
            </label>
            <input
              type="text"
              value={profileData.address_postal}
              onChange={(e) => setProfileData({
                ...profileData,
                address_postal: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Plaats
            </label>
            <input
              type="text"
              value={profileData.address_city}
              onChange={(e) => setProfileData({
                ...profileData,
                address_city: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Social Media & Website</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Website
            </label>
            <input
              type="url"
              value={profileData.website}
              onChange={(e) => setProfileData({
                ...profileData,
                website: e.target.value
              })}
              placeholder="https://www.voorbeeld.nl"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Instagram
            </label>
            <input
              type="text"
              value={profileData.instagram}
              onChange={(e) => setProfileData({
                ...profileData,
                instagram: e.target.value
              })}
              placeholder="@gebruikersnaam"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Facebook
            </label>
            <input
              type="text"
              value={profileData.facebook}
              onChange={(e) => setProfileData({
                ...profileData,
                facebook: e.target.value
              })}
              placeholder="facebook.com/paginanaam"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
