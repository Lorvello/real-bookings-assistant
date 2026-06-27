
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface BookingFormActionsProps {
  onClose: () => void;
  isCreating: boolean;
}

export function BookingFormActions({ onClose, isCreating }: BookingFormActionsProps) {
  const { t } = useTranslation('appPages');
  return (
    <div className="flex justify-end space-x-2 pt-4 border-t border-border">
      <Button type="button" variant="outline" onClick={onClose}>
        {t('convPage.cancelButton', 'Cancel')}
      </Button>
      <Button type="submit" disabled={isCreating}>
        {isCreating ? t('convPage.savingLoadingState', 'Saving...') : t('convPage.saveButton', 'Save')}
      </Button>
    </div>
  );
}
