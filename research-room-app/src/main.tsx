import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './AuthContext';
import { FirebaseApp } from './FirebaseApp';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FirebaseApp />
    </AuthProvider>
  </StrictMode>
);
