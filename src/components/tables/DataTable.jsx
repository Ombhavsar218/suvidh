import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { EmptyState, LoadingState } from '../common/States';
import { Pagination } from '../common/Pagination';

export function DataTable({
  columns = [],
  data = [],
  loading = false,
  sortKey = '',
  sortDir = 'asc',
  onSort,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyAction,
  pagination,
  rowKey = 'id',
}) {
  if (loading) {
    return (
      <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="bg-[#FEFEFE] dark:bg-slate-900 border border-[#535F80]/20 dark:border-slate-800 rounded-lg shadow-2xs overflow-hidden print-card">
      <div className="overflow-x-auto touch-pan-x">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#E7E9F0]/70 dark:bg-slate-800/60 border-b border-[#535F80]/20 dark:border-slate-800">
              {columns.map((col) => {
                const isSorted = sortKey && sortKey === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={`px-3 sm:px-4 py-2.5 sm:py-3 text-[11px] font-semibold uppercase tracking-wider text-[#535F80] dark:text-slate-400 whitespace-nowrap ${alignClass} ${
                      col.sortable && onSort ? 'cursor-pointer select-none hover:text-[#051747] dark:hover:text-slate-200' : ''
                    }`}
                    onClick={() => col.sortable && onSort && onSort(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1 ${
                        col.align === 'right' ? 'justify-end' : ''
                      }`}
                    >
                      <span>{col.label}</span>
                      {col.sortable && onSort && (
                        <span className="text-[#535F80]/70">
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-[#081F62]" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-[#081F62]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-60" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E7E9F0] dark:divide-slate-800 text-sm">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    action={emptyAction}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row[rowKey] || idx}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors ${
                    onRowClick
                      ? 'cursor-pointer hover:bg-[#E7E9F0]/55 dark:hover:bg-slate-800/40'
                      : 'hover:bg-[#E7E9F0]/40 dark:hover:bg-slate-800/30'
                  }`}
                >
                  {columns.map((col) => {
                    const alignClass =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left';

                    return (
                      <td
                        key={col.key}
                        style={col.width ? { width: col.width } : undefined}
                        className={`px-3 sm:px-4 py-2.5 sm:py-3 text-[#051747] dark:text-slate-200 align-middle ${alignClass} ${
                          col.numeric ? 'tabular-nums' : ''
                        } ${col.nowrap || col.key === 'code' ? 'whitespace-nowrap' : ''} ${col.cellClassName || ''}`}
                      >
                        {col.render ? col.render(row) : row[col.key] ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalItems > 0 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  );
}
