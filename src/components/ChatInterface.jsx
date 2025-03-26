// src/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import './ChatInterface.css';
import config from '../config';

// API endpoint constants
const API_ENDPOINT = config.apiUrl;

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messageEndRef = useRef(null);

  // Create conversation when component mounts
  useEffect(() => {
    const createConversation = async () => {
      try {
        const response = await fetch(`${API_ENDPOINT}/conversations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("Conversation created:", data);
          
          // Store the conversation ID
          setConversationId(data.id);
          window.conversationId = data.id;
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    };
    
    createConversation();
  }, []);

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
      const response = await fetch(`${API_ENDPOINT}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
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
          conversation_history: historyMessages
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const botMessage = {
          id: `msg-${Date.now() + 1}`,
          text: "Generated KDB/Q query:",
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
          conversation_history: historyMessages
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
    <div className="chat-interface">
      <MessageList messages={messages} onRetry={handleRetry} />
      <div ref={messageEndRef} />
      <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatInterface;