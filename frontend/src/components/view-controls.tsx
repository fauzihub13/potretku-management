'use client';

import { LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewType = 'table' | 'card';

export function ViewToggle({ view, onViewChange }: { view: ViewType; onViewChange: (v: ViewType) => void }) {
  return (
    <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => onViewChange('table')}
        className={`p-2 transition-colors ${view === 'table' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
        title="Tampilan Tabel"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        onClick={() => onViewChange('card')}
        className={`p-2 transition-colors ${view === 'card' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
        title="Tampilan Kartu"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft className="h-4 w-4 mr-1" /> Sebelumnya
      </Button>
      <span className="text-sm text-zinc-500">Halaman {page} dari {totalPages}</span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Berikutnya <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
