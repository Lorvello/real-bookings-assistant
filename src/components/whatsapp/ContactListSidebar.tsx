import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContactListItem } from './ContactListItem';
import { SkeletonSwap } from '@/components/ui/SkeletonSwap';
import { WhatsAppContactOverview } from '@/types/whatsappOverview';
import { Search, Users } from 'lucide-react';

interface ContactListSidebarProps {
  contacts: WhatsAppContactOverview[];
  selectedContactId: string | null;
  onSelectContact: (contact: WhatsAppContactOverview) => void;
  isLoading?: boolean;
}

export function ContactListSidebar({ 
  contacts, 
  selectedContactId, 
  onSelectContact,
  isLoading 
}: ContactListSidebarProps) {
  const { t } = useTranslation('appPages');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const displayName = contact.display_name || 
      [contact.first_name, contact.last_name].filter(Boolean).join(' ');
    const businessName = contact.all_bookings?.[0]?.business_name;
    return (
      displayName.toLowerCase().includes(query) ||
      contact.phone_number.includes(query) ||
      businessName?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col h-full surface-raised rounded-xl">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Users aria-hidden="true" className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">{t('convPage.contactsHeader', 'Contacts')}</h2>
          <span className="text-xs text-muted-foreground ml-auto tabular-nums">
            {searchQuery ? `${filteredContacts.length} / ${contacts.length}` : `${contacts.length} total`}
          </span>
        </div>

        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label={t('convPage.searchContactsAriaLabel', 'Search contacts')}
            placeholder={t('convPage.searchContactsPlaceholder', 'Search contacts...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {/* cross-fade the shimmer into the list/empty instead of a hard swap (MEGA_PLAN §3b) */}
          <SkeletonSwap
            loading={!!isLoading}
            skeleton={
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="shimmer h-16 rounded-lg bg-white/[0.04]" />
                ))}
              </div>
            }
          >
            {filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="glow-accent relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                  <Users aria-hidden="true" className="h-5 w-5 text-accent-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">{t('convPage.noContactsTitle', 'No contacts yet')}</p>
                <p className="mt-0.5 text-xs text-muted-foreground max-w-[200px]">
                  {t('convPage.noContactsDescription', 'Conversations appear here when a customer messages you on WhatsApp.')}
                </p>
              </div>
            ) : (
              <div className="space-y-2 stagger-fade">
                {filteredContacts.map(contact => (
                  <ContactListItem
                    key={contact.contact_id}
                    contact={contact}
                    isSelected={selectedContactId === contact.contact_id}
                    onClick={() => onSelectContact(contact)}
                  />
                ))}
              </div>
            )}
          </SkeletonSwap>
        </div>
      </ScrollArea>
    </div>
  );
}
