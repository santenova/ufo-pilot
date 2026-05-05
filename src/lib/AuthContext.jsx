import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios'; // Import axios directly
import { appParams } from './app-params';


const prefix =  import.meta.env.VITE_APP_PREFIX;
const STORAGE_KEY = prefix + "_analysis_logs";
const AuthContext = createContext();

function isLocalMode() {
  try {
    const s = localStorage.getItem("aiorreal/_settings");
    return s ? JSON.parse(s).local_mode === true : false;
  } catch {
    return false;
  }
}

// Refactor createAxiosClient to a direct Axios implementation
function createAxiosClient({ baseURL, headers, token, interceptResponses }) {
  const instance = axios.create({
    baseURL: baseURL,
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (interceptResponses) {
    instance.interceptors.response.use(
      response => response,
      error => {
        return Promise.reject(error);
      }
    );
  }

  return instance;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(!isLocalMode());
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(!isLocalMode());
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    if (isLocalMode()) return; // skip all auth in local mode
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/custom`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const response = await appClient.get(`?q=${appParams.appId}`);
        setAppPublicSettings(response.data);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.response && appError.response.status === 403 && appError.response.data?.extra_data?.reason) {
          const reason = appError.response.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.response.message || appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.response ? appError.response.message : appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      // Replace apiClient.auth.me() with your direct Axios call to get user info
      const response = await axios.get('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${appParams.token}`
        }
      });
      setUser(response.data);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Replace apiClient.auth.logout(window.location.href) with your direct Axios call to logout
      axios.post('/api/auth/logout', {}, {
        headers: {
          'Authorization': `Bearer ${appParams.token}`
        }
      }).then(() => {
        window.location.href = '/'; // Redirect to login page or home page
      });
    } else {
      // Just remove the token without redirect
      axios.post('/api/auth/logout', {}, {
        headers: {
          'Authorization': `Bearer ${appParams.token}`
        }
      });
    }
  };

  const navigateToLogin = () => {
    // Replace apiClient.auth.redirectToLogin(window.location.href) with your direct navigation logic
    window.location.href = '/login'; // Redirect to login page
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
