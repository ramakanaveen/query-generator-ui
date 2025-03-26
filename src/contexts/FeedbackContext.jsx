// src/contexts/FeedbackContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import config from '../config';

const FeedbackContext = createContext();

export const useFeedback = () => useContext(FeedbackContext);

const FeedbackProvider = ({ children }) => {
  const [feedbackData, setFeedbackData] = useState({});
  const [pendingFeedback, setPendingFeedback] = useState([]);
  const [error, setError] = useState(null);

  // Load saved feedback from localStorage on initialization
  useEffect(() => {
    const savedFeedback = localStorage.getItem(config.feedback.storageKey);
    if (savedFeedback) {
      try {
        const parsed = JSON.parse(savedFeedback);
        setFeedbackData(parsed.feedback || {});
        setPendingFeedback(parsed.pending || []);
      } catch (error) {
        console.error('Error loading saved feedback:', error);
      }
    }
  }, []);

  // Save feedback to localStorage when it changes
  useEffect(() => {
    const dataToSave = {
      feedback: feedbackData,
      pending: pendingFeedback
    };
    localStorage.setItem(config.feedback.storageKey, JSON.stringify(dataToSave));
  }, [feedbackData, pendingFeedback]);

  // Record new feedback
  const recordFeedback = async (queryId, feedbackType, metadata = {}) => {
    // Update local state immediately
    setFeedbackData(prev => ({
      ...prev,
      [queryId]: feedbackType
    }));

    // Create feedback entry
    const feedback = {
      query_id: queryId,
      feedback_type: feedbackType,
      original_text: metadata.originalText || '',
      original_query: metadata.originalQuery || '',
      timestamp: new Date().toISOString()
    };

    // Add to pending queue
    setPendingFeedback(prev => [...prev, feedback]);
    
    console.log("Recorded feedback:", feedback);
    
    // We'll avoid sending to server immediately to prevent continuous errors
  };

  // Check if feedback exists for a query
  const getFeedback = (queryId) => {
    return feedbackData[queryId] || null;
  };

  // Manual sync with server (not automatic)
  const syncFeedbackWithServer = async () => {
    if (pendingFeedback.length === 0) {
      return { success: true, message: "No pending feedback to sync" };
    }
    
    try {
      // Use the flexible endpoint
      const response = await fetch(`${config.apiUrl}/feedback/flexible`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pendingFeedback[0]) // Send just one item for now
      });
      
      if (response.ok) {
        // Remove the first item from pending queue
        setPendingFeedback(prev => prev.slice(1));
        return { success: true, message: "Feedback synced successfully" };
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to save feedback');
        return { success: false, message: errorData.detail || 'Failed to save feedback' };
      }
    } catch (error) {
      console.error('Error syncing feedback:', error);
      setError(error.message || 'Network error');
      return { success: false, message: error.message || 'Network error' };
    }
  };

  return (
    <FeedbackContext.Provider value={{ 
      recordFeedback, 
      getFeedback,
      syncFeedbackWithServer,
      pendingCount: pendingFeedback.length,
      error
    }}>
      {children}
    </FeedbackContext.Provider>
  );
};

export default FeedbackProvider;