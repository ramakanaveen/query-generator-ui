// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the context with a default value
const AuthContext = createContext({
  userId: null,
  isLoading: true,
  setUserId: () => {}
});

// Export the hook to use this context
export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [userId, setUserId] = useState(null); // Start with null
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  useEffect(() => {
    // Simulate OIDC authentication delay
    const initAuth = async () => {
      setIsLoading(true);
      try {
        // Simulate OIDC service delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // This is where you'd get the actual user ID from OIDC
        setUserId('naveen');
      } catch (error) {
        console.error('Auth error:', error);
        // Fallback to default if auth fails
        setUserId('naveen');
      } finally {
        setIsLoading(false);
      }
    };
    
    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create the context value object
  const contextValue = {
    userId,
    isLoading,
    setUserId
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Make sure to export the provider as default
export default AuthProvider;