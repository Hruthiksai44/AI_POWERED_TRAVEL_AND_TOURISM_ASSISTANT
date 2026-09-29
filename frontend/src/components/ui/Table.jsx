import { cn } from '../../utils/cn';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import Button from './Button';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyState,
  onRowClick,
  pagination,
  className
}) {
  const showPagination = pagination && pagination.total > pagination.pageSize;
  
  return (
    <div className={cn("w-full flex flex-col glass-surface rounded-2xl overflow-hidden", className)}>
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-[var(--glass-bg-subtle)] border-b border-[var(--glass-border)] backdrop-blur-md">
              {columns.map((col, i) => (
                <th 
                  key={col.key || i} 
                  scope="col"
                  style={{ width: col.width }}
                  className="px-[var(--table-cell-padding-x)] py-3 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--glass-border)]">
            {loading ? (
              Array.from({ length: Math.min(5, pagination?.pageSize || 5) }).map((_, rowIndex) => (
                <tr key={rowIndex} className="h-[var(--table-row-height)]">
                  {columns.map((col, colIndex) => (
                    <td key={colIndex} className="px-[var(--table-cell-padding-x)] py-[var(--table-cell-padding-y)]">
                      <Skeleton width={colIndex === 0 ? '40%' : '70%'} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  {emptyState || <EmptyState title="No data available" />}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr 
                  key={row.id || rowIndex}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors",
                    onRowClick ? "cursor-pointer hover:bg-[var(--glass-bg-subtle)] active:scale-[0.999]" : ""
                  )}
                >
                  {columns.map((col, colIndex) => (
                    <td 
                      key={col.key || colIndex}
                      className="px-[var(--table-cell-padding-x)] py-[var(--table-cell-padding-y)] text-sm text-[var(--color-text-primary)]"
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && !loading && data.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--glass-border)] bg-[var(--glass-bg-subtle)] backdrop-blur-md">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Showing <span className="font-medium text-[var(--color-text-primary)]">{(pagination.page - 1) * pagination.pageSize + 1}</span> to <span className="font-medium text-[var(--color-text-primary)]">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> of <span className="font-medium text-[var(--color-text-primary)]">{pagination.total}</span> results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              icon={<HiOutlineChevronLeft className="w-4 h-4" />}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              icon={<HiOutlineChevronRight className="w-4 h-4" />}
            />
          </div>
        </div>
      )}
    </div>
  );
}
