// src/components/ChatInterface.jsx - Updated version
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
          setConversationId(data.id);
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    };
    
    createConversation();
  }, []);

  // Send message to server and get response
  const handleSendMessage = async (text) => {
    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Send query to server
      const response = await fetch(`${API_ENDPOINT}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: text,
          model: 'gemini', // Default model, could be made configurable
          database_type: 'kdb',
          conversation_id: conversationId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        const botMessage = {
          id: Date.now() + 1,
          text: "Generated KDB/Q query:",
          query: data.generated_query,
          thinking: data.thinking,
          execution_id: data.execution_id,
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, botMessage]);
      } else {
        // Handle error
        const errorData = await response.json();
        const botMessage = {
          id: Date.now() + 1,
          text: "Error generating query:",
          query: `// Error: ${errorData.detail || 'Unknown error'}`,
          sender: 'bot',
          timestamp: new Date().toISOString(),
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const botMessage = {
        id: Date.now() + 1,
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-interface">
      <MessageList messages={messages} />
      <div ref={messageEndRef} />
      <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatInterface;