import React from 'react';

import { Icon } from '@chakra-ui/react';
import {
  MdPeopleOutline,
  MdVpnKey,
  MdHome,
  MdDashboard,
  MdBusiness,
  MdAnnouncement,
} from 'react-icons/md';

// Client Admin Imports
import ClientAdminDashboard from 'views/clientadmin/default';
import UserManagement from 'views/admin/users';
import BrandManagement from 'views/clientadmin/brands';
import APIManagement from 'views/superadmin/api-management';
import Board from 'views/shared/board';

const clientAdminRoutes = [
  {
    name: 'Home',
    layout: '/admin',
    path: '/default',
    icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
    component: null,
    isExternal: true,
  },
  {
    name: 'Admin Dashboard',
    layout: '/brandadmin',
    path: '/default',
    icon: <Icon as={MdDashboard} width="20px" height="20px" color="inherit" />,
    component: <ClientAdminDashboard />,
  },
  {
    name: '팀원 관리',
    layout: '/brandadmin',
    path: '/users',
    icon: <Icon as={MdPeopleOutline} width="20px" height="20px" color="inherit" />,
    component: <UserManagement />,
  },
  {
    name: '브랜드 관리',
    layout: '/brandadmin',
    path: '/brands',
    icon: <Icon as={MdBusiness} width="20px" height="20px" color="inherit" />,
    component: <BrandManagement />,
  },
  {
    name: 'API 관리',
    layout: '/brandadmin',
    path: '/api-management',
    icon: <Icon as={MdVpnKey} width="20px" height="20px" color="inherit" />,
    component: <APIManagement />,
  },
  {
    name: '게시판',
    layout: '/brandadmin',
    path: '/board',
    icon: <Icon as={MdAnnouncement} width="20px" height="20px" color="inherit" />,
    component: <Board />,
  },
];

export default clientAdminRoutes;
