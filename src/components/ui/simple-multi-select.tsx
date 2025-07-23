import * as React from "react";
import { X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type Option = {
  value: string;
  label: string;
};

interface SimpleMultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SimpleMultiSelect({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select items",
  className,
  disabled = false,
}: SimpleMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  
  // Ensure we always have arrays
  const safeOptions = Array.isArray(options) ? options : [];
  const safeSelected = Array.isArray(selected) ? selected : [];

  const handleSelect = (optionValue: string) => {
    console.log('SimpleMultiSelect: handleSelect called with:', optionValue);
    if (safeSelected.includes(optionValue)) {
      // Remove if already selected
      onChange(safeSelected.filter(item => item !== optionValue));
    } else {
      // Add if not selected
      onChange([...safeSelected, optionValue]);
    }
    // Don't close dropdown immediately to allow multiple selections
  };

  const handleUnselect = (optionValue: string) => {
    onChange(safeSelected.filter(item => item !== optionValue));
  };

  const availableOptions = safeOptions.filter(option => 
    !safeSelected.includes(option.value)
  );

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between min-h-10 h-auto hover:bg-transparent hover:text-current",
              disabled && "cursor-not-allowed opacity-50"
            )}
            disabled={disabled}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {safeSelected.length > 0 ? (
                safeSelected.map((value) => {
                  const option = safeOptions.find(opt => opt.value === value);
                  return (
                    <Badge
                      key={value}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-0.5 hover:bg-secondary"
                    >
                      <span>{option?.label || value}</span>
                      <button
                        type="button"
                        className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnselect(value);
                        }}
                        disabled={disabled}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  );
                })
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="p-0 z-[999] bg-popover border border-border shadow-lg pointer-events-auto" 
          align="start"
          style={{ 
            width: triggerRef.current?.offsetWidth || 200,
            minWidth: '200px'
          }}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Allow interactions with dropdown items
            if (e.target instanceof Element && e.target.closest('[data-dropdown-item]')) {
              e.preventDefault();
            }
          }}
        >
          <div className="max-h-60 overflow-y-auto bg-popover pointer-events-auto">
            {availableOptions.length > 0 ? (
              availableOptions.map((option) => (
                <div
                  key={option.value}
                  data-dropdown-item
                  className="relative w-full flex cursor-pointer select-none items-center px-3 py-2.5 text-sm text-left hover:bg-muted transition-colors pointer-events-auto"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Option clicked:', option.value);
                    handleSelect(option.value);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Option clicked:', option.value);
                    handleSelect(option.value);
                  }}
                >
                  <span className="truncate pointer-events-none">{option.label}</span>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground px-4">
                {safeOptions.length === 0 
                  ? "No items available"
                  : safeSelected.length === safeOptions.length 
                    ? "All items selected" 
                    : "No items available"
                }
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}