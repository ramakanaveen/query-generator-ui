// src/contexts/DirectiveContext.jsx
import React, { createContext, useContext, useState } from 'react';

const DirectiveContext = createContext();

export const useDirectives = () => useContext(DirectiveContext);

const DirectiveProvider = ({ children }) => {
  // Initial directives
  const [directives, setDirectives] = useState([
    { 
      id: 1, 
      name: 'SPOT', 
      description: 'Spot market trading data',
      icon: 'CircleDollarSign'  // Add icon name
    },
    { 
      id: 2, 
      name: 'STIRT', 
      description: 'Short-term interest rate trading data',
      icon: 'TrendingUp'  // Add icon name
    },
    { 
      id: 3, 
      name: 'TITAN', 
      description: 'Titan trading platform data',
      icon: 'BarChart'  // Add icon name
    },
    {
      id: 4,
      name: 'FX',
      description: 'Foreign exchange market data',
      icon: 'Repeat'  // Add icon name
    },
    {
      id: 5,
      name: 'BONDS',
      description: 'Bond market trading data',
      icon: 'Landmark'  // Add icon name
    }
  ]);

  // Function to add a new directive
  const addDirective = (name, description, icon = 'Hash') => {
    const newDirective = {
      id: Date.now(),
      name: name.toUpperCase(),
      description,
      icon,
    };
    setDirectives([...directives, newDirective]);
  };

  // Function to remove a directive
  const removeDirective = (id) => {
    setDirectives(directives.filter(directive => directive.id !== id));
  };

  return (
    <DirectiveContext.Provider value={{ directives, addDirective, removeDirective }}>
      {children}
    </DirectiveContext.Provider>
  );
};

export default DirectiveProvider;
