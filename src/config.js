// src/config.js
const config = {
    // API Configuration
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
    apiPrefix: '/api/v1',
    
    // Get the full API URL
    get apiUrl() {
      return `${this.apiBaseUrl}${this.apiPrefix}`;
    },
    
    // WebSocket Configuration
    wsBaseUrl: process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:8000',
    wsPrefix: '/ws',
    
    // Get the full WebSocket URL
    get wsUrl() {
      return `${this.wsBaseUrl}${this.wsPrefix}`;
    },
    
    // Default settings
    defaultModel: 'gemini',
    defaultDbType: 'kdb',
    
    // Feature flags
    enableMockResponses: true,  // Fall back to mock responses if API fails
    enableDirectives: true,     // Enable directive suggestions
  };
  
  export default config;