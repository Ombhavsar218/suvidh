import { useState, useMemo } from 'react';

export function useTableState(data = [], {
  initialPageSize = 8,
  initialSortKey = '',
  initialSortDir = 'asc',
  searchFields = [],
  filterFn = null,
} = {}) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [sortKey, setSortKey] = useState(initialSortKey);
  const [sortDir, setSortDir] = useState(initialSortDir);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setSearch('');
    setFilters({});
    setPage(1);
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const filteredData = useMemo(() => {
    let result = [...data];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((item) => {
        if (searchFields.length > 0) {
          return searchFields.some((field) => {
            const val = typeof field === 'function' ? field(item) : item[field];
            return String(val ?? '').toLowerCase().includes(q);
          });
        }
        return Object.values(item).some((val) =>
          String(val ?? '').toLowerCase().includes(q)
        );
      });
    }

    if (filterFn) {
      result = result.filter((item) => filterFn(item, filters));
    } else {
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'All') {
          result = result.filter((item) => String(item[key]) === String(value));
        }
      });
    }

    if (sortKey) {
      result.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }

    return result;
  }, [data, search, filters, sortKey, sortDir, searchFields, filterFn]);

  const totalItems = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, safePage, pageSize]);

  return {
    search,
    setSearch: handleSearch,
    filters,
    setFilter,
    resetFilters,
    sortKey,
    sortDir,
    handleSort,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    filteredData,
    paginatedData,
  };
}
