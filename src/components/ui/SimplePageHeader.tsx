import React from 'react';

interface SimplePageHeaderProps {
  title: string;
}

export function SimplePageHeader({ title }: SimplePageHeaderProps) {
  return (
    <div className="mb-1 sm:mb-2 md:mb-6">
      <h1 className="text-lg sm:text-xl md:text-2xl font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
    </div>
  );
}