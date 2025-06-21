
import React from 'react';
import { bookingWindowOptions } from '@/constants/settingsOptions';

interface CalendarTabProps {
  calendarSettings: any;
  setCalendarSettings: (settings: any) => void;
  loading: boolean;
  handleUpdateProfile: () => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({
  calendarSettings,
  setCalendarSettings,
  loading,
  handleUpdateProfile
}) => {
  return (
    <div className="space-y-8">
      {/* Booking Windows */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Booking Vensters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Hoe ver vooruit kunnen klanten boeken?
            </label>
            <select
              value={calendarSettings.booking_window_days}
              onChange={(e) => setCalendarSettings({
                ...calendarSettings,
                booking_window_days: parseInt(e.target.value)
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              {bookingWindowOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Minimale tijd voor boeking
            </label>
            <select
              value={calendarSettings.minimum_notice_hours}
              onChange={(e) => setCalendarSettings({
                ...calendarSettings,
                minimum_notice_hours: parseInt(e.target.value)
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="0">Direct beschikbaar</option>
              <option value="0.5">30 minuten van tevoren</option>
              <option value="1">1 uur van tevoren</option>
              <option value="2">2 uur van tevoren</option>
              <option value="3">3 uur van tevoren</option>
              <option value="4">4 uur van tevoren</option>
              <option value="6">6 uur van tevoren</option>
              <option value="12">12 uur van tevoren</option>
              <option value="24">24 uur van tevoren</option>
              <option value="48">48 uur van tevoren</option>
              <option value="72">72 uur van tevoren</option>
              <option value="168">1 week van tevoren</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tijdslot duur (minuten)
            </label>
            <select
              value={calendarSettings.slot_duration}
              onChange={(e) => setCalendarSettings({
                ...calendarSettings,
                slot_duration: parseInt(e.target.value)
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="10">10 minuten</option>
              <option value="15">15 minuten</option>
              <option value="20">20 minuten</option>
              <option value="30">30 minuten</option>
              <option value="45">45 minuten</option>
              <option value="60">60 minuten</option>
              <option value="90">90 minuten</option>
              <option value="120">120 minuten</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Slot interval (hoe vaak beginnen slots)
            </label>
            <select
              value={calendarSettings.slot_interval}
              onChange={(e) => setCalendarSettings({
                ...calendarSettings,
                slot_interval: parseInt(e.target.value)
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            >
              <option value="5">Elke 5 minuten</option>
              <option value="10">Elke 10 minuten</option>
              <option value="15">Elke 15 minuten</option>
              <option value="30">Elke 30 minuten</option>
              <option value="60">Elk uur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Buffer Times */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Buffer Tijden</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buffer tijd voor afspraak (minuten)
            </label>
            <input
              type="number"
              value={calendarSettings.buffer_time_before}
              onChange={(e) => setCalendarSettings({
                ...calendarSettings,
                buffer_time_before: parseInt(e.target.value)
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              min="0"
              max="60"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buffer tijd na afspraak (minuten)
            </label>
            <input
              type="number"
              value={calendarSettings.buffer_time_after}
              onChange={(e) => setCalendarSettings({
                ...calendarSettings,
                buffer_time_after: parseInt(e.target.value)
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              min="0"
              max="60"
            />
          </div>
        </div>
      </div>

      {/* Werkdagen */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Werkdagen</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries({
            monday: 'Maandag',
            tuesday: 'Dinsdag',
            wednesday: 'Woensdag',
            thursday: 'Donderdag',
            friday: 'Vrijdag',
            saturday: 'Zaterdag',
            sunday: 'Zondag'
          }).map(([key, label]) => (
            <label key={key} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={calendarSettings.working_days[key]}
                onChange={(e) => setCalendarSettings({
                  ...calendarSettings,
                  working_days: {
                    ...calendarSettings.working_days,
                    [key]: e.target.checked
                  }
                })}
                className="w-4 h-4 text-green-600 bg-gray-900 border-gray-700 rounded focus:ring-green-600"
              />
              <span className="text-gray-300">{label}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Standaard starttijd
            </label>
            <input
              type="time"
              value={calendarSettings.default_start_time}
              onChange={(e) => setCalendarSettings({
                ...calendarSettings,
                default_start_time: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Standaard eindtijd
            </label>
            <input
              type="time"
              value={calendarSettings.default_end_time}
              onChange={(e) => setCalendarSettings({
                ...calendarSettings,
                default_end_time: e.target.value
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Limieten */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Booking Limieten</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max bookings per dag (leeg = onbeperkt)
            </label>
            <input
              type="number"
              value={calendarSettings.max_bookings_per_day || ''}
              onChange={(e) => setCalendarSettings({
                ...calendarSettings,
                max_bookings_per_day: e.target.value ? parseInt(e.target.value) : null
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max bookings per klant per dag
            </label>
            <input
              type="number"
              value={calendarSettings.max_bookings_per_customer_per_day}
              onChange={(e) => setCalendarSettings({
                ...calendarSettings,
                max_bookings_per_customer_per_day: parseInt(e.target.value)
              })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-green-600 focus:border-transparent"
              min="1"
              max="10"
            />
          </div>
        </div>
      </div>

      {/* Herinneringen */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-6">Automatische Herinneringen</h2>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Eerste herinnering</h3>
              <p className="text-sm text-gray-400">Stuur automatisch een herinnering</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={calendarSettings.reminder_hours_before}
                onChange={(e) => setCalendarSettings({
                  ...calendarSettings,
                  reminder_hours_before: parseInt(e.target.value)
                })}
                disabled={!calendarSettings.reminder_enabled}
                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              >
                <option value="1">1 uur</option>
                <option value="2">2 uur</option>
                <option value="4">4 uur</option>
                <option value="12">12 uur</option>
                <option value="24">24 uur</option>
                <option value="48">48 uur</option>
              </select>
              <button
                onClick={() => setCalendarSettings({
                  ...calendarSettings,
                  reminder_enabled: !calendarSettings.reminder_enabled
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  calendarSettings.reminder_enabled ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    calendarSettings.reminder_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
            <div>
              <h3 className="text-white font-medium">Tweede herinnering</h3>
              <p className="text-sm text-gray-400">Extra herinnering vlak voor afspraak</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={calendarSettings.second_reminder_hours_before}
                onChange={(e) => setCalendarSettings({
                  ...calendarSettings,
                  second_reminder_hours_before: parseInt(e.target.value)
                })}
                disabled={!calendarSettings.second_reminder_enabled}
                className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
              >
                <option value="1">1 uur</option>
                <option value="2">2 uur</option>
                <option value="3">3 uur</option>
              </select>
              <button
                onClick={() => setCalendarSettings({
                  ...calendarSettings,
                  second_reminder_enabled: !calendarSettings.second_reminder_enabled
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                  calendarSettings.second_reminder_enabled ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    calendarSettings.second_reminder_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleUpdateProfile}
        disabled={loading}
        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Opslaan...' : 'Kalender Instellingen Opslaan'}
      </button>
    </div>
  );
};
