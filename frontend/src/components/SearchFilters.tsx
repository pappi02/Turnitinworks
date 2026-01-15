import { useState } from 'react';
import { Search, Filter, ChevronDown } from 'lucide-react';

interface FilterOptions {
  status: string[];
  similarity: { min: number; max: number };
  dateRange: { start: string; end: string };
  sortBy: string;
}

interface SearchFiltersProps {
  onSearch: (query: string, filters: FilterOptions) => void;
  onReset: () => void;
  totalResults?: number;
}

export default function SearchFilters({ onSearch, onReset, totalResults }: SearchFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeFilters, setActiveFilters] = useState(0);

  const [filters, setFilters] = useState<FilterOptions>({
    status: [],
    similarity: { min: 0, max: 100 },
    dateRange: { start: '', end: '' },
    sortBy: 'recent',
  });

  const statusOptions = ['Completed', 'Processing', 'Pending', 'Failed'];
  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'highest-similarity', label: 'Highest Similarity' },
    { value: 'lowest-similarity', label: 'Lowest Similarity' },
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
  ];

  const handleStatusToggle = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status],
    }));
  };

  const handleSimilarityChange = (type: 'min' | 'max', value: number) => {
    setFilters(prev => ({
      ...prev,
      similarity: { ...prev.similarity, [type]: value },
    }));
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: { ...prev.dateRange, [type]: value },
    }));
  };

  const handleApplyFilters = () => {
    onSearch(searchQuery, filters);
    
    // Calculate active filters count
    let count = 0;
    if (searchQuery) count += 1;
    if (filters.status.length > 0) count += 1;
    if (filters.similarity.min > 0 || filters.similarity.max < 100) count += 1;
    if (filters.dateRange.start || filters.dateRange.end) count += 1;
    setActiveFilters(count);
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilters({
      status: [],
      similarity: { min: 0, max: 100 },
      dateRange: { start: '', end: '' },
      sortBy: 'recent',
    });
    setActiveFilters(0);
    onReset();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Basic Search */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleApplyFilters()}
              placeholder="Search by document title, student name..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition"
            />
          </div>
          <button
            onClick={handleApplyFilters}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            title="Advanced filters"
          >
            <Filter className="w-5 h-5" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
        {totalResults !== undefined && (
          <p className="text-sm text-gray-600 mt-3">
            Found <span className="font-semibold">{totalResults}</span> result{totalResults !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-200">
          <div className="space-y-6">
            {/* Status Filter */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Status</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {statusOptions.map(status => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => handleStatusToggle(status)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm text-gray-700">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Similarity Range */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Similarity Range</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 min-w-fit">Min: </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.similarity.min}
                      onChange={(e) => handleSimilarityChange('min', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold text-gray-900 min-w-fit">{filters.similarity.min}%</span>
                  </label>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 min-w-fit">Max: </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filters.similarity.max}
                      onChange={(e) => handleSimilarityChange('max', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold text-gray-900 min-w-fit">{filters.similarity.max}%</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Date Range</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-700">From</label>
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => handleDateChange('start', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">To</label>
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => handleDateChange('end', e.target.value)}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Sort */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Sort By</h4>
              <div className="relative">
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition appearance-none"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3 border-t border-gray-200">
              <button
                onClick={handleApplyFilters}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
