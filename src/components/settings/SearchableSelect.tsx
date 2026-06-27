import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Option {
  value: string;
  label: string;
  searchText?: string;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  /** Accessible name for the trigger when there is no visible <label> tied to it. */
  ariaLabel?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  className,
  disabled,
  ariaLabel
}: SearchableSelectProps) {
  const { t } = useTranslation('settings');
  const resolvedPlaceholder = placeholder ?? t('settings.common.selectOption', 'Select option...');
  const resolvedSearchPlaceholder = searchPlaceholder ?? t('settings.common.search', 'Search...');
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    
    return options.filter(option => 
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (option.searchText && option.searchText.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [options, searchQuery]);

  const selectedOption = options.find(option => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-muted border-white/[0.08] text-foreground hover:bg-white/[0.06]",
            !value && "text-subtle-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : resolvedPlaceholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 bg-popover border-white/[0.08]" align="start">
        <div className="flex items-center border-b border-white/[0.08] px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-subtle-foreground" />
          <Input
            placeholder={resolvedSearchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-subtle-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
          />
        </div>
        <div className="max-h-60 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-subtle-foreground">
              {t('settings.common.noOptions', 'No options found.')}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-white/[0.06] hover:text-foreground",
                  value === option.value && "bg-primary/15 text-foreground"
                )}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                  setSearchQuery('');
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {option.label}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}