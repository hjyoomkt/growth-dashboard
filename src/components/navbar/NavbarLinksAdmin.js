// Chakra Imports
import {
  Avatar,
  Badge,
  Button,
  Flex,
  Icon,
  Image,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  useColorMode,
  Box,
  useDisclosure,
} from '@chakra-ui/react';
// Custom Components
import { ItemContent } from 'components/menu/ItemContent';
import { SearchBar } from 'components/navbar/searchBar/SearchBar';
import { SidebarResponsive } from 'components/sidebar/Sidebar';
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// Assets
import navImage from 'assets/img/layout/Navbar.png';
import { MdNotificationsNone, MdInfoOutline, MdArrowDropDown } from 'react-icons/md';
import { IoMdMoon, IoMdSunny } from 'react-icons/io';
import { FaEthereum } from 'react-icons/fa';
import routes from 'routes';
import { useAuth } from 'contexts/AuthContext';
import ViewPostModal from 'views/shared/board/components/ViewPostModal';

export default function HeaderLinks(props) {
  const { secondary, routes: propsRoutes } = props;
  const activeRoutes = propsRoutes || routes; // props로 받은 routes가 있으면 사용, 없으면 기본 routes 사용
  const { colorMode, toggleColorMode } = useColorMode();
  const {
    availableAdvertisers,
    currentAdvertiserId,
    switchAdvertiser,
    allNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 URL이 /admin 레이아웃인지 확인
  const isAdminLayout = window.location.pathname.startsWith('/admin/');
  // Chakra Color Mode
  const navbarIcon = useColorModeValue('gray.400', 'white');
  let menuBg = useColorModeValue('white', 'navy.800');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textColorBrand = useColorModeValue('brand.700', 'brand.400');
  const ethColor = useColorModeValue('gray.700', 'white');
  const borderColor = useColorModeValue('#E6ECFA', 'rgba(135, 140, 189, 0.3)');
  const ethBg = useColorModeValue('secondaryGray.300', 'navy.900');
  const ethBox = useColorModeValue('white', 'navy.800');
  const shadow = useColorModeValue(
    '14px 17px 40px 4px rgba(112, 144, 176, 0.18)',
    '14px 17px 40px 4px rgba(112, 144, 176, 0.06)',
  );
  const borderButton = useColorModeValue('secondaryGray.500', 'whiteAlpha.200');
  const brandSelectorBg = useColorModeValue('white', 'navy.800');
  const brandSelectorHover = useColorModeValue('brand.100', 'brand.700');

  // 현재 선택된 브랜드 이름 찾기
  const currentBrandName = currentAdvertiserId
    ? availableAdvertisers.find(adv => adv.id === currentAdvertiserId)?.name
    : '전체 브랜드';

  // 읽지 않은 알림 개수
  const unreadNotificationsCount = allNotifications.filter(n => !n.read).length;

  // 브랜드 전환 핸들러 - URL 쿼리 파라미터 업데이트
  const handleBrandSwitch = (advertiserId) => {
    switchAdvertiser(advertiserId);

    // URL에 쿼리 파라미터 추가
    const searchParams = new URLSearchParams(location.search);
    if (advertiserId) {
      searchParams.set('brand', advertiserId);
    } else {
      searchParams.delete('brand');
    }

    // 현재 경로에 업데이트된 쿼리 파라미터 적용
    const newSearch = searchParams.toString();
    navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
  };

  // 게시글 모달 상태
  const { isOpen: isPostModalOpen, onOpen: onPostModalOpen, onClose: onPostModalClose } = useDisclosure();
  const [selectedPost, setSelectedPost] = useState(null);

  // 알림 클릭 핸들러
  const handleNotificationClick = (notification) => {
    markNotificationAsRead(notification.id);

    // 게시판 알림인 경우 모달 열기
    if (notification.type === 'board') {
      setSelectedPost({
        id: notification.postId,
        title: notification.postTitle || notification.message,
        content: notification.postContent || notification.message,
        author: 'Admin',
        date: new Date(notification.timestamp).toLocaleDateString('ko-KR'),
        targets: ['모든 사용자'],
      });
      onPostModalOpen();
    }
  };

  return (
    <>
    <Flex
      w={{ sm: '100%', md: 'auto' }}
      alignItems="center"
      flexDirection="row"
      bg={menuBg}
      flexWrap={secondary ? { base: 'wrap', md: 'nowrap' } : 'unset'}
      p="10px"
      borderRadius="30px"
      boxShadow={shadow}
    >
      <SearchBar
        mb={() => {
          if (secondary) {
            return { base: '10px', md: 'unset' };
          }
          return 'unset';
        }}
        me="10px"
        borderRadius="30px"
      />

      {/* 브랜드 선택 드롭다운 - /admin 레이아웃에서만 표시 */}
      {isAdminLayout && availableAdvertisers && availableAdvertisers.length > 0 && (
        <Menu>
          <MenuButton
            p="0px"
            me="10px"
            bg={brandSelectorBg}
            borderRadius="30px"
            _hover={{ bg: brandSelectorHover }}
            transition="all 0.2s"
          >
            <Flex
              align="center"
              px="12px"
              py="8px"
              gap="6px"
            >
              <Text
                fontSize="sm"
                fontWeight="600"
                color={textColor}
                whiteSpace="nowrap"
              >
                {currentBrandName}
              </Text>
              <Icon
                as={MdArrowDropDown}
                color={navbarIcon}
                w="20px"
                h="20px"
              />
            </Flex>
          </MenuButton>
          <MenuList
            boxShadow={shadow}
            p="12px"
            borderRadius="20px"
            bg={menuBg}
            border="none"
            mt="10px"
            minW="200px"
          >
            <MenuItem
              _hover={{ bg: brandSelectorHover }}
              borderRadius="8px"
              px="14px"
              mb="4px"
              onClick={() => handleBrandSwitch(null)}
              bg="transparent"
              transition="all 0.2s"
            >
              <Text fontSize="sm" fontWeight={!currentAdvertiserId ? '600' : '500'}>
                전체 브랜드
              </Text>
            </MenuItem>
            {availableAdvertisers.map((advertiser) => (
              <MenuItem
                key={advertiser.id}
                _hover={{ bg: brandSelectorHover }}
                borderRadius="8px"
                px="14px"
                mb="4px"
                onClick={() => handleBrandSwitch(advertiser.id)}
                bg="transparent"
                transition="all 0.2s"
              >
                <Text fontSize="sm" fontWeight={currentAdvertiserId === advertiser.id ? '600' : '500'}>
                  {advertiser.name}
                </Text>
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      )}

      <Flex
        bg={ethBg}
        display={secondary ? 'flex' : 'none'}
        borderRadius="30px"
        ms="auto"
        p="6px"
        align="center"
        me="6px"
      >
        <Flex
          align="center"
          justify="center"
          bg={ethBox}
          h="29px"
          w="29px"
          borderRadius="30px"
          me="7px"
        >
          <Icon color={ethColor} w="9px" h="14px" as={FaEthereum} />
        </Flex>
        <Text
          w="max-content"
          color={ethColor}
          fontSize="sm"
          fontWeight="700"
          me="6px"
        >
          1,924
          <Text as="span" display={{ base: 'none', md: 'unset' }}>
            {' '}
            ETH
          </Text>
        </Text>
      </Flex>
      <SidebarResponsive routes={activeRoutes} />
      <Menu>
        <MenuButton p="0px" position="relative">
          <Icon
            mt="6px"
            as={MdNotificationsNone}
            color={navbarIcon}
            w="18px"
            h="18px"
            me="10px"
          />
          {unreadNotificationsCount > 0 && (
            <Badge
              position="absolute"
              top="-2px"
              right="6px"
              colorScheme="red"
              borderRadius="full"
              fontSize="9px"
              minW="16px"
              h="16px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {unreadNotificationsCount}
            </Badge>
          )}
        </MenuButton>
        <MenuList
          boxShadow={shadow}
          p="20px"
          borderRadius="20px"
          bg={menuBg}
          border="none"
          mt="22px"
          me={{ base: '30px', md: 'unset' }}
          minW={{ base: 'unset', md: '400px', xl: '450px' }}
          maxW={{ base: '360px', md: 'unset' }}
          maxH="500px"
          overflowY="auto"
        >
          <Flex w="100%" mb="20px">
            <Text fontSize="md" fontWeight="600" color={textColor}>
              알림
            </Text>
            {unreadNotificationsCount > 0 && (
              <Text
                fontSize="sm"
                fontWeight="500"
                color={textColorBrand}
                ms="auto"
                cursor="pointer"
                onClick={markAllNotificationsAsRead}
              >
                모두 읽음 표시
              </Text>
            )}
          </Flex>
          <Flex flexDirection="column">
            {allNotifications.length === 0 ? (
              <Box textAlign="center" py="20px">
                <Text color="secondaryGray.600" fontSize="sm">
                  새로운 알림이 없습니다
                </Text>
              </Box>
            ) : (
              allNotifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  _hover={{ bg: 'secondaryGray.100' }}
                  _focus={{ bg: 'none' }}
                  px="12px"
                  py="10px"
                  borderRadius="8px"
                  mb="8px"
                  bg={notification.read ? 'transparent' : 'orange.50'}
                  onClick={() => handleNotificationClick(notification)}
                  cursor="pointer"
                >
                  <Flex direction="column" w="100%">
                    <Flex align="center" mb="4px">
                      <Icon
                        as={notification.type === 'error' ? MdInfoOutline : MdNotificationsNone}
                        color={notification.type === 'error' ? 'red.500' : notification.type === 'board' ? 'purple.500' : 'orange.500'}
                        w="16px"
                        h="16px"
                        mr="8px"
                      />
                      <Text fontSize="sm" fontWeight="600" color={textColor}>
                        {notification.title}
                      </Text>
                    </Flex>
                    <Text fontSize="xs" color="secondaryGray.600" ml="24px">
                      {notification.message}
                    </Text>
                    <Text fontSize="xs" color="secondaryGray.400" ml="24px" mt="4px">
                      {new Date(notification.timestamp).toLocaleString('ko-KR')}
                    </Text>
                  </Flex>
                </MenuItem>
              ))
            )}
          </Flex>
        </MenuList>
      </Menu>

      <Menu>
        <MenuButton p="0px">
          <Icon
            mt="6px"
            as={MdInfoOutline}
            color={navbarIcon}
            w="18px"
            h="18px"
            me="10px"
          />
        </MenuButton>
        <MenuList
          boxShadow={shadow}
          p="20px"
          me={{ base: '30px', md: 'unset' }}
          borderRadius="20px"
          bg={menuBg}
          border="none"
          mt="22px"
          minW={{ base: 'unset' }}
          maxW={{ base: '360px', md: 'unset' }}
        >
          <Image src={navImage} borderRadius="16px" mb="28px" />
          <Flex flexDirection="column">
            <Link w="100%" href="https://horizon-ui.com/pro">
              <Button w="100%" h="44px" mb="10px" variant="brand">
                Buy Horizon UI PRO
              </Button>
            </Link>
            <Link
              w="100%"
              href="https://horizon-ui.com/documentation/docs/introduction"
            >
              <Button
                w="100%"
                h="44px"
                mb="10px"
                border="1px solid"
                bg="transparent"
                borderColor={borderButton}
              >
                See Documentation
              </Button>
            </Link>
            <Link
              w="100%"
              href="https://github.com/horizon-ui/horizon-ui-chakra-ts"
            >
              <Button
                w="100%"
                h="44px"
                variant="no-hover"
                color={textColor}
                bg="transparent"
              >
                Try Horizon Free
              </Button>
            </Link>
          </Flex>
        </MenuList>
      </Menu>

      <Button
        variant="no-hover"
        bg="transparent"
        p="0px"
        minW="unset"
        minH="unset"
        h="18px"
        w="max-content"
        onClick={toggleColorMode}
      >
        <Icon
          me="10px"
          h="18px"
          w="18px"
          color={navbarIcon}
          as={colorMode === 'light' ? IoMdMoon : IoMdSunny}
        />
      </Button>
      <Menu>
        <MenuButton p="0px">
          <Avatar
            _hover={{ cursor: 'pointer' }}
            color="white"
            name="Adela Parkson"
            bg="#11047A"
            size="sm"
            w="40px"
            h="40px"
          />
        </MenuButton>
        <MenuList
          boxShadow={shadow}
          p="0px"
          mt="10px"
          borderRadius="20px"
          bg={menuBg}
          border="none"
        >
          <Flex w="100%" mb="0px">
            <Text
              ps="20px"
              pt="16px"
              pb="10px"
              w="100%"
              borderBottom="1px solid"
              borderColor={borderColor}
              fontSize="sm"
              fontWeight="700"
              color={textColor}
            >
              👋&nbsp; Hey, Adela
            </Text>
          </Flex>
          <Flex flexDirection="column" p="10px">
            <MenuItem
              _hover={{ bg: 'none' }}
              _focus={{ bg: 'none' }}
              borderRadius="8px"
              px="14px"
            >
              <Text fontSize="sm">Profile Settings</Text>
            </MenuItem>
            <MenuItem
              _hover={{ bg: 'none' }}
              _focus={{ bg: 'none' }}
              borderRadius="8px"
              px="14px"
            >
              <Text fontSize="sm">Newsletter Settings</Text>
            </MenuItem>
            <MenuItem
              _hover={{ bg: 'none' }}
              _focus={{ bg: 'none' }}
              color="red.400"
              borderRadius="8px"
              px="14px"
            >
              <Text fontSize="sm">Log out</Text>
            </MenuItem>
          </Flex>
        </MenuList>
      </Menu>
    </Flex>

    {/* 게시글 모달 */}
    <ViewPostModal isOpen={isPostModalOpen} onClose={onPostModalClose} post={selectedPost} />
    </>
  );
}

HeaderLinks.propTypes = {
  variant: PropTypes.string,
  fixed: PropTypes.bool,
  secondary: PropTypes.bool,
  onOpen: PropTypes.func,
};
