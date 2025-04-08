import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [showSidebar, setShowSidebar] = useState(true);
  const [isFetchingConversation, setIsFetchingConversation] = useState(false);
  const isInitialized = useRef(false);
  const userId = 'naveen'; // Use constant instead of state since we don't change it

  // Helper to format messages for the API
  const formatMessagesForAPI = useCallback((messages) => {
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
  }, []);

  // Define createConversation before using it
  const createConversation = useCallback(async () => {
    try {
      // Check if we already have an active conversation
      if (conversationId) {
        console.log('Conversation already exists:', conversationId);
        return;
      }

      const payload = {
        user_id: userId,
        title: `New Conversation ${new Date().toLocaleString()}`,
        metadata: {
          created_by: userId
        }
      };

      console.log('Creating conversation with payload:', payload);

      const response = await fetch(`${API_ENDPOINT}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Conversation created:", data);
        
        setConversationId(data.id);
        localStorage.setItem('currentConversationId', data.id);
        window.conversationId = data.id;
        
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }, [userId, conversationId]);

  // Define loadConversation with useCallback
  const loadConversation = useCallback(async (id) => {
    setIsFetchingConversation(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/conversations/${id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Conversation loaded:", data);
        
        setConversationId(data.id);
        localStorage.setItem('currentConversationId', data.id);
        window.conversationId = data.id;
        
        if (data.messages && Array.isArray(data.messages)) {
          const formattedMessages = data.messages.map(msg => ({
            id: msg.id || `msg-${Date.now()}-${Math.random()}`,
            text: msg.role === 'user' ? msg.content : 'Generated KDB/Q query:',
            query: msg.role === 'assistant' ? msg.content : null,
            sender: msg.role === 'user' ? 'user' : 'bot',
            timestamp: msg.timestamp || new Date().toISOString()
          }));
          
          setMessages(formattedMessages);
        }
      } else if (response.status === 404) {
        console.warn("Conversation not found, creating new one");
        await createConversation();
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsFetchingConversation(false);
    }
  }, [createConversation]);

  // Initialize conversation
  useEffect(() => {
    const initializeConversation = async () => {
      if (isInitialized.current) {
        return;
      }
      
      isInitialized.current = true;
      const storedConversationId = localStorage.getItem('currentConversationId');
      
      if (storedConversationId && !shouldStartNewConversation) {
        console.log('Loading stored conversation:', storedConversationId);
        try {
          const response = await fetch(`${API_ENDPOINT}/conversations/${storedConversationId}`);
          if (response.ok) {
            await loadConversation(storedConversationId);
          } else {
            console.log('Stored conversation not found, creating new one');
            await createConversation();
            setShouldStartNewConversation(false);
          }
        } catch (error) {
          console.error('Error checking stored conversation:', error);
          await createConversation();
          setShouldStartNewConversation(false);
        }
      } else {
        console.log('Creating new conversation');
        await createConversation();
        setShouldStartNewConversation(false);
      }
    };

    initializeConversation();
  }, [shouldStartNewConversation, loadConversation, createConversation]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = async () => {
    try {
      isInitialized.current = false;
      setMessages([]);
      setShouldStartNewConversation(true);
      
      const response = await fetch(`${API_ENDPOINT}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          title: `New Conversation ${new Date().toLocaleString()}`,
          metadata: {
            created_by: userId
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversationId(data.id);
        localStorage.setItem('currentConversationId', data.id);
        window.conversationId = data.id;
        setShouldStartNewConversation(false);
        console.log('New conversation created:', data.id);
      } else {
        console.error('Failed to create new conversation');
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
    }
  };

  const handleConversationSelect = useCallback((id) => {
    if (id === conversationId) return;
    loadConversation(id);
  }, [conversationId, loadConversation]);

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  // Save message to conversation
  const saveMessageToConversation = async (messageData) => {
    if (!conversationId) {
      return { success: false, error: "No conversation ID" };
    }
    
    try {
      const completeMessageData = {
        id: messageData.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: messageData.role,
        content: messageData.content,
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

  const handleSendMessage = async (text) => {
    const userMessage = {
      id: `msg-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      // Get conversation summary if needed
      let conversationSummary = "";
      if (messages.length >= 3) {
        try {
          const summaryResponse = await fetch(`${API_ENDPOINT}/conversations/${conversationId}/summary`);
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            conversationSummary = summaryData.summary;
          }
        } catch (error) {
          console.warn("Error getting conversation summary:", error);
        }
      }

      // Update conversation title if this is the first message
      if (messages.length === 0) {
        try {
          await fetch(`${API_ENDPOINT}/conversations/${conversationId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: text.slice(0, 50)
            })
          });
        } catch (error) {
          console.warn('Failed to update conversation title:', error);
        }
      }
      
      const allMessages = [...messages, userMessage];
      const recentMessages = allMessages.slice(-5);
      const historyMessages = formatMessagesForAPI(recentMessages);
      
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
        const responseType = data.response_type || "query";
        
        const botMessage = {
          id: `msg-${Date.now() + 1}`,
          text: responseType === "schema_description" ? "Schema Information:" : "Generated KDB/Q query:",
          query: responseType === "schema_description" ? data.generated_content : data.generated_query,
          thinking: data.thinking,
          execution_id: data.execution_id,
          sender: 'bot',
          timestamp: new Date().toISOString(),
          responseType: responseType
        };
        
        setMessages(prev => [...prev, botMessage]);
        
        if (conversationId) {
          await saveMessageToConversation({
            id: userMessage.id,
            role: 'user',
            content: userMessage.text
          });
          
          await saveMessageToConversation({
            id: botMessage.id,
            role: 'assistant',
            content: botMessage.query
          });
        }
      } else {
        const errorText = await response.text();
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

  const handleRetry = async (originalText, originalQuery, feedbackText) => {
    const userMessage = {
      id: `msg-${Date.now()}`,
      text: `Can you fix this query? ${feedbackText}`,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      let conversationSummary = "";
      try {
        const summaryResponse = await fetch(`${API_ENDPOINT}/conversations/${conversationId}/summary`);
        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          conversationSummary = summaryData.summary;
        }
      } catch (error) {
        console.warn("Error getting conversation summary:", error);
      }
      
      const allMessages = [...messages, userMessage];
      const recentMessages = allMessages.slice(-5);
      const historyMessages = formatMessagesForAPI(recentMessages);
      
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
        
        if (conversationId) {
          await saveMessageToConversation({
            role: 'user',
            content: userMessage.text
          });
          
          await saveMessageToConversation({
            role: 'assistant',
            content: botMessage.query
          });
        }
      } else {
        const errorText = await response.text();
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
      
      const botMessage = {
        id: `msg-${Date.now() + 1}`,
        text: "Improved KDB/Q query (mock):",
        query: `// Error generating improved query: ${error.message}`,
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setIsLoading(false);
    }
  };

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