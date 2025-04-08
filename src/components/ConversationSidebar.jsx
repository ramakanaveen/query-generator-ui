import React, { useState, useEffect, useCallback } from 'react';
import './ConversationSidebar.css';
import * as LucideIcons from 'lucide-react';
import config from '../config';

const API_ENDPOINT = config.apiUrl;

const ConversationSidebar = ({ 
  userId, 
  currentConversationId, 
  onConversationSelect, 
  onNewConversation 
}) => {
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  
  const fetchConversations = useCallback(async () => {
    if (!userId) {
      console.warn('No userId provided');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log(`Fetching conversations for user: ${userId}`);
      const response = await fetch(`${API_ENDPOINT}/user/${userId}/conversations`);
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Raw conversations data:', data);
        
        const processedData = (Array.isArray(data) ? data : []).map(conversation => {
          if (!conversation) return null;
          
          try {
            let title = conversation.title;
            
            if (!title && conversation.messages && Array.isArray(conversation.messages)) {
              const firstUserMsg = conversation.messages.find(msg => msg.role === 'user');
              if (firstUserMsg) {
                title = firstUserMsg.content.slice(0, 50);
              }
            }
            
            if (!title) {
              title = `Conversation ${new Date(conversation.created_at).toLocaleDateString()}`;
            }
            
            return {
              ...conversation,
              title: title
            };
          } catch (err) {
            console.error('Error processing conversation:', err);
            return null;
          }
        }).filter(Boolean);
  
        const sortedData = processedData.sort((a, b) => 
          new Date(b.last_accessed_at || b.created_at) - new Date(a.last_accessed_at || a.created_at)
        );
        
        console.log('Processed conversations:', sortedData);
        setConversations(sortedData);
      } else {
        console.error('Failed to load conversations:', await response.text());
        setError('Failed to load conversations');
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setError(`Error loading conversations: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Fetch user conversations
  useEffect(() => {
    fetchConversations();
  }, [userId, currentConversationId, fetchConversations]);


  // Format the date for display
  const formatDate = (dateString) => {
    try {
      // Remove the timezone offset from PostgreSQL timestamp
      const cleanDateString = dateString.replace(/\+\d{2}$/, '');
      const date = new Date(cleanDateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return '';
      }
      
      const now = new Date();
      
      // If today, show time
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false // Use 24-hour format to match your data
        });
      }
      
      // If this year, show month and day
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { 
          month: 'short', 
          day: 'numeric'
        });
      }
      
      // Otherwise show date with year
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric'
      });
    } catch (e) {
      console.warn('Error formatting date:', e, 'for date string:', dateString);
      return '';
    }
  };

  // Generate a title for conversations without one
  const getConversationTitle = (conversation) => {
    if (!conversation) return 'Untitled';
    
    // Use existing title if available
    if (conversation.title && conversation.title !== 'null' && conversation.title !== 'undefined') {
      return conversation.title;
    }
    
    // Try to get title from messages
    if (conversation.messages && Array.isArray(conversation.messages) && conversation.messages.length > 0) {
      const firstUserMsg = conversation.messages.find(msg => msg.role === 'user');
      if (firstUserMsg && firstUserMsg.content) {
        const text = firstUserMsg.content;
        return text.length > 30 ? text.substring(0, 27) + '...' : text;
      }
    }
    
    // If no title or messages, create title from created_at date
    if (conversation.created_at) {
      try {
        const cleanDateString = conversation.created_at.replace(/\+\d{2}$/, '');
        const date = new Date(cleanDateString);
        if (!isNaN(date.getTime())) {
          return `Conversation ${date.toLocaleString([], {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })}`;
        }
      } catch (e) {
        console.warn('Error parsing date:', e);
      }
    }
  
    // Fallback to simple format with ID
    return `Conversation ${conversation.id.substring(0, 8)}`;
  };

  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv => 
    !conv.is_archived && (
      (conv.title && conv.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (conv.id === searchTerm)
    )
  );

  return (
    <div className="conversation-sidebar">
      <div className="sidebar-header">
        <h2>Conversations</h2>
        <button 
          className="new-conversation-button"
          onClick={onNewConversation}
        >
          <LucideIcons.Plus size={16} />
          <span>New</span>
        </button>
      </div>
      
      <div className="search-container">
        <LucideIcons.Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search conversations"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div className="conversations-list">
        {isLoading ? (
          <div className="loading-state">Loading conversations...</div>
        ) : error ? (
          <div className="error-state">{error}</div>
        ) : filteredConversations.length === 0 ? (
          <div className="empty-state">
            {searchTerm ? 'No matching conversations' : 'No conversations yet'}
          </div>
        ) : (
          filteredConversations.map(conversation => (
            <div
              key={conversation.id}
              className={`conversation-item ${conversation.id === currentConversationId ? 'active' : ''}`}
              onClick={() => onConversationSelect(conversation.id)}
              title={conversation.summary || getConversationTitle(conversation)}
            >
              <div className="conversation-title">
                {getConversationTitle(conversation)}
              </div>
              <div className="conversation-date">
                {formatDate(conversation.last_accessed_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;