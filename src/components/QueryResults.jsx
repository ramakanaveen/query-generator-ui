import React, { useState, useEffect } from 'react';
import './QueryResults.css';
import * as LucideIcons from 'lucide-react';
import ChartView from './ChartView';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';
const QueryResults = ({ results, isLoading, error, onPageChange }) => {
  // Initialize state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [currentView, setCurrentView] = useState('table');
  const [pageSize, setPageSize] = useState(100); // Track page size at component level

  // Extract columns and set visible columns on results change
  useEffect(() => {
    if (results?.results) {
      const allColumns = Array.from(new Set(
        results.results.flatMap(row => Object.keys(row || {}))
      ));
      setVisibleColumns(allColumns);
    }
  }, [results]);
  
  if (isLoading) {
    return <div className="query-loading">Executing query...</div>;
  }

  if (error) {
    return <div className="query-error">Error: {error}</div>;
  }

  if (!results?.results || !Array.isArray(results.results) || results.results.length === 0) {
    return <div className="query-no-results">No results found</div>;
  }
  
  // Sorting logic
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Apply sorting and filtering to data
  const getProcessedResults = () => {
    let processedResults = [...results.results];
    
    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        processedResults = processedResults.filter(row => {
          const cellValue = row[key];
          const filterValue = filters[key].toLowerCase();
          return cellValue !== undefined && 
                 String(cellValue).toLowerCase().includes(filterValue);
        });
      }
    });
    
    // Apply sorting
    if (sortConfig.key) {
      processedResults.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === bValue) return 0;
        
        // Handle different data types appropriately
        const result = 
          aValue === null ? -1 :
          bValue === null ? 1 :
          typeof aValue === 'number' && typeof bValue === 'number' ? aValue - bValue :
          String(aValue).localeCompare(String(bValue));
          
        return sortConfig.direction === 'asc' ? result : -result;
      });
    }
    
    return processedResults;
  };
  
  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };
  
  const handleExportCSV = () => {
    const processedResults = getProcessedResults();
    
    // Create CSV content
    const csvHeader = visibleColumns.join(',');
    const csvRows = processedResults.map(row => {
      return visibleColumns.map(column => {
        const value = row[column];
        // Handle values that might contain commas or quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        return stringValue.includes(',') || stringValue.includes('"') ? 
          `"${stringValue.replace(/"/g, '""')}"` : 
          stringValue;
      }).join(',');
    });
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `query-results-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleExportExcel = () => {
    const processedResults = getProcessedResults();
    
    // Create worksheet from data
    const worksheet = xlsxUtils.json_to_sheet(processedResults);
    
    // Create workbook and add the worksheet
    const workbook = xlsxUtils.book_new();
    xlsxUtils.book_append_sheet(workbook, worksheet, 'Query Results');
    
    // Generate Excel file and download
    xlsxWriteFile(workbook, `query-results-${Date.now()}.xlsx`);
  };
  const handleColumnToggle = (column) => {
    setVisibleColumns(prev => 
      prev.includes(column) ? 
        prev.filter(col => col !== column) : 
        [...prev, column]
    );
  };

  // Handle page size change
  const handlePageSizeChange = (newSize) => {
    const size = Number(newSize);
    setPageSize(size);
    // When changing page size, go back to first page
    onPageChange(0, size);
  };
  
  const processedResults = getProcessedResults();

  // Calculate pagination details
  const pagination = results.pagination || {
    currentPage: 0,
    totalPages: 1,
    totalRows: processedResults.length
  };
  
  return (
    <div className="query-results">
      <div className="results-header">
        <h3>Query Results</h3>
        <div className="results-actions">
          <button 
            className={`action-button ${currentView === 'table' ? 'active' : ''}`}
            onClick={() => setCurrentView('table')}
            title="View as table"
          >
            <LucideIcons.Table size={16} />
          </button>
          <button 
            className={`action-button ${currentView === 'chart' ? 'active' : ''}`}
            onClick={() => setCurrentView('chart')}
            title="View as chart"
          >
            <LucideIcons.BarChart size={16} />
          </button>
          <button 
            className="action-button" 
            onClick={handleExportCSV}
            title="Export as CSV"
          >
            <LucideIcons.Download size={16} />
          </button>
          <button 
              className="action-button" 
              onClick={handleExportExcel}
              title="Export as Excel"
            >
              <LucideIcons.FileSpreadsheet size={16} />
          </button>
          <div className="column-selector">
            <button className="action-button" title="Manage columns">
              <LucideIcons.Columns size={16} />
            </button>
            <div className="column-dropdown">
              {visibleColumns.map(column => (
                <div key={column} className="column-option">
                  <input 
                    type="checkbox" 
                    id={`col-${column}`}
                    checked={visibleColumns.includes(column)}
                    onChange={() => handleColumnToggle(column)}
                  />
                  <label htmlFor={`col-${column}`}>{column}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {currentView === 'table' && (
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                {visibleColumns.map(column => (
                  <th 
                    key={column} 
                    onClick={() => requestSort(column)}
                    className={sortConfig.key === column ? `sorted ${sortConfig.direction}` : ''}
                  >
                    <div className="th-content">
                      <span>{column}</span>
                      {sortConfig.key === column && (
                        <span className="sort-icon">
                          {sortConfig.direction === 'asc' ? 
                            <LucideIcons.ChevronUp size={14} /> : 
                            <LucideIcons.ChevronDown size={14} />}
                        </span>
                      )}
                    </div>
                    <div className="filter-input">
                      <input 
                        type="text" 
                        placeholder="Filter..."
                        value={filters[column] || ''}
                        onChange={(e) => handleFilterChange(column, e.target.value)}
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedResults.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {visibleColumns.map(column => (
                    <td key={`${rowIndex}-${column}`}>
                      {formatCellValue(row?.[column])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {currentView === 'chart' && (
        <ChartView 
          data={processedResults} 
          columns={visibleColumns} 
        />
      )}
      
      <div className="results-footer">
        <div className="results-pagination">
          <button 
            disabled={pagination.currentPage === 0}
            onClick={() => onPageChange(pagination.currentPage - 1, pageSize)}
            className="pagination-button"
          >
            <LucideIcons.ChevronLeft size={16} />
          </button>
          <span className="pagination-info">
            Page {pagination.currentPage + 1} of {pagination.totalPages || 1}
          </span>
          <button 
            disabled={pagination.currentPage >= (pagination.totalPages - 1) || pagination.totalPages <= 1}
            onClick={() => onPageChange(pagination.currentPage + 1, pageSize)}
            className="pagination-button"
          >
            <LucideIcons.ChevronRight size={16} />
          </button>
          
          <div className="page-size-selector">
            <label>Rows per page:</label>
            <select 
              value={pageSize} 
              onChange={(e) => handlePageSizeChange(e.target.value)}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="250">250</option>
            </select>
          </div>
        </div>
        
        <div className="results-metadata">
          Showing {processedResults.length} of {pagination.totalRows || results.results.length} records 
          {results.metadata?.executionTime ? ` (Execution time: ${results.metadata.executionTime}s)` : ''}
        </div>
      </div>
    </div>
  );
};

// Helper function to format different value types
const formatCellValue = (value) => {
  if (value === undefined || value === null) {
    return <span className="empty-value">—</span>;
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `[Array(${value.length})]`;
    }
    try {
      return JSON.stringify(value);
    } catch (e) {
      return '[Object]';
    }
  }
  
  // Format dates nicely if they look like ISO dates
  if (typeof value === 'string' && 
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    try {
      return new Date(value).toLocaleString();
    } catch(e) {
      return value;
    }
  }
  
  return String(value);
};

export default QueryResults;