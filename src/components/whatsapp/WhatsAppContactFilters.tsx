
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface WhatsAppContactFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
}

export function WhatsAppContactFilters({
  searchTerm,
  setSearchTerm,
  filterStatus,
  setFilterStatus,
}: WhatsAppContactFiltersProps) {
  return (
    <div className="flex gap-4 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Zoek op naam of telefoonnummer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filter status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle contacten</SelectItem>
          <SelectItem value="active">Actieve gesprekken</SelectItem>
          <SelectItem value="with_bookings">Met boekingen</SelectItem>
          <SelectItem value="recent">Recent actief</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
