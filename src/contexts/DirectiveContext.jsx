// src/contexts/DirectiveContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import config from '../config';
// API endpoint constants
const API_ENDPOINT = config.apiUrl;

const DirectiveContext = createContext();

export const useDirectives = () => useContext(DirectiveContext);

const DirectiveProvider = ({ children }) => {
  // State for directives
  const [directives, setDirectives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Map directive names to appropriate icons
  const getIconForDirective = (directiveName) => {
    const iconMap = {
      'SPOT': 'TrendingUp',
      'STIRT': 'BarChart2',
      'TITAN': 'Activity',
      'FX': 'RefreshCw',
      'BONDS': 'Landmark',
      'DSP': 'LineChart'
    };
    
    return iconMap[directiveName] || 'Hash';
  };

  // Load directives from server
  useEffect(() => {
    const fetchDirectives = async () => {
      try {
        setIsLoading(true);
        
        // Fetch directives from server
        const response = await fetch(`${API_ENDPOINT}/directives`);
        
        if (response.ok) {
          const data = await response.json();
          
          // Add icon property to each directive
          const directivesWithIcons = data.directives.map(directive => ({
            ...directive,
            icon: getIconForDirective(directive.name)
          }));
          
          setDirectives(directivesWithIcons);
        } else {
          // If API fails, fall back to default directives
          console.warn('Failed to load directives from server, using defaults');
          setDirectives([
            { id: 1, name: 'SPOT', description: 'Spot market trading data', icon: 'TrendingUp' },
            { id: 2, name: 'STIRT', description: 'Short-term interest rate trading data', icon: 'BarChart2' },
            { id: 3, name: 'DSP', description: 'DSP strategy pricing and analytics', icon: 'LineChart' },
            { id: 4, name: 'FX', description: 'Foreign exchange market data', icon: 'RefreshCw' },
            { id: 5, name: 'BONDS', description: 'Bond market trading data', icon: 'Landmark' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching directives:', error);
        setError(error.message);
        
        // Fall back to default directives
        setDirectives([
          { id: 1, name: 'SPOT', description: 'Spot market trading data', icon: 'TrendingUp' },
          { id: 2, name: 'STIRT', description: 'Short-term interest rate trading data', icon: 'BarChart2' },
          { id: 3, name: 'DSP', description: 'DSP strategy pricing and analytics', icon: 'LineChart' },
          { id: 4, name: 'FX', description: 'Foreign exchange market data', icon: 'RefreshCw' },
          { id: 5, name: 'BONDS', description: 'Bond market trading data', icon: 'Landmark' }
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDirectives();
  }, []);

  // Function to add a new directive
  const addDirective = (name, description) => {
    const newDirective = {
      id: Date.now(),
      name: name.toUpperCase(),
      description,
      icon: getIconForDirective(name.toUpperCase())
    };
    setDirectives([...directives, newDirective]);
  };

  // Function to remove a directive
  const removeDirective = (id) => {
    setDirectives(directives.filter(directive => directive.id !== id));
  };

  return (
    <DirectiveContext.Provider value={{ 
      directives, 
      addDirective, 
      removeDirective,
      isLoading,
      error
    }}>
      {children}
    </DirectiveContext.Provider>
  );
};

export default DirectiveProvider;