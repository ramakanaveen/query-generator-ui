// src/components/ChatInterface.jsx
import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import InputArea from './InputArea';
import './ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const messageEndRef = useRef(null);

  // Simulate sending message to server and getting response
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
    
    // Parse directives from the message
    const directives = text.match(/@[A-Z]+/g) || [];
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate mock response based on directives
    let queryResponse = "select from trade where date=.z.d";
    
    if (directives.includes('@SPOT')) {
      queryResponse = "select top 5 from trades where date=.z.d, market=\"SPOT\"";
    } else if (directives.includes('@STIRT')) {
      queryResponse = "select from stirt_trades where date=.z.d";
    } else if (directives.includes('@TITAN')) {
      queryResponse = "select from titan_data where date=.z.d";
    }
    
    const botMessage = {
      id: Date.now() + 1,
      text: "Generated KDB/Q query:",
      query: queryResponse,
      sender: 'bot',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
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