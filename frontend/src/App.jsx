import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import IntroPage from './pages/IntroPage';
import LoginPage from './pages/LoginPage';
import LanguagePage from './pages/LanguagePage';
import HomePage from './pages/HomePage';
import PhotoProtectionPage from './pages/PhotoProtectionPage';
import ImageInvestigationPage from './pages/ImageInvestigationPage';
import CommentSafetyPage from './pages/CommentSafetyPage';
import EvidenceVaultPage from './pages/EvidenceVaultPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Public Gateway Routes */}
      <Route path="/intro" element={<IntroPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Creator Workspace Routes */}
      <Route
        path="/language"
        element={
          <ProtectedRoute>
            <LanguagePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/photo-protection"
        element={
          <ProtectedRoute>
            <PhotoProtectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/image-investigation"
        element={
          <ProtectedRoute>
            <ImageInvestigationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/comment-safety"
        element={
          <ProtectedRoute>
            <CommentSafetyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/evidence-vault"
        element={
          <ProtectedRoute>
            <EvidenceVaultPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback Catch-all Route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
