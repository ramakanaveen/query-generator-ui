// src/components/visualization/VisualizationControls.jsx
import React from 'react';

const VisualizationControls = ({ results, onViewChange }) => {
  return (
    <div className="viz-controls">
      <button 
        className="viz-button active" 
        onClick={() => onViewChange('table')}
      >
        Table
      </button>
      <button 
        className="viz-button" 
        onClick={() => onViewChange('chart')}
      >
        Chart
      </button>
      {/* More visualization options to be added later */}
    </div>
  );
};

export default VisualizationControls;