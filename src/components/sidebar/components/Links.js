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
  const { role, organizationType, isMaster } = useAuth();

  // 권한 체크 함수들
  // const isMaster = role === 'master'; // useAuth에서 가져옴
  // 조직 레벨 관리자만 (advertiser_admin 제외)
  const isOrgAdmin = ['master', 'org_admin', 'org_manager', 'org_staff'].includes(role);
  // 모든 관리자 (advertiser_admin 포함, org_staff는 제외 - 슈퍼 어드민 접근 불가)
  const isAdmin = ['master', 'org_admin', 'org_manager', 'advertiser_admin', 'manager'].includes(role);
  const isSuperAdmin = ['master', 'org_admin', 'org_manager', 'advertiser_admin', 'manager'].includes(role);
  // 조직 타입 체크
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

      // Master 전용 메뉴 권한 체크 (조직 관리 등)
      if (route.masterOnly && !isMaster()) {
        return null;
      }

      // 조직 레벨 관리자 전용 메뉴 권한 체크 (팀원 관리 등)
      if (route.orgAdminOnly && !isOrgAdmin) {
        return null;
      }

      // Admin 전용 메뉴 권한 체크 (API 관리, 권한 관리 등)
      if (route.adminOnly && !isAdmin) {
        return null;
      }

      // 최고 관리자 전용 메뉴 권한 체크
      if (route.superAdminOnly && !isSuperAdmin) {
        return null;
      }

      // 대행사 전용 메뉴 권한 체크 (마스터는 제외)
      if (route.agencyOnly && !isAgency && !isMaster()) {
        return null;
      }

      // 클라이언트 전용 메뉴 권한 체크 (마스터는 제외)
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
