'use client';

import { useState, useMemo } from 'react';

type Column<T> = {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
  filterFn?: (item: T, filterValue: string) => boolean;
  sortFn?: (a: T, b: T) => number;
};

type DataViewProps<T> = {
  data: T[];
  columns: Column<T>[];
  cardRender: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onDelete?: (item: T) => void;
  deleteLabel?: string;
  emptyMessage?: string;
};

export default function DataView<T>({
  data,
  columns,
  cardRender,
  keyExtractor,
  onDelete,
  deleteLabel = 'Delete',
  emptyMessage = 'No data yet.',
}: DataViewProps<T>) {
  const [view, setView] = useState<'cards' | 'rows'>('rows');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    return data.filter((item) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        const col = columns.find((c) => c.key === key);
        if (col?.filterFn) return col.filterFn(item, value);
        // Default: stringify the rendered value and search
        const rendered = col?.render(item);
        const text = typeof rendered === 'string' ? rendered : String(rendered ?? '');
        return text.toLowerCase().includes(value.toLowerCase());
      });
    });
  }, [data, filters, columns]);

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-[#1a1a1a] p-12 text-center">
        <p className="text-[#555]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex rounded-lg border border-[#1a1a1a] overflow-hidden text-xs">
          <button
            onClick={() => setView('rows')}
            className={`px-3 py-1.5 transition ${view === 'rows' ? 'bg-teal-600 text-white' : 'bg-[#111] text-[#888] hover:text-white'}`}
          >
            Rows
          </button>
          <button
            onClick={() => setView('cards')}
            className={`px-3 py-1.5 transition ${view === 'cards' ? 'bg-teal-600 text-white' : 'bg-[#111] text-[#888] hover:text-white'}`}
          >
            Cards
          </button>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition ${showFilters ? 'border-teal-500 text-teal-400' : 'border-[#1a1a1a] text-[#888] hover:text-white'}`}
        >
          Filters {Object.values(filters).filter(Boolean).length > 0 && `(${Object.values(filters).filter(Boolean).length})`}
        </button>
        {Object.values(filters).filter(Boolean).length > 0 && (
          <button
            onClick={() => setFilters({})}
            className="text-xs text-red-400 hover:text-red-300 transition"
          >
            Clear all
          </button>
        )}
        <span className="text-xs text-[#555] ml-auto">
          {filtered.length} of {data.length}
        </span>
      </div>

      {/* Filter inputs */}
      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4 p-4 rounded-lg border border-[#1a1a1a] bg-[#111]">
          {columns.map((col) => (
            <div key={col.key}>
              <label className="text-xs text-[#555] block mb-1">{col.label}</label>
              <input
                type="text"
                value={filters[col.key] || ''}
                onChange={(e) => updateFilter(col.key, e.target.value)}
                placeholder={`Filter ${col.label.toLowerCase()}...`}
                className="w-full rounded border border-[#222] bg-[#0a0a0a] px-2 py-1 text-xs text-[#f0f0f0] placeholder-[#444] outline-none focus:border-teal-500"
              />
            </div>
          ))}
        </div>
      )}

      {/* Row view */}
      {view === 'rows' && (
        <div className="rounded-lg border border-[#1a1a1a] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#111] text-[#888]">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="text-left px-4 py-3 font-medium">
                    {col.label}
                  </th>
                ))}
                {onDelete && <th className="text-left px-4 py-3 font-medium w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={keyExtractor(item)} className="border-t border-[#1a1a1a] hover:bg-[#111] transition">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      {col.render(item)}
                    </td>
                  ))}
                  {onDelete && (
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onDelete(item)}
                        className="text-xs text-red-400/60 hover:text-red-400 transition"
                      >
                        {deleteLabel}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Card view */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div key={keyExtractor(item)} className="relative group">
              {cardRender(item)}
              {onDelete && (
                <button
                  onClick={() => onDelete(item)}
                  className="absolute top-3 right-3 text-xs text-red-400/0 group-hover:text-red-400/60 hover:!text-red-400 transition px-2 py-1 rounded"
                >
                  {deleteLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
