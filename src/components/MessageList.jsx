// src/components/MessageList.jsx
import React from 'react';
import Message from './Message';
import './MessageList.css';

const MessageList = ({ messages, onRetry }) => {
  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="empty-state">
          <p>Start by typing a query with @directives (e.g., @SPOT, @STIRT, @TITAN)</p>
        </div>
      ) : (
        messages.map((message) => (
          <Message 
            key={message.id} 
            message={message} 
            onRetry={onRetry} 
          />
        ))
      )}
    </div>
  );
};

export default MessageList;