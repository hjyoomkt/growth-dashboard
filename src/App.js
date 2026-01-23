import './assets/css/App.css';
import { Routes, Route } from 'react-router-dom';
import AuthLayout from './layouts/auth';
import AdminLayout from './layouts/admin';
import SuperAdminLayout from './layouts/superadmin';
import ClientAdminLayout from './layouts/clientadmin';
import MasterLayout from './layouts/master';
import RTLLayout from './layouts/rtl';
import Landing from './views/landing';
import {
  ChakraProvider,
  // extendTheme
} from '@chakra-ui/react';
import initialTheme from './theme/theme'; //  { themeGreen }
import { useState } from 'react';
import { DateRangeProvider } from './contexts/DateRangeContext';
import { AuthProvider } from './contexts/AuthContext';
import { HelmetProvider } from 'react-helmet-async';
// Chakra imports

export default function Main() {
  // eslint-disable-next-line
  const [currentTheme, setCurrentTheme] = useState(initialTheme);
  return (
    <HelmetProvider>
      <ChakraProvider theme={currentTheme}>
        <AuthProvider>
          <DateRangeProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/main" element={<Landing />} />
              <Route path="auth/*" element={<AuthLayout />} />
              <Route
                path="admin/*"
                element={
                  <AdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route
                path="superadmin/*"
                element={
                  <SuperAdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route
                path="brandadmin/*"
                element={
                  <ClientAdminLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route
                path="master/*"
                element={
                  <MasterLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
              <Route
                path="rtl/*"
                element={
                  <RTLLayout theme={currentTheme} setTheme={setCurrentTheme} />
                }
              />
            </Routes>
          </DateRangeProvider>
        </AuthProvider>
      </ChakraProvider>
    </HelmetProvider>
  );
}
