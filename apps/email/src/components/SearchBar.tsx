import { useState, useCallback } from 'react';

export interface SearchFilters {
  query: string;
  sender: string;
  dateFrom: string;
  dateTo: string;
  hasAttachment: boolean;
  folder: string;
}

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  folders: string[];
  isSearching: boolean;
  resultCount: number | null;
}

const EMPTY_FILTERS: SearchFilters = {
  query: '',
  sender: '',
  dateFrom: '',
  dateTo: '',
  hasAttachment: false,
  folder: '',
};

export default function SearchBar({
  onSearch,
  onClear,
  folders,
  isSearching,
  resultCount,
}: SearchBarProps) {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = useCallback(() => {
    if (filters.query.trim() || filters.sender.trim() || filters.dateFrom || filters.dateTo || filters.hasAttachment) {
      onSearch(filters);
    }
  }, [filters, onSearch]);

  const handleClear = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setShowAdvanced(false);
    onClear();
  }, [onClear]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') handleClear();
  };

  return (
    <div className="search-bar">
      <div className="search-bar-main">
        <span className="search-bar-icon">🔍</span>
        <input
          className="search-bar-input"
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          onKeyDown={handleKeyDown}
          placeholder="Search emails..."
        />
        {(filters.query || resultCount !== null) && (
          <button className="search-bar-clear" onClick={handleClear}>
            ✕
          </button>
        )}
        <button
          className={`search-bar-advanced-toggle ${showAdvanced ? 'active' : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
          title="Advanced filters"
        >
          ⚙️
        </button>
        <button
          className="search-bar-submit"
          onClick={handleSearch}
          disabled={isSearching}
        >
          {isSearching ? '⏳' : 'Search'}
        </button>
      </div>

      {showAdvanced && (
        <div className="search-bar-filters">
          <label className="search-filter">
            <span>From:</span>
            <input
              value={filters.sender}
              onChange={(e) => setFilters((f) => ({ ...f, sender: e.target.value }))}
              placeholder="sender@email.com"
            />
          </label>
          <label className="search-filter">
            <span>Date from:</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </label>
          <label className="search-filter">
            <span>Date to:</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
            />
          </label>
          <label className="search-filter">
            <span>Folder:</span>
            <select
              value={filters.folder}
              onChange={(e) => setFilters((f) => ({ ...f, folder: e.target.value }))}
            >
              <option value="">All folders</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="search-filter-checkbox">
            <input
              type="checkbox"
              checked={filters.hasAttachment}
              onChange={(e) =>
                setFilters((f) => ({ ...f, hasAttachment: e.target.checked }))
              }
            />
            <span>Has attachment</span>
          </label>
        </div>
      )}

      {resultCount !== null && (
        <div className="search-bar-results">
          {resultCount === 0 ? 'No results found' : `${resultCount} result(s) found`}
        </div>
      )}
    </div>
  );
}
