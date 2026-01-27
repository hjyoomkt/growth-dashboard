import {
  Box,
  Flex,
  Text,
  useColorModeValue,
  Input,
  Button,
  Icon,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from "@chakra-ui/react";
import Card from "components/card/Card";
import React, { useState, useEffect } from "react";
import { MdRefresh, MdFilterList, MdKeyboardArrowDown, MdChevronLeft, MdChevronRight } from "react-icons/md";
import ChangelogTable from "./components/ChangelogTable";
import { getChangelogs } from "services/supabaseService";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import 'assets/css/MiniCalendar.css';

export default function ChangelogManagement() {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const brandColor = useColorModeValue("brand.500", "white");
  const borderColor = useColorModeValue("secondaryGray.100", "whiteAlpha.100");
  const bgHover = useColorModeValue("secondaryGray.100", "whiteAlpha.100");
  const inputBg = useColorModeValue("white", "navy.700");
  const inputTextColor = useColorModeValue("secondaryGray.900", "white");

  const [changelogs, setChangelogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const [filters, setFilters] = useState({
    targetType: '',
    actionType: '',
    startDate: '',
    endDate: '',
    limit: 100,
    offset: 0,
  });

  const fetchChangelogs = async () => {
    setIsLoading(true);
    try {
      const result = await getChangelogs(filters);
      setChangelogs(result.changelogs);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('[ChangelogManagement] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChangelogs();
  }, [filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // 필터 변경 시 첫 페이지로
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      targetType: '',
      actionType: '',
      startDate: '',
      endDate: '',
      limit: 100,
      offset: 0,
    });
  };

  const getTargetTypeLabel = (targetType) => {
    switch (targetType) {
      case 'user': return '사용자';
      case 'token': return '토큰';
      case 'brand': return '브랜드';
      case 'access': return '액세스';
      case 'role': return '권한';
      default: return '대상 타입';
    }
  };

  const getActionTypeLabel = (actionType) => {
    switch (actionType) {
      case 'create': return '추가';
      case 'delete': return '삭제';
      case 'update': return '변경';
      case 'invite': return '초대';
      default: return '작업 타입';
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex justify="space-between" align="center" mb="20px" px="25px">
        <Box>
          <Text
            color={textColor}
            fontSize="2xl"
            fontWeight="700"
            lineHeight="100%"
            mb="10px"
          >
            변경 이력 관리
          </Text>
          <Text color="secondaryGray.600" fontSize="md" fontWeight="400">
            최근 5일간의 관리자 작업 이력을 확인할 수 있습니다.
          </Text>
        </Box>

        <Button
          leftIcon={<Icon as={MdRefresh} />}
          colorScheme="brand"
          variant="outline"
          onClick={fetchChangelogs}
        >
          새로고침
        </Button>
      </Flex>

      {/* 필터 영역 */}
      <Card p="20px" mb="20px">
        <Flex align="center" gap="12px" flexWrap="wrap">
          <Icon as={MdFilterList} w="18px" h="18px" color={brandColor} />

          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<MdKeyboardArrowDown />}
              bg={inputBg}
              border="1px solid"
              borderColor={borderColor}
              color={textColor}
              fontWeight="500"
              fontSize="sm"
              _hover={{ bg: bgHover }}
              _active={{ bg: bgHover }}
              px="16px"
              h="36px"
              borderRadius="12px"
            >
              {filters.targetType ? getTargetTypeLabel(filters.targetType) : '대상 타입'}
            </MenuButton>
            <MenuList minW="auto" w="fit-content" px="8px" py="8px">
              <MenuItem
                onClick={() => handleFilterChange('targetType', '')}
                bg={!filters.targetType ? brandColor : 'transparent'}
                color={!filters.targetType ? 'white' : textColor}
                _hover={{ bg: !filters.targetType ? brandColor : bgHover }}
                fontWeight={!filters.targetType ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                전체
              </MenuItem>
              <MenuItem
                onClick={() => handleFilterChange('targetType', 'user')}
                bg={filters.targetType === 'user' ? brandColor : 'transparent'}
                color={filters.targetType === 'user' ? 'white' : textColor}
                _hover={{ bg: filters.targetType === 'user' ? brandColor : bgHover }}
                fontWeight={filters.targetType === 'user' ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                사용자
              </MenuItem>
              <MenuItem
                onClick={() => handleFilterChange('targetType', 'token')}
                bg={filters.targetType === 'token' ? brandColor : 'transparent'}
                color={filters.targetType === 'token' ? 'white' : textColor}
                _hover={{ bg: filters.targetType === 'token' ? brandColor : bgHover }}
                fontWeight={filters.targetType === 'token' ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                토큰
              </MenuItem>
              <MenuItem
                onClick={() => handleFilterChange('targetType', 'brand')}
                bg={filters.targetType === 'brand' ? brandColor : 'transparent'}
                color={filters.targetType === 'brand' ? 'white' : textColor}
                _hover={{ bg: filters.targetType === 'brand' ? brandColor : bgHover }}
                fontWeight={filters.targetType === 'brand' ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                브랜드
              </MenuItem>
              <MenuItem
                onClick={() => handleFilterChange('targetType', 'access')}
                bg={filters.targetType === 'access' ? brandColor : 'transparent'}
                color={filters.targetType === 'access' ? 'white' : textColor}
                _hover={{ bg: filters.targetType === 'access' ? brandColor : bgHover }}
                fontWeight={filters.targetType === 'access' ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                액세스
              </MenuItem>
              <MenuItem
                onClick={() => handleFilterChange('targetType', 'role')}
                bg={filters.targetType === 'role' ? brandColor : 'transparent'}
                color={filters.targetType === 'role' ? 'white' : textColor}
                _hover={{ bg: filters.targetType === 'role' ? brandColor : bgHover }}
                fontWeight={filters.targetType === 'role' ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                권한
              </MenuItem>
            </MenuList>
          </Menu>

          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<MdKeyboardArrowDown />}
              bg={inputBg}
              border="1px solid"
              borderColor={borderColor}
              color={textColor}
              fontWeight="500"
              fontSize="sm"
              _hover={{ bg: bgHover }}
              _active={{ bg: bgHover }}
              px="16px"
              h="36px"
              borderRadius="12px"
            >
              {filters.actionType ? getActionTypeLabel(filters.actionType) : '작업 타입'}
            </MenuButton>
            <MenuList minW="auto" w="fit-content" px="8px" py="8px">
              <MenuItem
                onClick={() => handleFilterChange('actionType', '')}
                bg={!filters.actionType ? brandColor : 'transparent'}
                color={!filters.actionType ? 'white' : textColor}
                _hover={{ bg: !filters.actionType ? brandColor : bgHover }}
                fontWeight={!filters.actionType ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                전체
              </MenuItem>
              <MenuItem
                onClick={() => handleFilterChange('actionType', 'create')}
                bg={filters.actionType === 'create' ? brandColor : 'transparent'}
                color={filters.actionType === 'create' ? 'white' : textColor}
                _hover={{ bg: filters.actionType === 'create' ? brandColor : bgHover }}
                fontWeight={filters.actionType === 'create' ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                추가
              </MenuItem>
              <MenuItem
                onClick={() => handleFilterChange('actionType', 'delete')}
                bg={filters.actionType === 'delete' ? brandColor : 'transparent'}
                color={filters.actionType === 'delete' ? 'white' : textColor}
                _hover={{ bg: filters.actionType === 'delete' ? brandColor : bgHover }}
                fontWeight={filters.actionType === 'delete' ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                삭제
              </MenuItem>
              <MenuItem
                onClick={() => handleFilterChange('actionType', 'update')}
                bg={filters.actionType === 'update' ? brandColor : 'transparent'}
                color={filters.actionType === 'update' ? 'white' : textColor}
                _hover={{ bg: filters.actionType === 'update' ? brandColor : bgHover }}
                fontWeight={filters.actionType === 'update' ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                변경
              </MenuItem>
              <MenuItem
                onClick={() => handleFilterChange('actionType', 'invite')}
                bg={filters.actionType === 'invite' ? brandColor : 'transparent'}
                color={filters.actionType === 'invite' ? 'white' : textColor}
                _hover={{ bg: filters.actionType === 'invite' ? brandColor : bgHover }}
                fontWeight={filters.actionType === 'invite' ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                초대
              </MenuItem>
            </MenuList>
          </Menu>

          <Popover isOpen={isStartOpen} onClose={() => setIsStartOpen(false)}>
            <PopoverTrigger>
              <Input
                value={filters.startDate}
                onClick={() => setIsStartOpen(true)}
                readOnly
                cursor="pointer"
                size="sm"
                w="130px"
                h="36px"
                bg={inputBg}
                color={inputTextColor}
                borderColor={borderColor}
                borderRadius="12px"
                textAlign="center"
                fontSize="sm"
                fontFamily="DM Sans"
                fontWeight="500"
                px="4px"
                placeholder="시작일"
                _focus={{ borderColor: brandColor }}
              />
            </PopoverTrigger>
            <PopoverContent w="290px">
              <PopoverBody p="15px">
                <Box transform="scale(0.85)" transformOrigin="top left" w="300px">
                  <Calendar
                    onChange={(date) => {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      handleFilterChange('startDate', `${year}-${month}-${day}`);
                      setIsStartOpen(false);
                    }}
                    value={filters.startDate ? new Date(filters.startDate) : new Date()}
                    view="month"
                    prevLabel={<Icon as={MdChevronLeft} w="24px" h="24px" mt="4px" />}
                    nextLabel={<Icon as={MdChevronRight} w="24px" h="24px" mt="4px" />}
                  />
                </Box>
              </PopoverBody>
            </PopoverContent>
          </Popover>

          <Text fontSize="sm" color={textColor}>
            ~
          </Text>

          <Popover isOpen={isEndOpen} onClose={() => setIsEndOpen(false)}>
            <PopoverTrigger>
              <Input
                value={filters.endDate}
                onClick={() => setIsEndOpen(true)}
                readOnly
                cursor="pointer"
                size="sm"
                w="130px"
                h="36px"
                bg={inputBg}
                color={inputTextColor}
                borderColor={borderColor}
                borderRadius="12px"
                textAlign="center"
                fontSize="sm"
                fontFamily="DM Sans"
                fontWeight="500"
                px="4px"
                placeholder="종료일"
                _focus={{ borderColor: brandColor }}
              />
            </PopoverTrigger>
            <PopoverContent w="290px">
              <PopoverBody p="15px">
                <Box transform="scale(0.85)" transformOrigin="top left" w="300px">
                  <Calendar
                    onChange={(date) => {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      handleFilterChange('endDate', `${year}-${month}-${day}`);
                      setIsEndOpen(false);
                    }}
                    value={filters.endDate ? new Date(filters.endDate) : new Date()}
                    view="month"
                    prevLabel={<Icon as={MdChevronLeft} w="24px" h="24px" mt="4px" />}
                    nextLabel={<Icon as={MdChevronRight} w="24px" h="24px" mt="4px" />}
                  />
                </Box>
              </PopoverBody>
            </PopoverContent>
          </Popover>

          <Button
            size="sm"
            variant="ghost"
            color="gray.500"
            onClick={handleResetFilters}
            h="36px"
            px="12px"
            fontSize="sm"
          >
            초기화
          </Button>
        </Flex>
      </Card>

      <ChangelogTable
        changelogs={changelogs}
        isLoading={isLoading}
        totalCount={totalCount}
        currentPage={Math.floor(filters.offset / filters.limit) + 1}
        pageSize={filters.limit}
        onPageChange={(newOffset) => handleFilterChange('offset', newOffset)}
        showBrandColumn={true}
      />
    </Box>
  );
}
