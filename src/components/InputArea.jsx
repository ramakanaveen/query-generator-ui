// src/components/InputArea.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useDirectives } from '../contexts/DirectiveContext';
import './InputArea.css';
import * as LucideIcons from 'lucide-react';

const InputArea = ({ onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [showDirectives, setShowDirectives] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef(null);
  const directiveRef = useRef(null);
  const { directives, isLoading: directivesLoading, error: directivesError } = useDirectives();

  // Handle clicking outside directive dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (directiveRef.current && !directiveRef.current.contains(event.target)) {
        setShowDirectives(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleKeyDown = (e) => {
    // Submit form on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }

    // Show directives dropdown on @ key
    if (e.key === '@') {
      setShowDirectives(true);
    }

    // Close directives dropdown on Escape
    if (e.key === 'Escape') {
      setShowDirectives(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText);
      setInputText('');
      setShowDirectives(false);
    }
  };

  const insertDirective = (directive) => {
    const before = inputText.substring(0, cursorPosition);
    const after = inputText.substring(cursorPosition);
    
    // If we're not immediately after an @, add one
    const newText = before.endsWith('@') 
      ? before + directive + ' ' + after 
      : before + '@' + directive + ' ' + after;
    
    setInputText(newText);
    setShowDirectives(false);
    
    // Focus back on input
    inputRef.current.focus();
  };

  const toggleDirectiveDropdown = () => {
    setShowDirectives(!showDirectives);
    if (!showDirectives) {
      // If opening dropdown, focus on input and add @ if needed
      inputRef.current.focus();
      if (!inputText.endsWith('@')) {
        setInputText(inputText + '@');
        setCursorPosition(inputText.length + 1);
      }
    }
  };

  const IconComponent = ({ iconName, size = 16 }) => {
    const Icon = LucideIcons[iconName] || LucideIcons.Hash;
    return <Icon size={size} />;
  };

  return (
    <form className="input-area" onSubmit={handleSubmit}>
      <div className="input-container">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your query here..."
          disabled={isLoading}
          className={isLoading ? 'disabled' : ''}
        />
        
        <div className="input-buttons">
          <button 
            type="button"
            className="directive-button"
            onClick={toggleDirectiveDropdown}
          >
            @ Directives
          </button>
          
          <button 
            type="submit" 
            disabled={!inputText.trim() || isLoading}
            className={!inputText.trim() || isLoading ? 'disabled' : ''}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
        
        {showDirectives && (
          <div className="directive-dropdown" ref={directiveRef}>
            {directivesLoading ? (
              <div className="directive-loading">Loading directives...</div>
            ) : directivesError ? (
              <div className="directive-error">Error loading directives: {directivesError}</div>
            ) : directives.length === 0 ? (
              <div className="directive-empty">No directives available</div>
            ) : (
              directives.map((directive) => (
                <div 
                  key={directive.id}
                  className="directive-item"
                  onClick={() => insertDirective(directive.name)}
                >
                  <div className="directive-icon-name">
                    <span className="directive-icon">
                      <IconComponent iconName={directive.icon} />
                    </span>
                    <span className="directive-name">@{directive.name}</span>
                  </div>
                  <span className="directive-description">{directive.description}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </form>
  );
};

export default InputArea;