import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ContactListSidebar } from './ContactListSidebar';
import { ConversationDetailPanel } from './ConversationDetailPanel';
import { useWhatsAppContactOverview } from '@/hooks/useWhatsAppContactOverview';
import { WhatsAppContactOverview } from '@/types/whatsappOverview';
import { MessageSquare, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WhatsAppUnifiedViewProps {
  calendarId: string;
}

export function WhatsAppUnifiedView({ calendarId }: WhatsAppUnifiedViewProps) {
  const { t } = useTranslation('appPages');
  const [selectedContact, setSelectedContact] = useState<WhatsAppContactOverview | null>(null);
  const { data: contacts, isLoading, isError, refetch } = useWhatsAppContactOverview(calendarId);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const handleSelectContact = (contact: WhatsAppContactOverview) => {
    setSelectedContact(contact);
    setMobileShowDetail(true);
  };

  const handleBackToList = () => {
    setMobileShowDetail(false);
  };

  // A failed contact-overview fetch must not render as an empty contact list the owner
  // could mistake for "no contacts" (FQ-STATE-WAUNIFIED). Show a recoverable error card.
  if (isError) {
    return (
      <div className="flex h-full min-h-[16rem] items-center justify-center">
        <div
          className="surface-raised fade-up flex max-w-md flex-col items-center gap-3 rounded-2xl px-8 py-12 text-center"
          role="alert"
        >
          <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
            <AlertCircle aria-hidden="true" className="h-6 w-6 text-destructive-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">{t('convPage.errorTitle', "Couldn't load your conversations")}</p>
          <p className="max-w-xs text-xs text-subtle-foreground">
            {t('convPage.errorDescription', 'Something went wrong while loading your WhatsApp data. Please try again.')}
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()} className="mt-1 gap-1.5">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> {t('convPage.errorRetry', 'Try again')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-6 h-full">
        <div className="lg:col-span-4 h-full">
          <ContactListSidebar
            contacts={contacts || []}
            selectedContactId={selectedContact?.contact_id || null}
            onSelectContact={handleSelectContact}
            isLoading={isLoading}
          />
        </div>

        <div className="lg:col-span-8 h-full">
          {selectedContact ? (
            <ConversationDetailPanel key={selectedContact.contact_id} contact={selectedContact} calendarId={calendarId} />
          ) : (
            <div className="h-full surface-raised rounded-xl flex items-center justify-center">
              <div className="text-center px-6">
                <div className="glow-accent relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                  <MessageSquare aria-hidden="true" className="h-6 w-6 text-accent-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-1">{t('convPage.selectContactTitle', 'Select a contact')}</h3>
                <p className="text-sm text-muted-foreground">{t('convPage.selectContactDescription', 'Choose a contact on the left to view the conversation.')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden h-full">
        {mobileShowDetail && selectedContact ? (
          <div className="h-full flex flex-col">
            <Button variant="ghost" size="sm" onClick={handleBackToList} className="self-start mb-3 gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('convPage.backToListButton', 'Back to list')}
            </Button>
            <div className="flex-1 min-h-0">
              <ConversationDetailPanel key={selectedContact.contact_id} contact={selectedContact} calendarId={calendarId} />
            </div>
          </div>
        ) : (
          <ContactListSidebar
            contacts={contacts || []}
            selectedContactId={selectedContact?.contact_id || null}
            onSelectContact={handleSelectContact}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
