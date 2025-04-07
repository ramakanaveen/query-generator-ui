// src/components/ConversationSidebar.jsx
import React, { useState, useEffect } from 'react';
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
  
  // Fetch user conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`${API_ENDPOINT}/user/${userId}/conversations`);
        
        if (response.ok) {
          const data = await response.json();
          // Sort by last accessed time
          const sortedData = data.sort((a, b) => 
            new Date(b.last_accessed_at) - new Date(a.last_accessed_at)
          );
          setConversations(sortedData);
        } else {
          setError('Failed to load conversations');
        }
      } catch (error) {
        setError('Error loading conversations');
        console.error('Error fetching conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConversations();
  }, [userId]);
  
  // Filter conversations based on search term
  const filteredConversations = conversations.filter(conv => 
    !conv.is_archived && (
      (conv.title && conv.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (conv.id === searchTerm)
    )
  );
  
  // Generate a title for conversations without one
  const getConversationTitle = (conversation) => {
    if (conversation.title) return conversation.title;
    
    // Use first message or a default
    if (conversation.messages && conversation.messages.length > 0) {
      const firstUserMsg = conversation.messages.find(msg => msg.role === 'user');
      if (firstUserMsg) {
        const text = firstUserMsg.content;
        return text.length > 30 ? text.substring(0, 27) + '...' : text;
      }
    }
    
    return `Conversation ${conversation.id.substring(0, 8)}`;
  };
  
  // Format the date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // If today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // If this year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Otherwise show date with year
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
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