import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './assets/css/App.css';

import App from './App';

// 전역 에러 핸들러
window.onerror = function(message, source, lineno, colno, error) {
  console.error('전역 에러 발생:', {
    message: error?.message || message,
    stack: error?.stack,
    source,
    lineno,
    colno
  });
  return false;
};

// Promise rejection 핸들러
window.addEventListener('unhandledrejection', function(event) {
  console.error('처리되지 않은 Promise 거부:', {
    reason: event.reason?.message || event.reason,
    promise: event.promise
  });
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
