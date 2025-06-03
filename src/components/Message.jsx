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
import { useAuth } from '../contexts/AuthContext';
// Import markdown rendering library
import ReactMarkdown from 'react-markdown';

// API endpoint constants
const API_ENDPOINT = config.apiUrl;

const Message = ({ message, onRetry, conversationId }) => {
  // Add this debug logging right at the start
  console.log("=== MESSAGE DEBUG ===");
  console.log("Full message object:", message);
  console.log("message.text:", message.text);
  console.log("message.originalUserQuery:", message.originalUserQuery);
  console.log("message.sender:", message.sender);
  console.log("====================");

  const { userId } = useAuth();
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResults, setQueryResults] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [showThinking, setShowThinking] = useState(false);
  const [showRetryForm, setShowRetryForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
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

  const handleExecuteQuery = async (page = currentPage, size = pageSize) => {
    if (!query) return;
    
    setIsExecuting(true);
    setQueryError(null);
    
    try {
      // Send execute request to server with pagination params
      const response = await fetch(`${API_ENDPOINT}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          execution_id: execution_id || `mock-${Date.now()}`,
          params: {},
          pagination: {
            page,
            pageSize: size
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Store both the results and pagination information
        setQueryResults({
          results: data.results,
          metadata: data.metadata,
          pagination: data.pagination || {
            currentPage: page,
            totalPages: Math.ceil((data.metadata?.totalRows || data.results.length) / size),
            totalRows: data.metadata?.totalRows || data.results.length
          }
        });
        
        // Update current page state
        setCurrentPage(page);
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
        
        setQueryResults({
          results: mockResults,
          metadata: { totalRows: mockResults.length },
          pagination: {
            currentPage: 0,
            totalPages: 1,
            totalRows: mockResults.length
          }
        });
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
      
      setQueryResults({
        results: mockResults,
        metadata: { error: error.message },
        pagination: {
          currentPage: 0,
          totalPages: 1,
          totalRows: mockResults.length
        }
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Add a handler for page changes that includes pageSize
  const handlePageChange = (newPage, newPageSize = pageSize) => {
    // Update pageSize if it changed
    if (newPageSize !== pageSize) {
      setPageSize(newPageSize);
    }
    
    // Execute the query with new page and page size
    handleExecuteQuery(newPage, newPageSize);
  };

  const handleFeedback = async (type) => {
    try {
      console.log("=== FEEDBACK DEBUG ===");
      console.log("message object in handleFeedback:", message);
      console.log("message.originalUserQuery:", message.originalUserQuery);
      console.log("message.text:", message.text);
      console.log("Using originalUserQuery:", message.originalUserQuery || 'FALLBACK: Unknown query');
      
      // Prepare common feedback data
      const feedbackData = {
        query_id: queryId,
        user_id: userId || 'anonymous',
        original_query: message.originalUserQuery || 'Unknown query', // Use the stored original user query
        generated_query: query || '',
        conversation_id: conversationId || window.conversationId || null,
        feedback_type: type,
        timestamp: new Date().toISOString()
      };
      
      console.log("Final feedback data being sent:", feedbackData);
      console.log("========================");
      
      // Record feedback locally
      recordFeedback(queryId, type, feedbackData);
      
      // Send to server based on type
      if (type === 'positive') {
        const endpoint = `${API_ENDPOINT}/feedback/positive`;
        console.log("Sending positive feedback to:", endpoint, feedbackData);

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
    console.log("=== RETRY DEBUG ===");
    console.log("message.originalUserQuery in retry:", message.originalUserQuery);
    console.log("feedbackText:", feedbackText);
    console.log("==================");
    if (onRetry) {
      // Pass the ORIGINAL user query, not the bot's display text
      const originalUserText = message.originalUserQuery || 'Unknown query';
      onRetry(originalUserText, query, feedbackText);
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
            <div style={{ padding: '10px', borderTop: '1px solid #e0e0e0', backgroundColor: '#f1f1f1', display: 'flex', gap: '8px' }}>
              <button 
                style={{ 
                  padding: '5px 10px', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px', 
                  backgroundColor: 'white', 
                  cursor: 'pointer' 
                }}
                onClick={handleCopyQuery}
              >
                Copy
              </button>
              
              <button 
                style={{ 
                  padding: '5px 10px', 
                  border: '1px solid #0277bd', 
                  borderRadius: '4px', 
                  backgroundColor: '#0277bd', 
                  color: 'white', 
                  cursor: 'pointer' 
                }}
                onClick={() => handleExecuteQuery()}
                disabled={isExecuting}
              >
                {isExecuting ? 'Executing...' : 'Execute'}
              </button>
            
              
              {thinking && thinking.length > 0 && (
                <button 
                  style={{ 
                    padding: '5px 10px', 
                    border: '1px solid #6c757d', 
                    borderRadius: '4px', 
                    backgroundColor: '#6c757d', 
                    color: 'white', 
                    cursor: 'pointer' 
                  }}
                  onClick={() => setShowThinking(!showThinking)}
                >
                  {showThinking ? 'Hide Thinking' : 'Show Thinking'}
                </button>
              )}
              </div>
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
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default Message;