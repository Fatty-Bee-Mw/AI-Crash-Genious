import { useEffect, useState, useCallback } from 'react';
import { checkCodeExpiration, clearAccessData } from './codes';

export function useAccessValidation({ onExpire, checkInterval = 30000 }) {
  const [isValid, setIsValid] = useState(true);
  const [expiration, setExpiration] = useState(null);
  const [checking, setChecking] = useState(false);

  const validateAccess = useCallback(async () => {
    setChecking(true);
    try {
      // Allow full access for admins
      if (typeof window !== 'undefined') {
        const adminSess = localStorage.getItem('admin_session');
        if (adminSess === '1') {
          setIsValid(true);
          setExpiration(null);
          return;
        }
      }
      const result = checkCodeExpiration();
      setIsValid(!result.expired);
      setExpiration(result.expiresAt);
      
      if (result.expired) {
        // Clear access data when expired
        clearAccessData();
        
        // Call the onExpire callback if provided
        if (onExpire) {
          onExpire(result.reason);
        }
      }
    } catch (error) {
      console.error('Access validation error:', error);
      setIsValid(false);
      if (onExpire) {
        onExpire('Validation error');
      }
    } finally {
      setChecking(false);
    }
  }, [onExpire]);

  useEffect(() => {
    // Initial validation
    validateAccess();

    // Set up periodic validation
    const interval = setInterval(() => {
      validateAccess();
    }, checkInterval);

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
    };
  }, [validateAccess, checkInterval]);

  // Force validation function
  const forceValidate = useCallback(() => {
    return validateAccess();
  }, [validateAccess]);

  return {
    isValid,
    expiration,
    checking,
    validate: forceValidate,
  };
}

export function useAutoLogout({ onLogout, expirationTime }) {
  useEffect(() => {
    if (!expirationTime) return;

    const now = Date.now();
    const timeUntilExpiration = expirationTime - now;

    if (timeUntilExpiration <= 0) {
      // Already expired
      if (onLogout) {
        onLogout('Code expired');
      }
      return;
    }

    // Set timeout for automatic logout
    const timeout = setTimeout(() => {
      clearAccessData();
      if (onLogout) {
        onLogout('Code expired');
      }
    }, timeUntilExpiration);

    return () => {
      clearTimeout(timeout);
    };
  }, [onLogout, expirationTime]);
}