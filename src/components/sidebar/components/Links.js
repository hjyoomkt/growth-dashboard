/* eslint-disable */
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
// chakra imports
import { Box, Flex, HStack, Text, useColorModeValue } from "@chakra-ui/react";
import { useAuth } from "contexts/AuthContext";

export function SidebarLinks(props) {
  //   Chakra color mode
  let location = useLocation();
  let activeColor = useColorModeValue("gray.700", "white");
  let inactiveColor = useColorModeValue(
    "secondaryGray.600",
    "secondaryGray.600"
  );
  let activeIcon = useColorModeValue("brand.500", "white");
  let textColor = useColorModeValue("secondaryGray.500", "white");
  let brandColor = useColorModeValue("brand.500", "brand.400");

  const { routes } = props;
  const {
    role,
    organizationType,
    isMaster,
    canAccessSuperAdmin,
    canAccessBrandAdmin,
    canAccessOrganization
  } = useAuth();

  // 디버그 로그
  console.log('[Sidebar Links] 권한 정보:', {
    role,
    organizationType,
    isMaster: isMaster?.(),
    canAccessSuperAdmin: canAccessSuperAdmin?.(),
    canAccessBrandAdmin: canAccessBrandAdmin?.()
  });

  // ✅ 권한 체크 함수 (2026-01-03 수정)
  const isAgency = organizationType === 'agency';
  const isAdvertiser = organizationType === 'advertiser';

  // verifies if routeName is the one active (in browser input)
  const activeRoute = (routeName, layout) => {
    // 정확한 layout + path 조합으로 체크
    return window.location.pathname === layout + routeName;
  };

  // Master일 때 메뉴 이름 변경 함수
  const getDisplayName = (route) => {
    if (isMaster() && route.name === 'Admin') {
      if (route.layout === '/superadmin') {
        return 'Super Admin';
      } else if (route.layout === '/brandadmin') {
        return 'Brand Admin';
      }
    }
    return route.name;
  };

  // this function creates the links from the secondary accordions (for example auth -> sign-in -> default)
  const createLinks = (routes) => {
    return routes.map((route, index) => {
      // 숨김 메뉴 체크
      if (route.hidden) {
        return null;
      }

      // ✅ 조직관리 전용 (마스터만)
      if (route.masterOnly && !isMaster()) {
        return null;
      }

      // ✅ 광고주 관리 전용 (마스터, agency_admin만)
      if (route.agencyAdminOnly && !(isMaster() || role === 'agency_admin')) {
        return null;
      }

      // ✅ 슈퍼어드민 레이아웃 (마스터, 에이전시 대표/관리자)
      if (route.layout === '/superadmin' && !canAccessSuperAdmin()) {
        return null;
      }

      // ✅ 브랜드어드민 레이아웃 (브랜드 대표/부운영자, 에이전시, 마스터)
      if (route.layout === '/brandadmin' && !canAccessBrandAdmin()) {
        return null;
      }

      // /admin 경로에 있을 때는 "브랜드 관리" 메뉴만 숨김
      if (route.name === '브랜드 관리' && location.pathname.startsWith('/admin')) {
        return null;
      }

      // ✅ 레거시 권한 체크 (하위 호환성)
      if (route.agencyOnly && !isAgency && !isMaster()) {
        return null;
      }

      if (route.advertiserOnly && !isAdvertiser && !isMaster()) {
        return null;
      }

      if (route.category) {
        return (
          <>
            <Text
              fontSize={"md"}
              color={activeColor}
              fontWeight='bold'
              mx='auto'
              ps={{
                sm: "10px",
                xl: "16px",
              }}
              pt='18px'
              pb='12px'
              key={index}>
              {getDisplayName(route)}
            </Text>
            {createLinks(route.items)}
          </>
        );
      } else if (
        route.layout === "/admin" ||
        route.layout === "/auth" ||
        route.layout === "/rtl" ||
        route.layout === "/superadmin" ||
        route.layout === "/brandadmin"
      ) {
        return (
          <NavLink key={index} to={route.layout + route.path}>
            {route.icon ? (
              <Box>
                <HStack
                  spacing={
                    activeRoute(route.path.toLowerCase(), route.layout) ? "22px" : "26px"
                  }
                  py='5px'
                  ps='10px'>
                  <Flex w='100%' alignItems='center' justifyContent='center'>
                    <Box
                      color={
                        activeRoute(route.path.toLowerCase(), route.layout)
                          ? activeIcon
                          : textColor
                      }
                      me='18px'>
                      {route.icon}
                    </Box>
                    <Text
                      me='auto'
                      color={
                        activeRoute(route.path.toLowerCase(), route.layout)
                          ? activeColor
                          : textColor
                      }
                      fontWeight={
                        activeRoute(route.path.toLowerCase(), route.layout)
                          ? "bold"
                          : "normal"
                      }>
                      {getDisplayName(route)}
                    </Text>
                  </Flex>
                  <Box
                    h='36px'
                    w='4px'
                    bg={
                      activeRoute(route.path.toLowerCase(), route.layout)
                        ? brandColor
                        : "transparent"
                    }
                    borderRadius='5px'
                  />
                </HStack>
              </Box>
            ) : (
              <Box>
                <HStack
                  spacing={
                    activeRoute(route.path.toLowerCase(), route.layout) ? "22px" : "26px"
                  }
                  py='5px'
                  ps='10px'>
                  <Text
                    me='auto'
                    color={
                      activeRoute(route.path.toLowerCase(), route.layout)
                        ? activeColor
                        : inactiveColor
                    }
                    fontWeight={
                      activeRoute(route.path.toLowerCase(), route.layout) ? "bold" : "normal"
                    }>
                    {route.name}
                  </Text>
                  <Box h='36px' w='4px' bg='brand.400' borderRadius='5px' />
                </HStack>
              </Box>
            )}
          </NavLink>
        );
      }
    });
  };
  //  BRAND
  return createLinks(routes);
}

export default SidebarLinks;
