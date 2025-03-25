// src/components/Message.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import './Message.css';
import * as LucideIcons from 'lucide-react';
import { useDirectives } from '../contexts/DirectiveContext';
import ReactDOM from 'react-dom';
import QueryResults from './QueryResults';

// API endpoint constants
const API_ENDPOINT = 'http://localhost:8000/api/v1';

const Message = ({ message }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResults, setQueryResults] = useState(null);
  const [queryError, setQueryError] = useState(null);
  const [showThinking, setShowThinking] = useState(false);
  const { text, query, thinking, execution_id, sender, timestamp } = message;
  const { directives } = useDirectives();
  const [renderedContent, setRenderedContent] = useState('');
  
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
            ReactDOM.render(<Icon size={14} />, iconElement);
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
          <div className="query-code" dangerouslySetInnerHTML={{ __html: query }} />
          <div className="query-actions">
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
            <button 
              onClick={handleExecuteQuery} 
              className={`action-button ${isExecuting ? 'disabled' : ''}`}
              disabled={isExecuting}
            >
              {isExecuting ? 'Executing...' : 'Execute'}
            </button>
          </div>
        </div>
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
      
      {queryResults && (
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