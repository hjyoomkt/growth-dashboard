import React from 'react';

import { Icon } from '@chakra-ui/react';
import {
  MdPeople,
  MdSecurity,
  MdHome,
  MdVpnKey,
  MdDashboard,
} from 'react-icons/md';

// Superadmin Imports
import SuperAdminDashboard from 'views/superadmin/default';
import UserManagement from 'views/superadmin/users';
import PermissionManagement from 'views/superadmin/permissions';
import APIManagement from 'views/superadmin/api-management';

const superadminRoutes = [
  {
    name: 'Home',
    layout: '/admin',
    path: '/default',
    icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
    component: null, // 링크만 제공
    isExternal: true,
  },
  {
    name: 'Admin Dashboard',
    layout: '/superadmin',
    path: '/default',
    icon: <Icon as={MdDashboard} width="20px" height="20px" color="inherit" />,
    component: <SuperAdminDashboard />,
  },
  {
    name: '회원 관리',
    layout: '/superadmin',
    path: '/users',
    icon: <Icon as={MdPeople} width="20px" height="20px" color="inherit" />,
    component: <UserManagement />,
  },
  {
    name: '권한 관리',
    layout: '/superadmin',
    path: '/permissions',
    icon: <Icon as={MdSecurity} width="20px" height="20px" color="inherit" />,
    component: <PermissionManagement />,
  },
  {
    name: 'API 관리',
    layout: '/superadmin',
    path: '/api-management',
    icon: <Icon as={MdVpnKey} width="20px" height="20px" color="inherit" />,
    component: <APIManagement />,
    superAdminOnly: true, // 최고 관리자 전용
  },
];

export default superadminRoutes;
