
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
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-4 h-4" />
        <Input
          placeholder="Zoek op naam of telefoonnummer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-gray-600 bg-gray-700/50 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500/20"
        />
      </div>
      
      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-full sm:w-48 border-gray-600 bg-gray-700/50 text-white focus:border-green-500 focus:ring-green-500/20">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <SelectValue placeholder="Filter status" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600 text-white">
          <SelectItem value="all" className="focus:bg-gray-700 focus:text-white">Alle contacten</SelectItem>
          <SelectItem value="active" className="focus:bg-gray-700 focus:text-white">Actieve gesprekken</SelectItem>
          <SelectItem value="with_bookings" className="focus:bg-gray-700 focus:text-white">Met boekingen</SelectItem>
          <SelectItem value="recent" className="focus:bg-gray-700 focus:text-white">Recent actief</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
