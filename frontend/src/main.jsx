import { StrictMode } from 'react'; // Import StrictMode
import { createRoot } from 'react-dom/client'; // Import createRoot
import './index.css'; // Import your CSS
import App from './App.jsx'; // Import your App component

// Attach React to the root element in the HTML file
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

