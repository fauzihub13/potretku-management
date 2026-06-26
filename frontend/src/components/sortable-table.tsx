'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

type SortDir = 'asc' | 'desc' | null;

export function SortableTh({
  label, field, sortField, sortDir, onSort, className = ''
}: {
  label: string;
  field: string;
  sortField: string | null;
  sortDir: SortDir;
  onSort: (field: string) => void;
  className?: string;
}) {
  const active = sortField === field;
  const icon = !active ? <ChevronsUpDown className="h-3 w-3" />
    : sortDir === 'asc' ? <ChevronUp className="h-3 w-3" />
    : <ChevronDown className="h-3 w-3" />;

  return (
    <th
      className={`text-left p-3 font-medium text-zinc-500 select-none cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={active ? 'text-purple-600' : 'text-zinc-300 dark:text-zinc-600'}>{icon}</span>
      </div>
    </th>
  );
}

export function useSortableData<T>(items: T[], defaultField?: string, defaultDir: SortDir = 'desc') {
  const [sortField, setSortField] = useState<string | null>(defaultField || null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);

  const requestSort = (field: string) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortField(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sorted = [...items].sort((a: any, b: any) => {
    if (!sortField || !sortDir) return 0;
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (aVal == null) aVal = '';
    if (bVal == null) bVal = '';
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return { sorted, sortField, sortDir, requestSort };
}
