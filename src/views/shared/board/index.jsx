import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Flex,
  Icon,
  Text,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  IconButton,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdAdd, MdVisibility, MdDelete } from 'react-icons/md';
import Card from 'components/card/Card.js';
import { useAuth } from 'contexts/AuthContext';
import CreatePostModal from './components/CreatePostModal';
import ViewPostModal from './components/ViewPostModal';
import { getBoardPosts, markPostAsRead, deleteBoardPost, canDeletePost } from 'services/supabaseService';

export default function Board() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const { role, user, currentAdvertiserId, availableAdvertisers } = useAuth();
  const toast = useToast();

  // 현재 경로로 게시판 타입 판단 (브랜드 어드민 vs 슈퍼 어드민)
  const isBrandBoard = window.location.pathname.includes('/brandadmin/');
  const boardType = isBrandBoard ? 'brand' : 'admin';

  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const [selectedPost, setSelectedPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 게시글 목록 조회
  const fetchPosts = useCallback(async () => {
    if (!user) {
      console.log('[게시판] 사용자 정보가 없습니다.');
      return;
    }

    // 슈퍼어드민/에이전시는 모든 글을 봐야 하므로 advertiserId null
    // 브랜드 게시판인 경우에만 currentAdvertiserId 전달
    const filterAdvertiserId = isBrandBoard ? currentAdvertiserId : null;

    console.log('[게시판] 게시글 조회 시작:', {
      boardType,
      userId: user.id,
      currentAdvertiserId,
      filterAdvertiserId
    });

    setIsLoading(true);
    try {
      const data = await getBoardPosts(
        boardType,
        user.id,
        filterAdvertiserId,
        role,  // 사용자 역할 전달
        availableAdvertisers  // 접근 가능한 브랜드 전달
      );
      console.log('[게시판] 조회된 게시글:', data);
      setPosts(data);

      if (data.length === 0) {
        console.warn('[게시판] 게시글이 없습니다.');
      }
    } catch (error) {
      console.error('[게시판] 게시글 조회 실패:', error);
      console.error('[게시판] 에러 상세:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });

      // board_posts 테이블이 없는 경우 에러 무시
      if (error.message && !error.message.includes('board_posts')) {
        toast({
          title: '게시글 조회 실패',
          description: error.message || '알 수 없는 오류가 발생했습니다.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, boardType, currentAdvertiserId, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // 게시글 추가 핸들러
  const handleAddPost = () => {
    fetchPosts(); // 게시글 작성 후 목록 새로고침
  };

  // 관리자 권한이 있는지 확인
  const canWrite = () => {
    return ['master', 'agency_admin', 'agency_manager', 'advertiser_admin'].includes(role);
  };

  const handleViewPost = async (post) => {
    setSelectedPost(post);
    onViewOpen();

    // 읽지 않은 글인 경우 읽음 처리
    if (!post.isRead && user) {
      try {
        await markPostAsRead(post.id, user.id);
        // 로컬 상태 업데이트
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.id === post.id ? { ...p, isRead: true } : p
          )
        );
      } catch (error) {
        console.error('읽음 처리 실패:', error);
      }
    }
  };

  const handleDeletePost = async (post) => {
    console.log('[삭제 시도]', { postId: post.id, title: post.title });

    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) {
      console.log('[삭제 취소] 사용자가 취소함');
      return;
    }

    try {
      console.log('[삭제 실행] deleteBoardPost 호출:', post.id);
      await deleteBoardPost(post.id);
      console.log('[삭제 성공] 게시글 삭제 완료');
      toast({
        title: '게시글 삭제 완료',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchPosts();
    } catch (error) {
      console.error('게시글 삭제 실패:', error);
      toast({
        title: '게시글 삭제 실패',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Card>
        <Flex justify="space-between" align="center" mb="20px" p="20px" pb="0">
          <Box>
            <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%">
              게시판
            </Text>
            <Text color="secondaryGray.600" fontSize="sm" fontWeight="400" mt="4px">
              공지사항 및 알림을 확인하세요
            </Text>
          </Box>
          {canWrite() && (
            <Button
              leftIcon={<Icon as={MdAdd} width="20px" height="20px" />}
              variant="brand"
              onClick={onCreateOpen}
            >
              글 작성
            </Button>
          )}
        </Flex>

        <Box overflowX="auto" p="20px" pt="0">
          {isLoading ? (
            <Flex justify="center" align="center" py="40px">
              <Text color="secondaryGray.600" fontSize="sm">
                게시글을 불러오는 중...
              </Text>
            </Flex>
          ) : posts.length === 0 ? (
            <Flex justify="center" align="center" py="40px">
              <Text color="secondaryGray.600" fontSize="sm">
                등록된 게시글이 없습니다.
              </Text>
            </Flex>
          ) : (
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th borderColor={borderColor}>제목</Th>
                  <Th borderColor={borderColor}>작성자</Th>
                  <Th borderColor={borderColor}>대상</Th>
                  <Th borderColor={borderColor}>작성일</Th>
                  <Th borderColor={borderColor}>상태</Th>
                  <Th borderColor={borderColor}>작업</Th>
                </Tr>
              </Thead>
              <Tbody>
                {posts.map((post) => (
                  <Tr key={post.id}>
                    <Td borderColor={borderColor}>
                      <Text
                        color={textColor}
                        fontSize="sm"
                        fontWeight="600"
                        cursor="pointer"
                        onClick={() => handleViewPost(post)}
                        _hover={{ color: 'brand.500', textDecoration: 'underline' }}
                      >
                        {post.title}
                      </Text>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Text color="secondaryGray.600" fontSize="sm">
                        {post.author}
                      </Text>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Flex gap="4px" flexWrap="wrap">
                        {post.targets.map((target, idx) => (
                          <Badge key={idx} colorScheme="purple" fontSize="xs">
                            {target}
                          </Badge>
                        ))}
                      </Flex>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Text color="secondaryGray.600" fontSize="sm">
                        {post.date}
                      </Text>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Badge colorScheme={post.isRead ? 'gray' : 'orange'} fontSize="xs">
                        {post.isRead ? '읽음' : '읽지 않음'}
                      </Badge>
                    </Td>
                    <Td borderColor={borderColor}>
                      <Flex gap="8px">
                        <IconButton
                          icon={<Icon as={MdVisibility} />}
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewPost(post)}
                          aria-label="View post"
                        />
                        {(() => {
                          const canDelete = canDeletePost(role, post.authorRole, user?.id, post.createdBy);
                          console.log('[삭제 권한]', {
                            canDelete,
                            userRole: role,
                            authorRole: post.authorRole,
                            userId: user?.id,
                            authorId: post.createdBy,
                            postTitle: post.title
                          });
                          return canDelete;
                        })() && (
                          <IconButton
                            icon={<Icon as={MdDelete} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleDeletePost(post)}
                            aria-label="Delete post"
                          />
                        )}
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Box>
      </Card>

      {/* 글 작성 모달 */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={onCreateClose}
        onAddPost={handleAddPost}
        boardType={isBrandBoard ? 'brand' : 'admin'}
      />

      {/* 글 보기 모달 */}
      <ViewPostModal isOpen={isViewOpen} onClose={onViewClose} post={selectedPost} />
    </Box>
  );
}
