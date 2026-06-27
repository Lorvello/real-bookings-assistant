
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceTypesEmptyStateProps {
  onAddService: () => void;
}

export function ServiceTypesEmptyState({ onAddService }: ServiceTypesEmptyStateProps) {
  const { t } = useTranslation('settings');
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/[0.10] text-accent-foreground">
        <Tag className="h-6 w-6" />
      </div>
      <h3 className="mb-1.5 text-base font-semibold text-foreground">{t('settings.services.emptyState.heading', 'No services yet')}</h3>
      <p className="mb-6 max-w-sm text-sm leading-6 text-muted-foreground">
        {t('settings.services.emptyState.description', 'Add your first service so customers have something to book over WhatsApp.')}
      </p>
      <Button onClick={onAddService}>
        <Plus className="mr-2 h-4 w-4" />
        {t('settings.services.emptyState.button', 'Add your first service')}
      </Button>
    </div>
  );
}
