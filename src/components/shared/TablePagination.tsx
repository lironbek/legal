import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: TablePaginationProps) {
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <p className="text-sm text-muted-foreground">
        {start}-{end} מתוך {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((page) => {
            if (totalPages <= 5) return true;
            if (page === 1 || page === totalPages) return true;
            return Math.abs(page - currentPage) <= 1;
          })
          .map((page, idx, arr) => {
            const prev = arr[idx - 1];
            const showEllipsis = prev && page - prev > 1;
            return (
              <span key={page} className="flex items-center">
                {showEllipsis && (
                  <span className="px-1 text-muted-foreground text-sm">...</span>
                )}
                <Button
                  variant={page === currentPage ? 'default' : 'ghost'}
                  size="icon"
                  className="h-8 w-8 text-sm"
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              </span>
            );
          })}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function usePagination<T>(items: T[], pageSize = 10) {
  const totalPages = Math.ceil(items.length / pageSize);
  return {
    paginate: (page: number) => {
      const start = (page - 1) * pageSize;
      return items.slice(start, start + pageSize);
    },
    totalPages,
    totalItems: items.length,
    pageSize,
  };
}
