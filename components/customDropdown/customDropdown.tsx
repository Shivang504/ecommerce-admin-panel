import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface DropdownProps {
  options: Option[];
  placeholder?: string;
  withSearch?: boolean;
  onChange?: (option: Option) => void;
  error?: string;
  labelMain?: string;
  value?: string;
  disabled?: boolean;
  /** Minimum characters before filtering (avoids rendering huge lists). Default 0. */
  minSearchLength?: number;
  /** Cap filtered results for smoother scrolling. Default 80. */
  maxSearchResults?: number;
  searchPlaceholder?: string;
  /** Shown when search is enabled but query is shorter than minSearchLength */
  emptySearchHint?: string;
}

function normalizeSearchText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

function findOptionByValue(options: Option[], value?: string): Option | null {
  if (!value?.trim()) return null;
  const normalized = normalizeSearchText(value);
  return (
    options.find(opt => normalizeSearchText(opt.value) === normalized) ??
    options.find(opt => normalizeSearchText(opt.label) === normalized) ??
    null
  );
}

function filterOptions(
  options: Option[],
  searchTerm: string,
  minSearchLength: number,
  maxSearchResults: number
): Option[] {
  const query = normalizeSearchText(searchTerm);
  if (query.length < minSearchLength) return [];

  const matches = options.filter(option => normalizeSearchText(option.label).includes(query));

  return matches.slice(0, maxSearchResults);
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  placeholder = 'Select an option',
  withSearch = false,
  onChange,
  error,
  labelMain,
  value,
  disabled = false,
  minSearchLength = 0,
  maxSearchResults = 80,
  searchPlaceholder = 'Search...',
  emptySearchHint = 'Type to search',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selected, setSelected] = useState<Option | null>(() => findOptionByValue(options, value));
  const [searchTerm, setSearchTerm] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setSearchTerm('');
    }
  }, [disabled]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && withSearch) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [isOpen, withSearch]);

  useEffect(() => {
    if (value) {
      setSelected(findOptionByValue(options, value));
    } else {
      setSelected(null);
    }
  }, [value, options]);

  const filteredOptions = useMemo(
    () =>
      withSearch
        ? filterOptions(options, searchTerm, minSearchLength, maxSearchResults)
        : options,
    [options, searchTerm, withSearch, minSearchLength, maxSearchResults]
  );

  const normalizedQuery = normalizeSearchText(searchTerm);
  const showSearchHint = withSearch && normalizedQuery.length < minSearchLength;

  const handleSelect = useCallback(
    (option: Option) => {
      setSelected(option);
      setIsOpen(false);
      setSearchTerm('');
      onChange?.(option);
    },
    [onChange]
  );

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen(prev => {
      const next = !prev;
      if (!next) setSearchTerm('');
      return next;
    });
  };

  const displayLabel =
    selected?.label ??
    (value?.trim() ? value : null) ??
    placeholder;

  const isSelectedMatch = (option: Option) => {
    if (!selected && !value) return false;
    const target = normalizeSearchText(selected?.value ?? value ?? '');
    return normalizeSearchText(option.value) === target;
  };

  return (
    <div className='w-full max-w-full'>
      {labelMain && <label className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'>{labelMain}</label>}

      <div className='relative' ref={dropdownRef}>
        <button
          type='button'
          disabled={disabled}
          onClick={handleToggle}
          className={`w-full px-4 py-[10px] rounded-md text-left bg-white dark:bg-slate-700 border 
          border-slate-200 dark:border-slate-600
           transition-all duration-200 flex items-center justify-between
           ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300'}`}>
          <span className={selected || value ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>{displayLabel}</span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className='absolute z-50 w-full mt-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl shadow-lg overflow-hidden'>
            {withSearch && (
              <div className='p-3 border-b border-gray-100 dark:border-slate-600'>
                <div className='relative'>
                  <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none' />
                  <input
                    ref={searchInputRef}
                    type='text'
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setIsOpen(false);
                        setSearchTerm('');
                      }
                      e.stopPropagation();
                    }}
                    autoComplete='off'
                    spellCheck={false}
                    className='w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500/40'
                  />
                </div>
              </div>
            )}

            <div className='max-h-60 overflow-y-auto overscroll-contain'>
              {showSearchHint ? (
                <div className='px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400'>{emptySearchHint}</div>
              ) : filteredOptions.length > 0 ? (
                filteredOptions.map(option => (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => handleSelect(option)}
                    className='w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors duration-150 flex items-center justify-between group'>
                    <span
                      className={`text-sm ${
                        isSelectedMatch(option) ? 'text-black font-semibold' : 'text-gray-700 dark:text-gray-200'
                      }`}>
                      {option.label}
                    </span>
                    {isSelectedMatch(option) && <Check className='w-4 h-4 text-black' />}
                  </button>
                ))
              ) : (
                <div className='px-4 py-8 text-center text-sm text-gray-400'>No results found</div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && !isOpen && <p className='text-red-500 text-xs mt-1 flex items-center gap-1'>{error}</p>}
    </div>
  );
};

export default Dropdown;
