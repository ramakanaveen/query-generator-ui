// src/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import ConversationSidebar from './ConversationSidebar';
import './ChatInterface.css';
import config from '../config';
import * as LucideIcons from 'lucide-react';

// API endpoint constants
const API_ENDPOINT = config.apiUrl;

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messageEndRef = useRef(null);
  const [shouldStartNewConversation, setShouldStartNewConversation] = useState(true);

  // New state variables for conversation management
  const [userId, setUserId] = useState('naveen'); // Default user for testing
  const [showSidebar, setShowSidebar] = useState(true);
  const [isFetchingConversation, setIsFetchingConversation] = useState(false);
  
  // Create conversation when component mounts
  useEffect(() => {
    // Check if we have a stored conversation ID
    const storedConversationId = localStorage.getItem('currentConversationId');
    
    if (storedConversationId && !shouldStartNewConversation) {
      // Try to load the stored conversation
      loadConversation(storedConversationId);
    } else {
      // Create a new conversation
      createConversation();
      setShouldStartNewConversation(false);
    }
  }, [shouldStartNewConversation]);

  // Helper to format messages for the API - Keep this very simple
  const formatMessagesForAPI = (messages) => {
    const formattedMessages = [];
    
    for (const msg of messages) {
      if (msg.sender === 'user') {
        formattedMessages.push({
          role: 'user',
          content: msg.text
        });
      } else if (msg.sender === 'bot' && msg.query) {
        formattedMessages.push({
          role: 'assistant',
          content: msg.query
        });
      }
    }
    
    return formattedMessages;
  };

  // Helper to save a message to the conversation
  const saveMessageToConversation = async (messageData) => {
    if (!conversationId) {
      return { success: false, error: "No conversation ID" };
    }
    
    try {
      const completeMessageData = {
        id: messageData.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: messageData.role,
        content: messageData.content,
        // timestamp will default on server
        // metadata is optional
      };

      const response = await fetch(`${API_ENDPOINT}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(completeMessageData)
      });
      
      if (!response.ok) {
        console.warn(`Could not save ${messageData.role} message to conversation - continuing without saving`);
        return { success: false, error: "API Error" };
      }
      
      return { success: true };
    } catch (error) {
      console.warn(`Error saving ${messageData.role} message:`, error);
      return { success: false, error: error.message };
    }
  };
  
  // Create a new conversation
  const createConversation = async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Conversation created:", data);
        
        // Store the conversation ID
        setConversationId(data.id);
        localStorage.setItem('currentConversationId', data.id);
        window.conversationId = data.id;
        
        // Clear messages for the new conversation
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };
  
  // Load an existing conversation
  const loadConversation = async (id) => {
    setIsFetchingConversation(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/conversations/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Conversation loaded:", data);
        
        // Store the conversation ID
        setConversationId(data.id);
        localStorage.setItem('currentConversationId', data.id);
        window.conversationId = data.id;
        
        // Load messages from the conversation
        if (data.messages && Array.isArray(data.messages)) {
          const formattedMessages = data.messages.map(msg => ({
            id: msg.id || `msg-${Date.now()}-${Math.random()}`,
            text: msg.role === 'user' ? msg.content : 'Generated KDB/Q query:',
            query: msg.role === 'assistant' ? msg.content : null,
            sender: msg.role === 'user' ? 'user' : 'bot',
            timestamp: msg.timestamp || new Date().toISOString()
          }));
          
          setMessages(formattedMessages);
        } else {
          setMessages([]);
        }
        
        // Update the conversation in our server for last_accessed_at
        await fetch(`${API_ENDPOINT}/conversations/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})  // Empty update just to refresh last_accessed_at
        });
      } else if (response.status === 404) {
        // Conversation not found, create a new one
        console.warn("Conversation not found, creating new one");
        createConversation();
      } else {
        console.error("Error loading conversation");
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsFetchingConversation(false);
    }
  };
  
  // Handle conversation selection from sidebar
  const handleConversationSelect = (id) => {
    if (id === conversationId) return; // Already selected
    loadConversation(id);
  };
  
  // Handle creating a new conversation
  const handleNewConversation = async () => {
    // First update the current conversation title if it doesn't have one
    if (conversationId && messages.length > 0) {
      try {
        // Generate a title from the first user message
        const firstUserMessage = messages.find(msg => msg.sender === 'user');
        let title = firstUserMessage ? firstUserMessage.text : "Untitled Conversation";
        
        // Limit title length
        if (title.length > 50) {
          title = title.substring(0, 47) + '...';
        }
        
        // Update the conversation
        await fetch(`${API_ENDPOINT}/conversations/${conversationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: title,
          })
        });
        
        console.log(`Updated title for conversation ${conversationId}`);
      } catch (error) {
        console.warn('Failed to update conversation title:', error);
      }
    }
    
    // Set flag to create new conversation on next render cycle
    setShouldStartNewConversation(true);
    
    // Clear messages immediately for better UX
    setMessages([]);
  };
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Send message to server and get response
  const handleSendMessage = async (text) => {
    // Add user message to chat
    const userMessage = {
      id: `msg-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Get conversation summary if we have enough messages
      let conversationSummary = "";
      if (messages.length >= 3) {
        try {
          // Get summary from backend
          const summaryResponse = await fetch(`${API_ENDPOINT}/conversations/${conversationId}/summary`, {
            method: 'GET'
          });
          
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            conversationSummary = summaryData.summary;
          }
        } catch (error) {
          console.warn("Error getting conversation summary:", error);
        }
      }
      
      // Collect all previous messages
      const allMessages = [...messages, userMessage];
      
      // Format the last 5 messages only
      const recentMessages = allMessages.slice(-5);
      const historyMessages = formatMessagesForAPI(recentMessages);
      
      console.log("Sending conversation history:", JSON.stringify(historyMessages));
      
      // Send query to server
      const response = await fetch(`${API_ENDPOINT}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: text,
          model: 'gemini',
          database_type: 'kdb',
          conversation_id: conversationId,
          conversation_history: historyMessages,
          conversation_summary: conversationSummary,
          user_id: userId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Check response type for different kinds of responses
        const responseType = data.response_type || "query";
        
        const botMessage = {
          id: `msg-${Date.now() + 1}`,
          text: responseType === "schema_description" 
                ? "Schema Information:" 
                : "Generated KDB/Q query:",
          query: responseType === "schema_description" 
                ? data.generated_content 
                : data.generated_query,
          thinking: data.thinking,
          execution_id: data.execution_id,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          responseType: responseType  // Store the response type
        };
        
        setMessages(prev => [...prev, botMessage]);
        
        // Save messages to conversation history with better error handling
        if (conversationId) {
          // Save user message - only using minimal required fields
          await saveMessageToConversation({
            id: userMessage.id,
            role: 'user',
            content: userMessage.text
          });
          
          // Save bot message - only using minimal required fields
          await saveMessageToConversation({
            id: botMessage.id,
            role: 'assistant',
            content: botMessage.query
          });
        }
      } else {
        // Handle error
        const errorText = await response.text();
        console.error("Error response:", errorText);
        
        let errorMessage = "Unknown error";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || "Unknown error";
        } catch (e) {
          errorMessage = errorText || "Unknown error";
        }
        
        const botMessage = {
          id: `msg-${Date.now() + 1}`,
          text: "Error generating query:",
          query: `// Error: ${errorMessage}`,
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const botMessage = {
        id: `msg-${Date.now() + 1}`,
        text: "Error generating query:",
        query: `// Error: ${error.message || 'Network error'}`,
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle retry request
  const handleRetry = async (originalText, originalQuery, feedbackText) => {
    // Add user message to chat with the feedback
    const userMessage = {
      id: `msg-${Date.now()}`,
      text: `Can you fix this query? ${feedbackText}`,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Get conversation summary
      let conversationSummary = "";
      try {
        const summaryResponse = await fetch(`${API_ENDPOINT}/conversations/${conversationId}/summary`, {
          method: 'GET'
        });
        
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          conversationSummary = summaryData.summary;
        }
      } catch (error) {
        console.warn("Error getting conversation summary:", error);
      }
      
      // Collect all previous messages
      const allMessages = [...messages, userMessage];
      
      // Format the last 5 messages only
      const recentMessages = allMessages.slice(-5);
      const historyMessages = formatMessagesForAPI(recentMessages);
      
      // Send retry request to server
      const response = await fetch(`${API_ENDPOINT}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          original_query: originalText,
          original_generated_query: originalQuery,
          feedback: feedbackText,
          model: 'gemini',
          database_type: 'kdb',
          conversation_id: conversationId,
          conversation_history: historyMessages,
          conversation_summary: conversationSummary,
          user_id: userId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const botMessage = {
          id: `msg-${Date.now() + 1}`,
          text: "Improved KDB/Q query:",
          query: data.generated_query,
          thinking: data.thinking,
          execution_id: data.execution_id,
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, botMessage]);
        
        // Save messages to conversation history with better error handling
        if (conversationId) {
          // Save user message - only using minimal required fields
          await saveMessageToConversation({
            role: 'user',
            content: userMessage.text
          });
          
          // Save bot message - only using minimal required fields
          await saveMessageToConversation({
            role: 'assistant',
            content: botMessage.query
          });
        }
      } else {
        // Handle error
        const errorText = await response.text();
        console.error("Error response:", errorText);
        
        let errorMessage = "Unknown error";
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || "Unknown error";
        } catch (e) {
          errorMessage = errorText || "Unknown error";
        }
        
        const botMessage = {
          id: `msg-${Date.now() + 1}`,
          text: "Error generating improved query:",
          query: `// Error: ${errorMessage}`,
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending retry request:', error);
      
      // Fall back to mock improved query for demo purposes
      const mockImprovedQuery = `// Improved query based on feedback: "${feedbackText}"\n` +
        (originalQuery ? originalQuery.replace('select', 'select distinct') : '// No original query available');
      
      const botMessage = {
        id: `msg-${Date.now() + 1}`,
        text: "Improved KDB/Q query (mock):",
        query: mockImprovedQuery,
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`chat-interface ${showSidebar ? 'with-sidebar' : ''}`}>
      {showSidebar && (
        <ConversationSidebar
          userId={userId}
          currentConversationId={conversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
        />
      )}
      
      <div className="chat-main">
        <div className="chat-header">
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            {showSidebar ? <LucideIcons.PanelLeftClose size={20} /> : <LucideIcons.PanelLeftOpen size={20} />}
          </button>
          <h2>QConnect</h2>
        </div>
        
        {isFetchingConversation ? (
          <div className="loading-conversation">Loading conversation...</div>
        ) : (
          <>
            <MessageList 
              messages={messages} 
              onRetry={handleRetry} 
              userId={userId}
              conversationId={conversationId}
            />
            <div ref={messageEndRef} />
            <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;