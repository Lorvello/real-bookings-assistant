import React from 'react';

export function InlineRouteSpinner() {
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  );
}
