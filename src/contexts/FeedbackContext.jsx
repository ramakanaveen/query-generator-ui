// src/contexts/FeedbackContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import config from '../config';

const FeedbackContext = createContext();

export const useFeedback = () => useContext(FeedbackContext);

const FeedbackProvider = ({ children }) => {
  const [feedbackData, setFeedbackData] = useState({});
  const [isPending, setIsPending] = useState(false);
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

    // Create feedback entry with metadata
    const feedback = {
      query_id: queryId,
      feedback_type: feedbackType,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    // Add to pending queue (will be sent to server later)
    setPendingFeedback(prev => [...prev, feedback]);
    
    // For now, log to console
    console.log("Recorded feedback:", feedback);
  };

  // Check if feedback exists for a query
  const getFeedback = (queryId) => {
    return feedbackData[queryId] || null;
  };

  // This effect would handle syncing with server
  // Commented out for now - implement when backend is ready
  /*
  useEffect(() => {
    const syncFeedbackWithServer = async () => {
      // Only proceed if there's pending feedback and we're not already syncing
      if (pendingFeedback.length === 0 || isPending) return;
      
      try {
        setIsPending(true);
        setError(null);
        
        // Send feedback to server
        const response = await fetch(`${config.apiUrl}/feedback/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ feedback: pendingFeedback })
        });
        
        if (response.ok) {
          // Clear pending feedback if saved successfully
          setPendingFeedback([]);
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Failed to save feedback');
        }
      } catch (error) {
        console.error('Error saving feedback:', error);
        setError(error.message || 'Network error');
      } finally {
        setIsPending(false);
      }
    };
    
    // Attempt to sync every 30 seconds or when pendingFeedback changes
    const intervalId = setInterval(syncFeedbackWithServer, config.feedback.syncInterval);
    
    // Also try to sync immediately when new feedback is added
    syncFeedbackWithServer();
    
    return () => clearInterval(intervalId);
  }, [pendingFeedback, isPending]);
  */

  return (
    <FeedbackContext.Provider value={{ 
      recordFeedback, 
      getFeedback,
      pendingCount: pendingFeedback.length,
      isPending,
      error
    }}>
      {children}
    </FeedbackContext.Provider>
  );
};

export default FeedbackProvider;