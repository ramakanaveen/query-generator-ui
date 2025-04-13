// src/App.jsx
import React from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import DirectiveProvider from './contexts/DirectiveContext';
import FeedbackProvider from './contexts/FeedbackContext';
import { useAuth } from './contexts/AuthContext';
function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Query generator</h1>
        </header>
        <main>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh' 
          }}>
            <p>Loading authentication...</p>
          </div>
        </main>
      </div>
    );
  } 
  return (
    <div className="App">
      <header className="App-header">
        <h1>Query Generator</h1>
      </header>
      <main>
        <DirectiveProvider>
          <FeedbackProvider>
            <ChatInterface />
          </FeedbackProvider>
        </DirectiveProvider>
      </main>
      <footer>
        <p>© 2025 Query Generator</p>
      </footer>
    </div>
  );
}

export default App;