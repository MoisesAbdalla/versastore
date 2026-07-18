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
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';

// Utilitários de desenvolvimento (specs/003, T029a/T038) — só em dev, logado
// como admin, no console do navegador:
//   await backfillProducts()      migração one-time de produtos legados
//   await seedOrders({ count })   pedidos de exemplo p/ quickstart §4-7
//   await backfillVariations()    migração p/ variações por atributo (008)
if (import.meta.env.DEV) {
  import('./dev/backfillProducts').then((module) => {
    window.backfillProducts = module.backfillProducts;
  });
  import('./dev/seedOrders').then((module) => {
    window.seedOrders = module.seedOrders;
  });
  import('./dev/backfillOrders').then((module) => {
    window.backfillOrders = module.backfillOrders;
  });
  import('./dev/backfillSearchKeywords').then((module) => {
    window.backfillSearchKeywords = module.backfillSearchKeywords;
  });
  import('./dev/backfillVariations').then((module) => {
    window.backfillVariations = module.backfillVariations;
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>

      <AuthProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <FeedbackProvider>
            <CartProvider>
              <WishlistProvider>
                <App />
              </WishlistProvider>
            </CartProvider>
          </FeedbackProvider>
        </ThemeProvider>
      </AuthProvider>


  </React.StrictMode>,
)