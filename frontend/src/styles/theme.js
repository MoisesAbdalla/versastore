import { createTheme } from "@mui/material/styles";

const theme = createTheme({
    palette: {
        primary: {
            main: "#0B0B0C"
        },
        secondary: {
            main: "#B08D57"
        },
        background: {
            default: "#FFFFFF"
        }
    },

    typography:{
    fontFamily: '"Inter", -apple-system, "Segoe UI", Roboto, sans-serif'
  }
 }
);

export default theme;