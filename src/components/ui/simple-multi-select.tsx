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
  
  // Ensure we always have arrays
  const safeOptions = Array.isArray(options) ? options : [];
  const safeSelected = Array.isArray(selected) ? selected : [];

  const handleSelect = (optionValue: string) => {
    if (safeSelected.includes(optionValue)) {
      // Remove if already selected
      onChange(safeSelected.filter(item => item !== optionValue));
    } else {
      // Add if not selected
      onChange([...safeSelected, optionValue]);
    }
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
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between min-h-10 h-auto",
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
                      className="flex items-center gap-1 px-2 py-0.5"
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
        <PopoverContent className="w-full p-0" align="start">
          <div className="max-h-60 overflow-auto">
            {availableOptions.length > 0 ? (
              availableOptions.map((option) => (
                <div
                  key={option.value}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                  onClick={() => handleSelect(option.value)}
                >
                  {option.label}
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {safeSelected.length === safeOptions.length 
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