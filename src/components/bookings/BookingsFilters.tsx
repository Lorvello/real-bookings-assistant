
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { DateRangeFilter, DateRange } from '@/components/dashboard/DateRangeFilter';

interface BookingsFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

export function BookingsFilters({
  searchTerm,
  setSearchTerm,
  dateRange,
  setDateRange,
  sortBy,
  setSortBy
}: BookingsFiltersProps) {
  return (
    <div className="bg-card border border-border shadow-sm rounded-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-border text-foreground"
          />
        </div>

        {/* Date Range Filter */}
        <div className="flex-shrink-0">
          <DateRangeFilter 
            selectedRange={dateRange}
            onRangeChange={setDateRange}
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-48 bg-input border-border text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border z-50">
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="customer">Customer name</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
