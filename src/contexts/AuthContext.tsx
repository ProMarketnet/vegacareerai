import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateCredits: (credits: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app load
    const checkAuth = async () => {
      try {
        // For demo purposes, we'll use a mock user
        // In production, you'd check with your backend API
        const mockUser: User = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'demo@vegacareer.app',
          name: 'Demo User',
          credits: 150
        };
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setUser(mockUser);
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // In production, you'd call your backend API here
      const mockUser: User = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email,
        name: 'Demo User',
        credits: 150
      };
      
      setUser(mockUser);
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
  };

  const updateCredits = (credits: number) => {
    if (user) {
      setUser({ ...user, credits });
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signOut,
    updateCredits
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 