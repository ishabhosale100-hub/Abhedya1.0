import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const isLoggedIn = localStorage.getItem('abhedya_logged_in') === 'true';

  if (!isLoggedIn) {
    return <Navigate to="/intro" replace />;
  }

  return children;
}
