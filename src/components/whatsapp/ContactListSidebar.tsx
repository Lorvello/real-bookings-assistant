import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ContactListItem } from './ContactListItem';
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
    <div className="flex flex-col h-full bg-card rounded-lg border border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Contacten</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            {contacts.length} totaal
          </span>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek contacten..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Contact List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Geen contacten gevonden</p>
            </div>
          ) : (
            filteredContacts.map(contact => (
              <ContactListItem
                key={contact.contact_id}
                contact={contact}
                isSelected={selectedContactId === contact.contact_id}
                onClick={() => onSelectContact(contact)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
