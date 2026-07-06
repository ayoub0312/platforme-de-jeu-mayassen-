'use client'

import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Checkbox } from '@/components/ui/Checkbox'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
  align?: 'left' | 'right'
  className?: string
}

export interface DataTableBulkAction<T> {
  label: string
  icon?: LucideIcon
  onClick: (rows: T[]) => void
  variant?: 'default' | 'danger'
}

export interface DataTableExportColumn<T> {
  header: string
  value: (row: T) => string | number
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[] | undefined
  isLoading?: boolean
  getRowId: (row: T) => string
  searchPlaceholder?: string
  searchFn?: (row: T, query: string) => boolean
  emptyTitle: string
  emptyDescription?: string
  emptyIcon: LucideIcon
  pageSize?: number
  bulkActions?: DataTableBulkAction<T>[]
  exportColumns?: DataTableExportColumn<T>[]
  exportFilename?: string
  toolbarExtra?: React.ReactNode
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  getRowId,
  searchPlaceholder = 'Rechercher...',
  searchFn,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  pageSize = 10,
  bulkActions,
  exportColumns,
  exportFilename = 'export',
  toolbarExtra,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const rows = data ?? []
    if (!query || !searchFn) return rows
    return rows.filter((row) => searchFn(row, query))
  }, [data, query, searchFn])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sortValue) return filtered
    const withKeys = filtered.map((row) => ({ row, key: col.sortValue!(row) }))
    withKeys.sort((a, b) => {
      if (a.key < b.key) return sortDir === 'asc' ? -1 : 1
      if (a.key > b.key) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return withKeys.map((w) => w.row)
  }, [filtered, sortKey, sortDir, columns])

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const clampedPage = Math.min(page, pageCount)
  const pageRows = sorted.slice((clampedPage - 1) * pageSize, clampedPage * pageSize)

  const toggleSort = (col: DataTableColumn<T>) => {
    if (!col.sortValue) return
    if (sortKey === col.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(col.key)
      setSortDir('asc')
    }
  }

  const toggleSelectAll = () => {
    const pageIds = pageRows.map(getRowId)
    const allSelected = pageIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) pageIds.forEach((id) => next.delete(id))
      else pageIds.forEach((id) => next.add(id))
      return next
    })
  }

  const toggleSelectRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedRows = useMemo(
    () => sorted.filter((row) => selected.has(getRowId(row))),
    [sorted, selected, getRowId]
  )

  const buildWorksheet = () => {
    const cols = exportColumns!
    const rows = sorted.map((row) => {
      const obj: Record<string, string | number> = {}
      cols.forEach((c) => { obj[c.header] = c.value(row) })
      return obj
    })
    return XLSX.utils.json_to_sheet(rows)
  }

  const exportCSV = () => {
    const ws = buildWorksheet()
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFilename}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportXLSX = () => {
    const ws = buildWorksheet()
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Données')
    XLSX.writeFile(wb, `${exportFilename}.xlsx`)
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    )
  }

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((row) => selected.has(getRowId(row)))

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        {searchFn && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              placeholder={searchPlaceholder}
              className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-ds-sm)] bg-surface-alt border border-black/[0.08] text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500"
            />
          </div>
        )}
        {toolbarExtra}
        <div className="flex items-center gap-2 sm:ml-auto">
          {exportColumns && (
            <>
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-ds-sm)] bg-surface border border-black/[0.08] text-ink-700 hover:bg-brand-50 text-xs font-bold cursor-pointer transition-colors"
              >
                <FileText className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                type="button"
                onClick={exportXLSX}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-ds-sm)] bg-surface border border-black/[0.08] text-ink-700 hover:bg-brand-50 text-xs font-bold cursor-pointer transition-colors"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {bulkActions && selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-[var(--radius-ds-sm)] bg-brand-50 border border-brand-500/20">
          <span className="text-xs font-bold text-brand-700">{selected.size} sélectionné(s)</span>
          <div className="flex items-center gap-2 ml-auto">
            {bulkActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => { action.onClick(selectedRows); setSelected(new Set()) }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-ds-sm)] text-xs font-bold cursor-pointer transition-colors ${
                    action.variant === 'danger'
                      ? 'bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20'
                      : 'bg-surface text-ink-700 hover:bg-black/[0.04] border border-black/[0.08]'
                  }`}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {action.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
      ) : (
        <>
          <div className="overflow-x-auto rounded-[var(--radius-ds-md)] border border-black/[0.06]">
            <table className="w-full text-left text-sm text-ink-700">
              <thead className="bg-surface-alt text-[10px] uppercase tracking-wider text-ink-500 border-b border-black/[0.06]">
                <tr>
                  {bulkActions && (
                    <th className="px-4 py-3 w-10">
                      <Checkbox checked={allOnPageSelected} onChange={toggleSelectAll} aria-label="Tout sélectionner sur cette page" />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-4 py-3 font-bold ${col.align === 'right' ? 'text-right' : ''} ${col.sortValue ? 'cursor-pointer select-none' : ''}`}
                      onClick={() => toggleSort(col)}
                    >
                      <span className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}>
                        {col.header}
                        {col.sortValue && (
                          sortKey === col.key ? (
                            sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] bg-surface">
                {pageRows.map((row) => {
                  const id = getRowId(row)
                  return (
                    <tr key={id} className="hover:bg-black/[0.015] transition-colors">
                      {bulkActions && (
                        <td className="px-4 py-3">
                          <Checkbox checked={selected.has(id)} onChange={() => toggleSelectRow(id)} aria-label="Sélectionner la ligne" />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : ''} ${col.className ?? ''}`}>
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between mt-4 text-xs font-semibold text-ink-500">
              <span>
                Page {clampedPage} / {pageCount} — {sorted.length} résultat(s)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={clampedPage === 1}
                  className="p-2 rounded-[var(--radius-ds-sm)] bg-surface border border-black/[0.08] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-brand-50"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={clampedPage === pageCount}
                  className="p-2 rounded-[var(--radius-ds-sm)] bg-surface border border-black/[0.08] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-brand-50"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
