
import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

export type Option = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items",
  className,
  disabled = false,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleUnselect = React.useCallback((item: string) => {
    onChange(selected.filter((i) => i !== item));
  }, [onChange, selected]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selected.length > 0) {
          handleUnselect(selected[selected.length - 1]);
        }
      }
      // Prevent keyboard navigation when we're not focused on the input
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
      }
    }
  }, [selected, handleUnselect]);

  const selectables = options.filter((item) => !selected.includes(item.value));

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50"
        )}
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1 mr-1">
            {selected.map((item) => {
              const label = options.find((option) => option.value === item)?.label || item;
              return (
                <Badge
                  key={item}
                  variant="secondary"
                  className="flex items-center gap-1 px-2 py-0.5"
                >
                  <span>{label}</span>
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
                      handleUnselect(item);
                    }}
                    disabled={disabled}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
        <CommandPrimitive
          className="w-full"
          onKeyDown={handleKeyDown}
        >
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={cn(
              "flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
              selected.length > 0 && "w-[50px]"
            )}
            placeholder={selected.length ? "" : placeholder}
            disabled={disabled}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
          />
          <div className="relative z-50 mt-2">
            {open && selectables.length > 0 ? (
              <div className="absolute top-0 w-full rounded-md border border-input bg-popover text-popover-foreground shadow-md outline-none animate-in">
                <Command className="h-full">
                  <CommandGroup className="max-h-[200px] overflow-auto">
                    {selectables.map((option) => (
                      <CommandItem
                        key={option.value}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onSelect={() => {
                          setInputValue("");
                          onChange([...selected, option.value]);
                        }}
                        className="cursor-pointer"
                      >
                        {option.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </div>
            ) : null}
          </div>
        </CommandPrimitive>
      </div>
    </div>
  );
}
