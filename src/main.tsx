import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/amiri/index.css';
import '@fontsource/amiri/700.css';
import '@fontsource/scheherazade-new/index.css';
import '@fontsource/scheherazade-new/700.css';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
