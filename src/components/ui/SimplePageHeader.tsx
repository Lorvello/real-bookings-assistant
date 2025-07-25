import React from 'react';

interface SimplePageHeaderProps {
  title: string;
}

export function SimplePageHeader({ title }: SimplePageHeaderProps) {
  return (
    <div className="mb-6 hidden sm:block">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
    </div>
  );
}