// src/App.jsx
import React from 'react';
import './App.css';
import ChatInterface from './components/ChatInterface';
import DirectiveProvider from './contexts/DirectiveContext';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>QConnect</h1>
      </header>
      <main>
        <DirectiveProvider>
          <ChatInterface />
        </DirectiveProvider>
      </main>
      <footer>
        <p>© 2025 Qconnect</p>
      </footer>
    </div>
  );
}

export default App;