
import React from 'react';

export function BookingsHeader() {
  return (
    <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-4">
      <h1 className="text-xl font-bold text-white">My Bookings</h1>
      <p className="text-gray-400 mt-1">
        Overview of all your appointments
      </p>
    </div>
  );
}
