// src/components/Message.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import './Message.css';
import * as LucideIcons from 'lucide-react';
import { useDirectives } from '../contexts/DirectiveContext';
import { useFeedback } from '../contexts/FeedbackContext';
import { createRoot } from 'react-dom/client'; 
import QueryResults from './QueryResults';
import RetryForm from './RetryForm';
import config from '../config';

// Import markdown rendering library
import ReactMarkdown from 'react-markdown';

// API endpoint constants
const API_ENDPOINT = config.apiUrl;

const Message = ({ message, onRetry, userId, conversationId }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResults, setQueryResults] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [showThinking, setShowThinking] = useState(false);
  const [showRetryForm, setShowRetryForm] = useState(false);
  const { text, query, thinking, execution_id, sender, timestamp, id, responseType } = message;
  const { directives } = useDirectives();
  const { recordFeedback, getFeedback } = useFeedback();
  const [renderedContent, setRenderedContent] = useState('');
  
  // Get query ID for feedback
  const queryId = id || execution_id || `query-${Date.now()}`;
  
  // Get existing feedback if any
  const existingFeedback = getFeedback(queryId);
  
  // Format the timestamp
  const timeAgo = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  
  const getIconForDirective = useCallback((directiveName) => {
    const directive = directives.find(d => d.name === directiveName);
    return directive ? directive.icon : 'Hash';
  }, [directives]);
  
  // Highlight directives in user messages
  const highlightDirectives = useCallback((text) => {
    if (!text) return '';
    
    // Replace @directives with highlighted spans that include icons
    return text.replace(/@([A-Z]+)/g, (match, directiveName) => {
      const iconName = getIconForDirective(directiveName);
      
      // We'll use a placeholder that will be replaced with the actual icon in the render phase
      return `<span class="directive"><span class="directive-icon" data-icon="${iconName}"></span>@${directiveName}</span>`;
    });
  }, [getIconForDirective]);

  useEffect(() => {
    if (sender === 'user' && text) {
      setRenderedContent(highlightDirectives(text));
      
      // Need to use setTimeout to ensure the content is rendered before we try to replace icons
      setTimeout(() => {
        // Find all directive icon placeholders and replace with actual icons
        const iconPlaceholders = document.querySelectorAll('.directive-icon[data-icon]');
        
        iconPlaceholders.forEach(placeholder => {
          const iconName = placeholder.getAttribute('data-icon');
          if (iconName && LucideIcons[iconName]) {
            const Icon = LucideIcons[iconName];
            const iconElement = document.createElement('span');
            iconElement.className = 'directive-icon';
            
            // Use createRoot instead of ReactDOM.render
            const root = createRoot(iconElement);
            root.render(<Icon size={14} />);
            
            if (placeholder.parentNode) {
              placeholder.parentNode.replaceChild(iconElement, placeholder);
            }
          }
        });
      }, 0);
    } else {
      setRenderedContent(text);
    }
  }, [text, sender, highlightDirectives]);

  const handleCopyQuery = () => {
    if (query) {
      navigator.clipboard.writeText(query);
      alert('Query copied to clipboard');
    }
  };

  const handleExecuteQuery = async () => {
    if (!query) return;
    
    setIsExecuting(true);
    setQueryError(null);
    
    try {
      // Send execute request to server
      const response = await fetch(`${API_ENDPOINT}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          execution_id: execution_id || `mock-${Date.now()}`,
          params: {}
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setQueryResults(data.results);
      } else {
        // If API fails, fallback to mock data
        console.warn("Execute API failed, using mock data");
        
        // Mock data
        const mockResults = [
          { time: "09:30:00", ticker: "AAPL", price: 150.25, quantity: 1000 },
          { time: "09:32:15", ticker: "MSFT", price: 290.45, quantity: 500 },
          { time: "09:35:30", ticker: "GOOGL", price: 2750.10, quantity: 200 },
          { time: "09:40:22", ticker: "AMZN", price: 3200.50, quantity: 150 },
          { time: "09:45:18", ticker: "TSLA", price: 800.75, quantity: 350 }
        ];
        
        setQueryResults(mockResults);
      }
    } catch (error) {
      console.error('Error executing query:', error);
      setQueryError(error.message || "Failed to execute query");
      
      // Mock data as fallback
      const mockResults = [
        { time: "09:30:00", ticker: "AAPL", price: 150.25, quantity: 1000 },
        { time: "09:32:15", ticker: "MSFT", price: 290.45, quantity: 500 },
        { time: "09:35:30", ticker: "GOOGL", price: 2750.10, quantity: 200 },
        { time: "09:40:22", ticker: "AMZN", price: 3200.50, quantity: 150 },
        { time: "09:45:18", ticker: "TSLA", price: 800.75, quantity: 350 }
      ];
      
      setQueryResults(mockResults);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleFeedback = async (type) => {
    try {
      // Prepare common feedback data
      const feedbackData = {
        query_id: queryId,
        user_id: userId || 'anonymous',
        original_query: text.startsWith("Generated KDB/Q query:") ? null : text, // Fix for user message text
        generated_query: query || '',
        conversation_id: conversationId || window.conversationId || null,
        feedback_type: type,
        timestamp: new Date().toISOString()
      };
      
      // Record feedback locally
      recordFeedback(queryId, type, feedbackData);
      
      // Send to server based on type
      if (type === 'positive') {
        // Send positive feedback to server
        const endpoint = `${API_ENDPOINT}/feedback/positive`;
        console.log("Sending positive feedback to:", endpoint, feedbackData);
        
        // Look up the original user query from the message list
        const messages = document.querySelectorAll('.message');
        let originalUserQuery = null;
        messages.forEach(msg => {
          if (msg.querySelector('.sender')?.textContent === 'You') {
            originalUserQuery = msg.querySelector('.message-content')?.textContent;
          }
        });
  
        // Update feedbackData with the correct original query
        if (originalUserQuery) {
          feedbackData.original_query = originalUserQuery;
        }
  
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(feedbackData)
        });
        
        if (!response.ok) {
          console.warn('Failed to save positive feedback to server:', await response.text());
        } else {
          console.log("Positive feedback saved successfully");
        }
      } else if (type === 'negative') {
        // If negative feedback, show retry form
        setShowRetryForm(true);
      }
    } catch (error) {
      console.error("Error handling feedback:", error);
      // Still show retry form if negative feedback
      if (type === 'negative') {
        setShowRetryForm(true);
      }
    }
  };

  const handleRetry = (feedbackText) => {
    if (onRetry) {
      onRetry(text, query, feedbackText);
    }
    setShowRetryForm(false);
  };

  const handleCancelRetry = () => {
    setShowRetryForm(false);
  };

  // Determine if this is a schema description
  const isSchemaDescription = responseType === "schema_description";

  return (
    <div className={`message ${sender}`}>
      <div className="message-header">
        <span className="sender">{sender === 'user' ? 'You' : 'Bot'}</span>
        <span className="timestamp">{timeAgo}</span>
      </div>
      
      <div 
        className="message-content"
        dangerouslySetInnerHTML={{ 
          __html: renderedContent
        }}
      />
      
      {query && (
        <div className="query-container">
          {isSchemaDescription ? (
            <div className="schema-description">
              <ReactMarkdown>{query}</ReactMarkdown>
            </div>
          ) : (
            <div className="query-code" dangerouslySetInnerHTML={{ __html: query }} />
          )}
          
          <div className="query-actions">
            <div className="action-group">
              {thinking && thinking.length > 0 && (
                <button 
                  onClick={() => setShowThinking(!showThinking)} 
                  className="action-button thinking-button"
                >
                  {showThinking ? 'Hide Thinking' : 'Show Thinking'}
                </button>
              )}
              
              <button onClick={handleCopyQuery} className="action-button">
                Copy
              </button>
              
              {!isSchemaDescription && (
                <button 
                  onClick={handleExecuteQuery} 
                  className={`action-button ${isExecuting ? 'disabled' : ''}`}
                  disabled={isExecuting}
                >
                  {isExecuting ? 'Executing...' : 'Execute'}
                </button>
              )}
              
              {/* Show retry button if negative feedback was given */}
              {existingFeedback === 'negative' && !showRetryForm && (
                <button 
                  onClick={() => setShowRetryForm(true)} 
                  className="action-button retry-button"
                >
                  <LucideIcons.RefreshCw size={14} className="button-icon" />
                  Retry
                </button>
              )}
            </div>
            
            {/* Feedback buttons - only show for bot messages */}
            {sender === 'bot' && (
              <div className="feedback-buttons">
                <button 
                  onClick={() => handleFeedback('positive')}
                  className={`feedback-button ${existingFeedback === 'positive' ? 'active' : ''}`}
                  disabled={existingFeedback !== null}
                  title="This query is helpful"
                >
                  <LucideIcons.ThumbsUp size={16} />
                </button>
                <button 
                  onClick={() => handleFeedback('negative')}
                  className={`feedback-button ${existingFeedback === 'negative' ? 'active' : ''}`}
                  disabled={existingFeedback !== null}
                  title="This query needs improvement"
                >
                  <LucideIcons.ThumbsDown size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Retry form that appears when user gives negative feedback */}
      {showRetryForm && (
        <RetryForm 
          onSubmit={handleRetry} 
          onCancel={handleCancelRetry}
          originalQuery={query}
        />
      )}
      
      {showThinking && thinking && thinking.length > 0 && (
        <div className="thinking-process">
          <h4>Thinking Process:</h4>
          <ul>
            {thinking.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ul>
        </div>
      )}
      
      {queryResults && !isSchemaDescription && (
        <QueryResults 
          results={queryResults} 
          isLoading={isExecuting} 
          error={queryError} 
        />
      )}
    </div>
  );
};

export default Message;