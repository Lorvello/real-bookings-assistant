
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { DateRangeFilter, DateRange } from '@/components/dashboard/DateRangeFilter';
import { useIsMobile } from '@/hooks/use-mobile';

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
  // The full descriptive placeholder overflows the search field at phone widths
  // (clipped "...or phone"). Use a concise placeholder on mobile; the full
  // accessible name is preserved on the aria-label regardless.
  const isMobile = useIsMobile();
  const searchPlaceholder = isMobile
    ? 'Name, email or phone…'
    : 'Search by customer name, email or phone...';
  return (
    <div className="surface-raised rounded-xl p-4 sm:p-6 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search bookings"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
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
          <SelectTrigger aria-label="Sort bookings" className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass z-50">
            <SelectItem value="newest">Latest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="alphabetical">Alphabetically A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
