import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './assets/css/App.css';

import App from './App';

// 프로덕션 환경에서 모든 console 비활성화 (개발할 때만 보임)
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.debug = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
}

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
