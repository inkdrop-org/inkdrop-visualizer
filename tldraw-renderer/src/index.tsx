import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import TLDWrapper from './TLDWrapper';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <TLDWrapper />
  </React.StrictMode>
);
