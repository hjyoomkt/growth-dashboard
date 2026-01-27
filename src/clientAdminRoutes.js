import React from 'react';

import { Icon } from '@chakra-ui/react';
import {
  MdPeopleOutline,
  MdVpnKey,
  MdHome,
  MdDashboard,
  MdBusiness,
  MdAnnouncement,
  MdHistory,
} from 'react-icons/md';

// Client Admin Imports
import ClientAdminDashboard from 'views/clientadmin/default';
import UserManagement from 'views/admin/users';
import BrandManagement from 'views/clientadmin/brands';
import APIManagement from 'views/superadmin/api-management';
import Board from 'views/shared/board';
import ChangelogManagement from 'views/brandadmin/changelog';

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
    masterOnly: true, // 마스터만 접근 가능
  },
  {
    name: '게시판',
    layout: '/brandadmin',
    path: '/board',
    icon: <Icon as={MdAnnouncement} width="20px" height="20px" color="inherit" />,
    component: <Board />,
  },
  {
    name: '변경 이력',
    layout: '/brandadmin',
    path: '/changelog',
    icon: <Icon as={MdHistory} width="20px" height="20px" color="inherit" />,
    component: <ChangelogManagement />,
  },
];

export default clientAdminRoutes;
