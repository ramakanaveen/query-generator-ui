import React from 'react';
import './QueryResults.css';

const QueryResults = ({ results, isLoading, error }) => {
  if (isLoading) {
    return <div className="query-loading">Executing query...</div>;
  }

  if (error) {
    return <div className="query-error">Error: {error}</div>;
  }

  if (!results || !Array.isArray(results) || results.length === 0) {
    return <div className="query-no-results">No results found</div>;
  }

  // Collect all possible columns across all results
  // This handles cases where some rows might have columns others don't
  const columns = Array.from(
    new Set(
      results.flatMap(row => Object.keys(row || {}))
    )
  );

  if (columns.length === 0) {
    return <div className="query-no-results">Results contain no columns</div>;
  }

  return (
    <div className="query-results">
      <h3>Query Results</h3>
      <div className="results-table-container">
        <table className="results-table">
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map(column => (
                  <td key={`${rowIndex}-${column}`}>
                    {formatCellValue(row?.[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="results-metadata">
        Showing {results.length} records with {columns.length} fields
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
  
  return String(value);
};

export default QueryResults;