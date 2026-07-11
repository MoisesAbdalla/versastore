import { createContext, useCallback, useContext, useState } from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

const FeedbackContext = createContext({});

export function FeedbackProvider({ children }) {
  const [toast, setToast] = useState(null);

  const toastSuccess = useCallback((message) => {
    setToast({ severity: "success", message });
  }, []);

  const toastError = useCallback((message) => {
    setToast({ severity: "error", message });
  }, []);

  function handleClose(event, reason) {
    if (reason === "clickaway") {
      return;
    }

    setToast(null);
  }

  return (
    <FeedbackContext.Provider value={{ toastSuccess, toastError }}>
      {children}

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {toast ? (
          <Alert
            onClose={handleClose}
            severity={toast.severity}
            variant="filled"
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
