'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Search, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { type AutocompleteSuggestion, wordbankApi } from './wordbank.service';

interface WordbankAutocompleteSearchProps {
  onSelectSuggestion: (suggestion: AutocompleteSuggestion) => void;
  placeholder?: string;
  ariaLabel?: string;
  isSaving?: boolean;
}

export function WordbankAutocompleteSearch({
  onSelectSuggestion,
  placeholder = 'Search new vocabulary to learn (e.g. eat, revolve)...',
  ariaLabel = 'Search new vocabulary to learn',
  isSaving = false,
}: WordbankAutocompleteSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const trimmedQuery = query.trim();

  const { data, isLoading } = useQuery({
    queryKey: ['vocab-autocomplete', trimmedQuery],
    queryFn: () => wordbankApi.autocomplete(trimmedQuery),
    enabled: trimmedQuery.length >= 1,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const suggestions = data?.suggestions ?? [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (suggestion: AutocompleteSuggestion) => {
    onSelectSuggestion(suggestion);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <InputGroup className="h-12 rounded-2xl border-primary/30 bg-background/90 shadow-sm backdrop-blur focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
        <InputGroupAddon>
          {isSaving || isLoading ? (
            <Loader2 className="size-5 animate-spin text-primary" />
          ) : (
            <Sparkles className="size-5 text-primary" />
          )}
        </InputGroupAddon>
        <InputGroupInput
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="text-base placeholder:text-muted-foreground/70 md:text-sm"
        />
      </InputGroup>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-1.5 max-h-84 w-full overflow-y-auto rounded-2xl border border-border/80 bg-popover/95 p-2 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between px-3 py-1.5 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            <span>Dictionary Autocomplete (Laban Dict)</span>
            <span>Click to add to Wordbank</span>
          </div>
          <div className="flex flex-col gap-1">
            {suggestions.map((item, index) => (
              <button
                type="button"
                key={item.value || `${item.select}-${index}`}
                onClick={() => handleSelect(item)}
                className="group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-colors hover:bg-primary/10 focus:bg-primary/10 focus:outline-none"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-foreground group-hover:text-primary">
                      {item.select}
                    </span>
                    {item.phonetic && (
                      <span className="font-mono text-muted-foreground text-xs">
                        {item.phonetic}
                      </span>
                    )}
                  </div>
                  {item.definition && (
                    <p className="line-clamp-1 text-muted-foreground text-xs">
                      {item.definition}
                    </p>
                  )}
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 font-medium text-primary text-xs transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Plus className="size-3.5" />
                  <span>Learn</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
