import React from 'react'
import ReactDOM from 'react-dom/client'
import "./styles/variables.css";
import "./styles/globals.css";
import App from './App'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './styles/theme'
import { AuthProvider } from './contexts/AuthContext';
import { FeedbackProvider } from './contexts/FeedbackContext';

// Utilitário one-time de migração (specs/003, T029a) — só em desenvolvimento:
// logado como admin, rode `await backfillProducts()` no console do navegador.
if (import.meta.env.DEV) {
  import('./dev/backfillProducts').then((module) => {
    window.backfillProducts = module.backfillProducts;
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <FeedbackProvider>
            <App />
          </FeedbackProvider>
        </ThemeProvider>
      </AuthProvider>


  </React.StrictMode>,
)