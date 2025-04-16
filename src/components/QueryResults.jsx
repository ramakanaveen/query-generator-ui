import React, { useState, useEffect } from 'react';
import './QueryResults.css';
import * as LucideIcons from 'lucide-react';
import ChartView from './ChartView';
import { utils as xlsxUtils, writeFile as xlsxWriteFile } from 'xlsx';

const QueryResults = ({ results, isLoading, error }) => {
  // Initialize state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({});
  const [availableColumns, setAvailableColumns] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [currentView, setCurrentView] = useState('table');
  const [currentPage, setCurrentPage] = useState(0);
  const [localPageSize, setLocalPageSize] = useState(10);
  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // Extract columns and set visible columns on results change
  useEffect(() => {
    if (results?.results) {
      const allColumns = Array.from(new Set(
        results.results.flatMap(row => Object.keys(row || {}))
      ));
      setAvailableColumns(allColumns);
      
      // Initialize visible columns with all columns if empty
      if (visibleColumns.length === 0) {
        setVisibleColumns(allColumns);
      } else {
        // Keep only valid columns that exist in the new results
        setVisibleColumns(prev => prev.filter(col => allColumns.includes(col)));
      }
    }
  }, [visibleColumns.length,results]);
  
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

  // Get paginated results for current view
  const getPaginatedResults = () => {
    const processed = getProcessedResults();
    const startIndex = currentPage * localPageSize;
    const endIndex = startIndex + localPageSize;
    return processed.slice(startIndex, endIndex);
  };
  
  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
    // Reset to first page when filtering
    setCurrentPage(0);
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
    
    // Create a filtered dataset with only visible columns
    const filteredData = processedResults.map(row => {
      const filteredRow = {};
      visibleColumns.forEach(column => {
        filteredRow[column] = row[column];
      });
      return filteredRow;
    });
    
    // Create worksheet from data
    const worksheet = xlsxUtils.json_to_sheet(filteredData);
    
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

  // Handle local page change
  const handleLocalPageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Calculate total pages
  const totalPages = Math.ceil(getProcessedResults().length / localPageSize) || 1;
  
  const processedResults = getProcessedResults();
  const paginatedResults = getPaginatedResults();
  
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
            <LucideIcons.Table size={20} />
          </button>
          <button 
            className={`action-button ${currentView === 'chart' ? 'active' : ''}`}
            onClick={() => setCurrentView('chart')}
            title="View as chart"
          >
            <LucideIcons.BarChart size={20} />
          </button>
          <button 
            className="action-button" 
            onClick={handleExportCSV}
            title="Export as CSV"
          >
            <LucideIcons.Download size={20} />
          </button>
          <button 
            className="action-button" 
            onClick={handleExportExcel}
            title="Export as Excel"
          >
            <LucideIcons.FileSpreadsheet size={20} />
          </button>
          <div className="column-selector">
            <button 
              className="action-button" 
              title="Manage columns"
              onClick={() => setShowColumnSelector(!showColumnSelector)}
            >
              <LucideIcons.Columns size={16} />
            </button>
            {showColumnSelector && (
              <div className="column-dropdown">
                <div className="column-dropdown-header">
                  <span>Show/Hide Columns</span>
                  <button 
                    className="column-dropdown-close"
                    onClick={() => setShowColumnSelector(false)}
                  >
                    <LucideIcons.X size={14} />
                  </button>
                </div>
                <div className="column-options-container">
                  {availableColumns.map(column => (
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
                {availableColumns.length > 5 && (
                  <div className="column-dropdown-actions">
                    <button 
                      className="column-action-button"
                      onClick={() => setVisibleColumns([...availableColumns])}
                    >
                      Select All
                    </button>
                    <button 
                      className="column-action-button"
                      onClick={() => setVisibleColumns([])}
                    >
                      Deselect All
                    </button>
                  </div>
                )}
              </div>
            )}
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
                            <LucideIcons.ChevronUp size={16} /> : 
                            <LucideIcons.ChevronDown size={16} />}
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
              {paginatedResults.map((row, rowIndex) => (
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
          data={getProcessedResults()} 
          columns={visibleColumns} 
        />
      )}
      
      <div className="results-footer">
        <div className="results-pagination">
          <button 
            disabled={currentPage === 0}
            onClick={() => handleLocalPageChange(currentPage - 1)}
            className="pagination-button"
          >
            <LucideIcons.ChevronLeft size={16} />
          </button>
          <span className="pagination-info">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button 
            disabled={currentPage >= totalPages - 1}
            onClick={() => handleLocalPageChange(currentPage + 1)}
            className="pagination-button"
          >
            <LucideIcons.ChevronRight size={16} />
          </button>
          
          <div className="page-size-selector">
            <label>Rows per page:</label>
            <select 
              value={localPageSize} 
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setLocalPageSize(newSize);
                setCurrentPage(0); // Reset to first page when changing page size
              }}
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
          Showing {Math.min(localPageSize, processedResults.length - currentPage * localPageSize)} of {processedResults.length} records 
          {results.metadata?.executionTime ? ` (Execution time: ${results.metadata.executionTime}s)` : ''}
        </div>
      </div>
    </div>
  );
};

// Enhanced helper function to format different value types with improved number formatting
const formatCellValue = (value) => {
  if (value === undefined || value === null) {
    return <span className="empty-value">—</span>;
  }
  
  // Format numbers with appropriate precision
  if (typeof value === 'number') {
    // Integer values (whole numbers)
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }
    
    // Values with decimal places
    // If more than 4 decimal places, limit to 4
    if (Math.abs(value) < 0.0001) {
      // Very small numbers use scientific notation
      return value.toExponential(4);
    } else if (String(value).includes('.') && String(value).split('.')[1].length > 4) {
      return value.toLocaleString(undefined, { 
        minimumFractionDigits: 2,
        maximumFractionDigits: 4 
      });
    }
    
    // Otherwise, use locale formatting without fixed precision
    return value.toLocaleString();
  }
  
  // Handle other types
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