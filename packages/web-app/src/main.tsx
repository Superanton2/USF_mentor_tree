import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Application } from './Application';
import { applyDesignTokensToDocument } from './design/tokens';
import './styles/fonts.css';
import './styles/application.css';

applyDesignTokensToDocument(document.documentElement);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root is missing from index.html');
createRoot(rootElement).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
