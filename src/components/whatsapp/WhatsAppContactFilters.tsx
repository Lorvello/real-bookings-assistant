
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

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
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search by name or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-white/[0.08] bg-muted text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-ring"
        />
      </div>

      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-full sm:w-48 border-white/[0.08] bg-muted text-foreground focus:border-primary focus:ring-ring">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <SelectValue placeholder="Filter status" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-popover border-white/[0.08] text-foreground">
          <SelectItem value="all" className="focus:bg-white/[0.06] focus:text-foreground">Alle contacten</SelectItem>
          <SelectItem value="active" className="focus:bg-white/[0.06] focus:text-foreground">Actieve conversations</SelectItem>
          <SelectItem value="with_bookings" className="focus:bg-white/[0.06] focus:text-foreground">Met boekingen</SelectItem>
          <SelectItem value="recent" className="focus:bg-white/[0.06] focus:text-foreground">Recent actief</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
