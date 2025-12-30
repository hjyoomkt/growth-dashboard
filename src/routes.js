import React from 'react';

import { Icon } from '@chakra-ui/react';
import {
  MdBarChart,
  MdPerson,
  MdHome,
  MdLock,
  MdOutlineShoppingCart,
  MdAdminPanelSettings,
  MdTrendingUp,
} from 'react-icons/md';

// Admin Imports
import MainDashboard from 'views/admin/default';
import NFTMarketplace from 'views/admin/marketplace';
import Profile from 'views/admin/profile';
import ProfileBackup from 'views/admin/profile-backup';
import DataTables from 'views/admin/dataTables';

// Auth Imports
import SignInCentered from 'views/auth/signIn';
import SignUp from 'views/auth/signUp';
import ForgotPassword from 'views/auth/forgotPassword';
import ResetPassword from 'views/auth/resetPassword';

// ROAS Analyzer - 독립 모듈
import { ROASAnalyzer } from 'modules/roas-analyzer';

const routes = [
  {
    name: 'Main Dashboard',
    layout: '/admin',
    path: '/default',
    icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
    component: <MainDashboard />,
  },
  {
    name: 'Data Tables',
    layout: '/admin',
    icon: <Icon as={MdBarChart} width="20px" height="20px" color="inherit" />,
    path: '/data-tables',
    component: <DataTables />,
  },
  {
    name: 'ROAS 분석',
    layout: '/admin',
    path: '/roas-analyzer',
    icon: <Icon as={MdTrendingUp} width="20px" height="20px" color="inherit" />,
    component: <ROASAnalyzer />,
  },
  {
    name: 'NFT Marketplace',
    layout: '/admin',
    path: '/nft-marketplace',
    icon: (
      <Icon
        as={MdOutlineShoppingCart}
        width="20px"
        height="20px"
        color="inherit"
      />
    ),
    component: <NFTMarketplace />,
    secondary: true,
  },
  {
    name: 'Profile',
    layout: '/admin',
    path: '/profile',
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
    component: <Profile />,
  },
  {
    name: 'Profile Backup',
    layout: '/admin',
    path: '/profile-backup',
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
    component: <ProfileBackup />,
    hidden: true, // 사이드바에서 숨김
  },
  {
    name: 'Admin',
    layout: '/superadmin',
    path: '/default',
    icon: <Icon as={MdAdminPanelSettings} width="20px" height="20px" color="inherit" />,
    adminOnly: true, // 대행사 관리자 접근 (agency 조직)
    agencyOnly: true, // 대행사만 접근 가능
  },
  {
    name: 'Admin',
    layout: '/brandadmin',
    path: '/default',
    icon: <Icon as={MdAdminPanelSettings} width="20px" height="20px" color="inherit" />,
    adminOnly: true, // 브랜드 관리자 접근 (advertiser 조직)
    advertiserOnly: true, // 브랜드만 접근 가능
  },
  {
    name: 'Sign In',
    layout: '/auth',
    path: '/sign-in',
    icon: <Icon as={MdLock} width="20px" height="20px" color="inherit" />,
    component: <SignInCentered />,
    hidden: true, // 사이드바에서 숨김
  },
  {
    name: 'Sign Up',
    layout: '/auth',
    path: '/sign-up',
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
    component: <SignUp />,
    hidden: true, // 사이드바에서 숨김
  },
  {
    name: 'Forgot Password',
    layout: '/auth',
    path: '/forgot-password',
    component: <ForgotPassword />,
    hidden: true, // 사이드바에서 숨김
  },
  {
    name: 'Reset Password',
    layout: '/auth',
    path: '/reset-password',
    component: <ResetPassword />,
    hidden: true, // 사이드바에서 숨김
  },
  // {
  //   name: 'RTL Admin',
  //   layout: '/rtl',
  //   path: '/rtl-default',
  //   icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
  //   component: <RTL />,
  // },
];

export default routes;
