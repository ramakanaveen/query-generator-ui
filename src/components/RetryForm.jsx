// src/components/RetryForm.jsx
import React, { useState } from 'react';
import './RetryForm.css';
import * as LucideIcons from 'lucide-react';

const RetryForm = ({ onSubmit, onCancel, originalQuery }) => {
  const [feedbackText, setFeedbackText] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (feedbackText.trim()) {
      onSubmit(feedbackText);
    }
  };
  
  return (
    <div className="retry-form">
      <h4>
        <LucideIcons.Lightbulb size={16} className="form-icon" />
        Help us improve the query
      </h4>
      
      <form onSubmit={handleSubmit}>
        <p className="retry-instructions">
          Please explain what's wrong with the current query or what you'd like to see instead:
        </p>
        
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="e.g., 'This should include date filtering' or 'Use a different table'"
          rows={3}
          className="retry-textarea"
          autoFocus
        />
        
        <div className="retry-actions">
          <button 
            type="button" 
            className="retry-cancel-button"
            onClick={onCancel}
          >
            Cancel
          </button>
          
          <button 
            type="submit"
            className="retry-submit-button"
            disabled={!feedbackText.trim()}
          >
            <LucideIcons.RefreshCw size={14} className="button-icon" />
            Generate New Query
          </button>
        </div>
      </form>
    </div>
  );
};

export default RetryForm;