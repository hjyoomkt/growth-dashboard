import React from 'react';

import { Icon } from '@chakra-ui/react';
import {
  MdPeople,
  MdSecurity,
  MdHome,
  MdVpnKey,
  MdDashboard,
  MdBusiness,
  MdAnnouncement,
  MdStorefront,
} from 'react-icons/md';

// Superadmin Imports
import SuperAdminDashboard from 'views/superadmin/default';
import UserManagement from 'views/superadmin/users';
import PermissionManagement from 'views/superadmin/permissions';
import APIManagement from 'views/superadmin/api-management';
import OrganizationManagement from 'views/superadmin/organizations';
import AdvertisersManagement from 'views/superadmin/advertisers';
import BrandsManagement from 'views/clientadmin/brands';
import Board from 'views/shared/board';

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
    name: '조직 관리',
    layout: '/superadmin',
    path: '/organizations',
    icon: <Icon as={MdBusiness} width="20px" height="20px" color="inherit" />,
    component: <OrganizationManagement />,
    masterOnly: true, // Master 권한만 접근 가능
  },
  {
    name: '광고주 관리',
    layout: '/superadmin',
    path: '/advertisers',
    icon: <Icon as={MdBusiness} width="20px" height="20px" color="inherit" />,
    component: <AdvertisersManagement />,
    agencyAdminOnly: true, // agency_admin과 master만 접근 가능
  },
  {
    name: '브랜드 관리',
    layout: '/superadmin',
    path: '/brands',
    icon: <Icon as={MdStorefront} width="20px" height="20px" color="inherit" />,
    component: <BrandsManagement />,
  },
  {
    name: '권한 관리',
    layout: '/superadmin',
    path: '/users',
    icon: <Icon as={MdPeople} width="20px" height="20px" color="inherit" />,
    component: <UserManagement />,
    orgAdminOnly: true, // 조직 레벨 관리자만 접근 (advertiser_admin 제외)
  },
  {
    name: '권한 관리 (구버전)',
    layout: '/superadmin',
    path: '/permissions',
    icon: <Icon as={MdSecurity} width="20px" height="20px" color="inherit" />,
    component: <PermissionManagement />,
    hidden: true, // 메뉴에서 숨김
  },
  {
    name: 'API 관리',
    layout: '/superadmin',
    path: '/api-management',
    icon: <Icon as={MdVpnKey} width="20px" height="20px" color="inherit" />,
    component: <APIManagement />,
  },
  {
    name: '게시판',
    layout: '/superadmin',
    path: '/board',
    icon: <Icon as={MdAnnouncement} width="20px" height="20px" color="inherit" />,
    component: <Board />,
  },
];

export default superadminRoutes;
