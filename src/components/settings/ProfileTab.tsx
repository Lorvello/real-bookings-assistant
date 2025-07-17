
import React from 'react';
import Select from 'react-select';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { businessTypes } from '@/constants/settingsOptions';

interface ProfileTabProps {
  profileData: any;
  setProfileData: (data: any) => void;
  businessData: any;
  setBusinessData: (data: any) => void;
  loading: boolean;
  handleUpdateProfile: () => void;
  handleUpdateBusiness: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profileData,
  setProfileData,
  businessData,
  setBusinessData,
  loading,
  handleUpdateProfile,
  handleUpdateBusiness
}) => {
  const handleSaveAll = () => {
    handleUpdateProfile();
    handleUpdateBusiness();
  };
  return (
    <div className="space-y-8">
      {/* Save Button */}
      <div className="flex items-center justify-between bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-4">
        <div className="flex items-center space-x-3">
          <Save className="h-5 w-5 text-green-400" />
          <div>
            <p className="text-white font-medium">Wijzigingen Opslaan</p>
            <p className="text-gray-400 text-sm">Bewaar je profiel- en bedrijfsgegevens</p>
          </div>
        </div>
        <Button
          onClick={handleSaveAll}
          disabled={loading}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Bezig met opslaan...' : 'Alles Opslaan'}
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

      {/* Business Information */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Bedrijfsinformatie</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bedrijfsnaam *
            </label>
            <input 
              type="text" 
              value={businessData.business_name} 
              onChange={e => setBusinessData({
                ...businessData,
                business_name: e.target.value
              })} 
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bedrijfstype *
            </label>
            <Select 
              value={businessTypes.find(type => type.value === businessData.business_type)} 
              onChange={option => setBusinessData({
                ...businessData,
                business_type: option?.value || ''
              })} 
              options={businessTypes} 
              className="react-select-container" 
              classNamePrefix="react-select" 
              placeholder="Zoek en selecteer bedrijfstype..." 
              isSearchable 
              styles={{
                control: base => ({
                  ...base,
                  backgroundColor: '#111827',
                  borderColor: '#374151',
                  '&:hover': {
                    borderColor: '#10B981'
                  }
                }),
                menu: base => ({
                  ...base,
                  backgroundColor: '#111827'
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected ? '#10B981' : state.isFocused ? '#1F2937' : '#111827',
                  color: 'white'
                }),
                singleValue: base => ({
                  ...base,
                  color: 'white'
                }),
                input: base => ({
                  ...base,
                  color: 'white'
                })
              }} 
            />
            
            {businessData.business_type === 'other' && (
              <input 
                type="text" 
                value={businessData.business_type_other} 
                onChange={e => setBusinessData({
                  ...businessData,
                  business_type_other: e.target.value
                })} 
                placeholder="Specificeer bedrijfstype..." 
                className="mt-2 w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Bedrijfsomschrijving
            </label>
            <textarea 
              value={businessData.business_description} 
              onChange={e => setBusinessData({
                ...businessData,
                business_description: e.target.value
              })} 
              rows={4} 
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              placeholder="Vertel klanten over uw bedrijf..." 
            />
          </div>
        </div>
      </div>

      {/* Business Address */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Bedrijfs Adresgegevens</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Straatnaam
            </label>
            <input
              type="text"
              value={businessData.business_street}
              onChange={(e) => setBusinessData({
                ...businessData,
                business_street: e.target.value
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
              value={businessData.business_number}
              onChange={(e) => setBusinessData({
                ...businessData,
                business_number: e.target.value
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
              value={businessData.business_postal}
              onChange={(e) => setBusinessData({
                ...businessData,
                business_postal: e.target.value
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
              value={businessData.business_city}
              onChange={(e) => setBusinessData({
                ...businessData,
                business_city: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Land
            </label>
            <input
              type="text"
              value={businessData.business_country}
              onChange={(e) => setBusinessData({
                ...businessData,
                business_country: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Business Knowledge Base */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Booking Agent Knowledge Base</h2>
        <p className="text-sm text-gray-400 mb-6">Deze informatie wordt gebruikt door de AI booking agent om klanten te helpen bij vragen</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Parkeerinformatie
            </label>
            <textarea 
              value={businessData.parking_info} 
              onChange={e => setBusinessData({
                ...businessData,
                parking_info: e.target.value
              })} 
              rows={3} 
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              placeholder="bijv. Gratis parkeren voor de deur, Betaald parkeren in garage om de hoek..." 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Openbaar Vervoer
            </label>
            <textarea 
              value={businessData.public_transport_info} 
              onChange={e => setBusinessData({
                ...businessData,
                public_transport_info: e.target.value
              })} 
              rows={3} 
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              placeholder="bijv. 5 minuten lopen vanaf station, Bus 12 stopt voor de deur..." 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Toegankelijkheid
            </label>
            <textarea 
              value={businessData.accessibility_info} 
              onChange={e => setBusinessData({
                ...businessData,
                accessibility_info: e.target.value
              })} 
              rows={3} 
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              placeholder="bijv. Rolstoeltoegankelijk, Lift aanwezig, Geen drempels..." 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Overige Informatie
            </label>
            <textarea 
              value={businessData.other_info} 
              onChange={e => setBusinessData({
                ...businessData,
                other_info: e.target.value
              })} 
              rows={3} 
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent" 
              placeholder="Overige informatie die nuttig kan zijn voor klanten..." 
            />
          </div>
        </div>
      </div>
    </div>
  );
};
