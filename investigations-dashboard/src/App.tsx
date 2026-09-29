
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import NavbarComponent from './components/navbar/NavbarComponent';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AiTrendsInvestigation from './components/intelligence/ai.investigation';
import InvestigationList from './components/intelligence/InvestigationList';
import Home from './components/Home';

const darkTheme = createTheme({
  palette: {
    mode: 'light',
  },
});

//  CRITICAL: Must be outside the App component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false, // Disabling retries stops the 4+ immediate attempts if an API fails
    },
  },
});

function App() {


  return (
    <div className="container-block" style={{ fontFamily: "'Cascadia Code', monospace" }}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <Router>
            <NavbarComponent />
            <Routes>
                <Route path='/' element={<Home />}/>
                <Route path='/ai-trends' element={<AiTrendsInvestigation />}/>
                <Route path='/trends' element={<InvestigationList />}/>
              </Routes>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
    </div>
  );
}

export default App;