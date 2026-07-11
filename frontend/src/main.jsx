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