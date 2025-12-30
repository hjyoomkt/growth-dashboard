import React, { useState } from 'react';
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
} from '@chakra-ui/react';
import { MdAdd, MdVisibility } from 'react-icons/md';
import Card from 'components/card/Card.js';
import { useAuth } from 'contexts/AuthContext';
import CreatePostModal from './components/CreatePostModal';
import ViewPostModal from './components/ViewPostModal';

export default function Board() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const { role } = useAuth();

  // 현재 경로로 게시판 타입 판단 (브랜드 어드민 vs 슈퍼 어드민)
  const isBrandBoard = window.location.pathname.includes('/brandadmin/');

  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isViewOpen, onOpen: onViewOpen, onClose: onViewClose } = useDisclosure();
  const [selectedPost, setSelectedPost] = useState(null);

  // TODO: Supabase 연동 시 실제 데이터로 교체
  const [posts, setPosts] = useState([
    {
      id: 1,
      title: '2024년 12월 업데이트 안내',
      author: 'Admin',
      date: '2024-12-01',
      targets: ['모든 사용자'],
      isRead: false,
      content: '12월 업데이트 내용을 안내드립니다...',
    },
    {
      id: 2,
      title: 'API 키 갱신 안내',
      author: 'Admin',
      date: '2024-11-28',
      targets: ['대행사 소속'],
      isRead: true,
      content: 'API 키 갱신 절차에 대해 안내드립니다...',
    },
  ]);

  // 게시글 추가 핸들러
  const handleAddPost = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  // 관리자 권한이 있는지 확인 (Master, org_admin, org_manager, advertiser_admin, manager)
  const canWrite = () => {
    return ['master', 'org_admin', 'org_manager', 'advertiser_admin', 'manager'].includes(role);
  };

  const handleViewPost = (post) => {
    setSelectedPost(post);
    onViewOpen();
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
                    <IconButton
                      icon={<Icon as={MdVisibility} />}
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewPost(post)}
                      aria-label="View post"
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
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
