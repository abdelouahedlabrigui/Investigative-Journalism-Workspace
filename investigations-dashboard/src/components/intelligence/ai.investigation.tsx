import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { AppBar, Toolbar, Typography, Container } from '@mui/material';
import InvestigationDashboard from './InvestigationDashboard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e', // Deep indigo
    },
    secondary: {
      main: '#00695c', // Teal
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
});

const AiTrendsInvestigation: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Investigative Journalism Tool
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <InvestigationDashboard />
      </Container>
    </ThemeProvider>
  );
};

export default AiTrendsInvestigation;