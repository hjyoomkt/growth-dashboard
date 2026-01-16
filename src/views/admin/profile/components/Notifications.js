// Chakra imports
import { Flex, Text, useColorModeValue, Box, Icon, Badge, Divider, useDisclosure, IconButton } from "@chakra-ui/react";
import Card from "components/card/Card.js";
// Custom components
import Menu from "components/menu/MainMenu";
import { useAuth } from "contexts/AuthContext";
import { MdOutlineError, MdCheckCircle, MdClose } from "react-icons/md";
import React, { useState, useEffect } from "react";
import ViewPostModal from "views/shared/board/components/ViewPostModal";
import { getBoardPosts, markPostAsRead } from "services/supabaseService";

export default function Notifications(props) {
  const { ...rest } = props;
  // Chakra Color Mode
  const textColorPrimary = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const notificationBg = useColorModeValue("red.50", "red.900");
  const notificationBorder = useColorModeValue("red.200", "red.700");
  const boardNotificationBg = useColorModeValue("purple.50", "purple.900");
  const boardNotificationBorder = useColorModeValue("purple.200", "purple.700");
  const listBorderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const listHoverBg = useColorModeValue("gray.50", "whiteAlpha.50");
  const { apiNotifications, markNotificationAsRead, removeNotification, user, currentAdvertiserId, role } = useAuth();

  // DB에서 실제 게시글 가져오기
  const [dbBoardPosts, setDbBoardPosts] = useState([]);
  // 상단 카드에서 제거된 알림 ID 추적 (로컬 스토리지에서 로드)
  const [dismissedCardIds, setDismissedCardIds] = useState(() => {
    try {
      const stored = localStorage.getItem('dismissedBoardNotifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  });

  useEffect(() => {
    const fetchBoardPosts = async () => {
      if (!user) return;

      try {
        // 브랜드 관리자 여부 확인
        const isBrandUser = ['advertiser_admin', 'manager', 'editor', 'viewer'].includes(role);

        // 브랜드 사용자는 'brand' 타입, 나머지는 'admin' 타입
        const boardType = isBrandUser ? 'brand' : 'admin';

        // 브랜드 사용자인 경우에만 currentAdvertiserId로 필터링
        const filterAdvertiserId = isBrandUser ? currentAdvertiserId : null;

        const posts = await getBoardPosts(boardType, user.id, filterAdvertiserId);
        // 모든 게시글 가져오기 (읽음/안읽음 상관없이)
        setDbBoardPosts(posts);
      } catch (error) {
        console.error('[Notifications] 게시글 조회 실패:', error);
      }
    };

    fetchBoardPosts();
  }, [user, currentAdvertiserId, role]);

  // API 알림 표시 (최대 3개, 상단 카드용)
  const recentApiNotifications = apiNotifications.slice(0, 3);

  // 게시판 알림: DB 게시글만 사용 (boardNotifications는 제외하여 중복 방지)
  // DB에서 가져온 게시글이 최신이고 정확하므로 이것만 사용
  const recentBoardNotifications = [...dbBoardPosts];

  // 상단 카드용: 읽지 않은 게시글 + dismissedCardIds에 없는 것만 표시
  const cardBoardNotifications = recentBoardNotifications
    .filter(n => !n.isRead && !dismissedCardIds.includes(n.id));

  // 게시글 모달 상태
  const { isOpen: isPostModalOpen, onOpen: onPostModalOpen, onClose: onPostModalClose } = useDisclosure();
  const [selectedPost, setSelectedPost] = useState(null);

  // 게시판 알림 클릭 핸들러
  const handleBoardNotificationClick = async (notification) => {
    console.log('Board notification clicked:', notification);

    // DB 게시글인 경우 (id, title, content 필드가 있음)
    if (notification.id && notification.title && notification.content) {
      setSelectedPost(notification);
      onPostModalOpen();

      // 읽지 않은 글인 경우 읽음 처리
      if (!notification.isRead && user) {
        try {
          await markPostAsRead(notification.id, user.id);
          // 로컬 상태 업데이트: 목록에서 제거하지 않고 isRead 상태만 변경
          setDbBoardPosts(prevPosts =>
            prevPosts.map(p => p.id === notification.id ? { ...p, isRead: true } : p)
          );
        } catch (error) {
          console.error('읽음 처리 실패:', error);
        }
      }
    } else {
      // 로컬 알림인 경우 (기존 방식)
      markNotificationAsRead(notification.id);
      const post = {
        id: notification.postId,
        title: notification.postTitle || notification.title || notification.message,
        content: notification.postContent || notification.content || notification.message,
        author: notification.author || 'Admin',
        date: notification.date || new Date(notification.timestamp).toLocaleDateString('ko-KR'),
        targets: notification.targets || ['모든 사용자'],
      };
      setSelectedPost(post);
      onPostModalOpen();
    }
  };

  // 알림 제거 핸들러 (상단 카드에서만 제거)
  const handleRemoveNotification = async (notification, event) => {
    event.stopPropagation(); // 클릭 이벤트 전파 방지

    // 상단 카드에서만 제거 (하단 목록은 유지)
    setDismissedCardIds(prev => {
      const newIds = [...prev, notification.id];
      // 로컬 스토리지에 저장
      localStorage.setItem('dismissedBoardNotifications', JSON.stringify(newIds));
      return newIds;
    });
  };

  return (
    <Card mb={{ base: "0px", "2xl": "20px" }} display="flex" flexDirection="column" {...rest}>
      <Flex align="center" w="100%" justify="space-between" mb="30px" p="20px" pb="0">
        <Text
          color={textColorPrimary}
          fontWeight="bold"
          fontSize="lg"
          mb="4px"
        >
          Notifications
        </Text>
        <Menu />
      </Flex>
      <Flex flex="1" overflowY="auto" direction="column" px="20px" pb="20px">

        {/* 게시판 알림 카드 (상단에 카드 형태, 최대 3개) */}
        {cardBoardNotifications.slice(0, 3).length > 0 && (
          <>
            <Box mb="20px">
              <Text fontSize="sm" fontWeight="600" color={textColorPrimary} mb="12px">
                게시판 알림
              </Text>
              {cardBoardNotifications.slice(0, 3).map((notification) => (
                <Box
                  key={notification.id}
                  p="12px"
                  mb="8px"
                  borderRadius="8px"
                  bg={boardNotificationBg}
                  border="1px solid"
                  borderColor={boardNotificationBorder}
                  position="relative"
                >
                  <Flex align="center" mb="4px">
                    <Icon
                      as={MdCheckCircle}
                      color="purple.500"
                      w="16px"
                      h="16px"
                      mr="8px"
                    />
                    <Text
                      fontSize="sm"
                      fontWeight="600"
                      color={textColorPrimary}
                      cursor="pointer"
                      onClick={() => handleBoardNotificationClick(notification)}
                      flex="1"
                      _hover={{ textDecoration: 'underline' }}
                    >
                      {notification.title || notification.postTitle || notification.message}
                    </Text>
                    <IconButton
                      icon={<Icon as={MdClose} />}
                      size="xs"
                      variant="ghost"
                      colorScheme="purple"
                      onClick={(e) => handleRemoveNotification(notification, e)}
                      aria-label="Remove notification"
                      ml="8px"
                    />
                  </Flex>
                  <Text fontSize="xs" color={textColorSecondary} ml="24px">
                    {notification.message}
                  </Text>
                </Box>
              ))}
            </Box>
            <Divider mb="20px" />
          </>
        )}

        {/* API 오류 알림 표시 (상단에 카드 형태) */}
        {recentApiNotifications.length > 0 && (
          <>
            <Box mb="20px">
              <Text fontSize="sm" fontWeight="600" color={textColorPrimary} mb="12px">
                API 알림
              </Text>
              {recentApiNotifications.map((notification) => (
                <Box
                  key={notification.id}
                  p="12px"
                  mb="8px"
                  borderRadius="8px"
                  bg={notificationBg}
                  border="1px solid"
                  borderColor={notificationBorder}
                  position="relative"
                >
                  <Flex align="center" mb="4px">
                    <Icon
                      as={notification.type === 'error' ? MdOutlineError : MdCheckCircle}
                      color={notification.type === 'error' ? 'red.500' : 'green.500'}
                      w="16px"
                      h="16px"
                      mr="8px"
                    />
                    <Text fontSize="sm" fontWeight="600" color={textColorPrimary} flex="1">
                      {notification.title}
                    </Text>
                    <IconButton
                      icon={<Icon as={MdClose} />}
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => removeNotification(notification.id)}
                      aria-label="Remove notification"
                      ml="8px"
                    />
                  </Flex>
                  <Text fontSize="xs" color={textColorSecondary} ml="24px">
                    {notification.message}
                  </Text>
                </Box>
              ))}
            </Box>
            <Divider mb="20px" />
          </>
        )}

        {/* 게시판 알림 - 리스트 형태 (스크롤 가능) */}
        <Text fontSize="sm" fontWeight="600" color={textColorPrimary} mb="12px">
          게시판 알림 목록
        </Text>
        <Box maxH="400px" overflowY="auto">
          {recentBoardNotifications.length > 0 ? (
            recentBoardNotifications.map((notification, index, array) => (
              <Box
                key={notification.id}
                py="12px"
                px="8px"
                borderBottom={index < array.length - 1 ? "1px solid" : "none"}
                borderColor={listBorderColor}
                cursor="pointer"
                onClick={() => handleBoardNotificationClick(notification)}
                _hover={{ bg: listHoverBg }}
                transition="background 0.2s"
              >
                <Flex align="center" justify="space-between">
                  <Flex align="center" flex="1">
                    <Icon
                      as={MdCheckCircle}
                      color="purple.500"
                      w="16px"
                      h="16px"
                      mr="8px"
                    />
                    <Text fontSize="sm" color={textColorPrimary} fontWeight={!notification.read ? "600" : "400"}>
                      {notification.postTitle || notification.title || notification.message}
                    </Text>
                  </Flex>
                  {!notification.read && (
                    <Badge colorScheme="purple" fontSize="xs" ml="8px">
                      New
                    </Badge>
                  )}
                </Flex>
              </Box>
            ))
          ) : (
            <Box py="20px" textAlign="center">
              <Text fontSize="sm" color={textColorSecondary}>
                게시판 알림이 없습니다
              </Text>
            </Box>
          )}
        </Box>
      </Flex>

      {/* 게시글 모달 */}
      <ViewPostModal isOpen={isPostModalOpen} onClose={onPostModalClose} post={selectedPost} />
    </Card>
  );
}
