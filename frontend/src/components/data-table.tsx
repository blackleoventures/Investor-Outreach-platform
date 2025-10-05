"use client";

import type React from "react";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  RefreshCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";

export interface Column<T = any> {
  key: string;
  title: string;
  width?: number;
  align?: "left" | "center" | "right";
  render?: (value: any, record: T, index: number) => React.ReactNode;
  dataIndex?: string;
}

export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRefresh?: () => void;
  searchPlaceholder?: string;
  searchKeys?: string[];
  rowKey?: (record: T, index: number) => string;
  onColumnVisibilityChange?: (visibleColumns: Record<string, boolean>) => void;
  visibleColumns?: Record<string, boolean>;
  customizeColumns?: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  dataSource?: string;
  lastUpdated?: string;
}

export default function DataTable<T = any>({
  columns,
  data,
  loading = false,
  onRefresh,
  searchPlaceholder = "Search...",
  searchKeys = [],
  rowKey,
  onColumnVisibilityChange,
  visibleColumns: externalVisibleColumns,
  customizeColumns = true,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  dataSource,
  lastUpdated,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [internalVisibleColumns, setInternalVisibleColumns] = useState<
    Record<string, boolean>
  >({});

  // Use external visible columns if provided, otherwise use internal state
  const visibleColumns = externalVisibleColumns || internalVisibleColumns;
  const setVisibleColumns =
    onColumnVisibilityChange || setInternalVisibleColumns;

  // Initialize visible columns
  useEffect(() => {
    if (!externalVisibleColumns) {
      const initial: Record<string, boolean> = {};
      columns.forEach((col) => {
        initial[col.key] = true;
      });
      setInternalVisibleColumns(initial);
    }
  }, [columns, externalVisibleColumns]);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter((record: any) => {
      // If searchKeys provided, search only those fields
      if (searchKeys.length > 0) {
        return searchKeys.some((key) => {
          const value = record[key];
          if (value == null) return false;
          if (Array.isArray(value)) {
            return value.some((v) => String(v).toLowerCase().includes(query));
          }
          return String(value).toLowerCase().includes(query);
        });
      }

      // Otherwise search all fields
      return Object.values(record).some((value) => {
        if (value == null) return false;
        if (Array.isArray(value)) {
          return value.some((v) => String(v).toLowerCase().includes(query));
        }
        return String(value).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, searchKeys]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, pageSize]);

  // Calculate total pages
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Get visible columns
  const displayColumns = columns.filter(
    (col) => visibleColumns[col.key] !== false
  );

  const handleColumnToggle = (key: string, checked: boolean) => {
    setVisibleColumns({ ...visibleColumns, [key]: checked });
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="w-full space-y-4">
      {/* Search and Actions Bar */}
      <div className="flex flex-col gap-3">
        {/* Data Source Info Section */}
        {(dataSource || lastUpdated) && (
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600">
            {dataSource && (
              <span className="flex items-center gap-1">
                <span className="font-medium">Data Source:</span>
                <span>{dataSource}</span>
              </span>
            )}
            {dataSource && lastUpdated && (
              <span className="hidden sm:inline">|</span>
            )}
            {lastUpdated && (
              <span className="flex items-center gap-1">
                <span className="font-medium">Last Updated:</span>
                <span>{lastUpdated}</span>
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-initial"
                title="Refresh data"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                <span>Refresh</span>
              </button>
            )}

            {customizeColumns && (
              <div className="relative flex-1 sm:flex-initial">
                <button
                  onClick={() => setShowColumnSettings(!showColumnSettings)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Columns</span>
                </button>

                {showColumnSettings && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowColumnSettings(false)}
                    />
                    <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:absolute md:left-auto md:right-0 md:top-auto md:translate-x-0 md:translate-y-0 md:mt-2 w-[90vw] max-w-xs md:w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-[80vh] md:max-h-96 overflow-y-auto">
                      <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
                        <h3 className="font-semibold text-gray-900">
                          Customize Columns
                        </h3>
                      </div>
                      <div className="p-2 space-y-1">
                        {columns.map((col) => {
                          const isChecked = visibleColumns[col.key] !== false;
                          return (
                            <label
                              key={col.key}
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) =>
                                  handleColumnToggle(col.key, e.target.checked)
                                }
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">
                                {col.title}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {displayColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                      col.align === "center"
                        ? "text-center"
                        : col.align === "right"
                        ? "text-right"
                        : ""
                    }`}
                    style={{ width: col.width }}
                  >
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={displayColumns.length}
                    className="px-4 py-12 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={displayColumns.length}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    {searchQuery ? "No results found" : "No data available"}
                  </td>
                </tr>
              ) : (
                paginatedData.map((record, index) => {
                  const key = rowKey ? rowKey(record, index) : `row-${index}`;
                  return (
                    <tr
                      key={key}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      {displayColumns.map((col) => {
                        const value = col.dataIndex
                          ? record[col.dataIndex]
                          : record[col.key];
                        const cellContent = col.render
                          ? col.render(
                              value,
                              record,
                              (currentPage - 1) * pageSize + index
                            )
                          : value ?? "N/A";

                        return (
                          <td
                            key={col.key}
                            className={`px-4 py-3 text-sm text-gray-900 ${
                              col.align === "center"
                                ? "text-center"
                                : col.align === "right"
                                ? "text-right"
                                : ""
                            }`}
                          >
                            {cellContent}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredData.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>
              {Math.min((currentPage - 1) * pageSize + 1, filteredData.length)}-
              {Math.min(currentPage * pageSize, filteredData.length)} of{" "}
              {filteredData.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="hidden sm:flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-1 border rounded transition-colors ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <div className="sm:hidden px-3 py-1 text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
