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
import AccessLogsTable from "./components/AccessLogsTable";
import { getAccessLogs } from "services/supabaseService";
import { useAuth } from "contexts/AuthContext";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import 'assets/css/MiniCalendar.css';

export default function AccessLogsManagement() {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const brandColor = useColorModeValue("brand.500", "white");
  const borderColor = useColorModeValue("secondaryGray.100", "whiteAlpha.100");
  const bgHover = useColorModeValue("secondaryGray.100", "whiteAlpha.100");
  const inputBg = useColorModeValue("white", "navy.700");
  const inputTextColor = useColorModeValue("secondaryGray.900", "white");

  const { currentOrganizationId } = useAuth();

  const [accessLogs, setAccessLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  // 기본값: 최근 30일
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = `${thirtyDaysAgo.getFullYear()}-${String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(thirtyDaysAgo.getDate()).padStart(2, '0')}`;

  const [filters, setFilters] = useState({
    action: '',
    startDate: thirtyDaysAgoStr,
    endDate: todayStr,
    limit: 100,
    offset: 0,
  });

  const fetchAccessLogs = async () => {
    setIsLoading(true);
    try {
      console.log('[AccessLogsManagement] Fetching with filters:', filters);
      console.log('[AccessLogsManagement] currentOrganizationId:', currentOrganizationId);
      const result = await getAccessLogs(filters, currentOrganizationId);
      console.log('[AccessLogsManagement] Result:', result);
      setAccessLogs(result.accessLogs);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error('[AccessLogsManagement] Error:', error);
      console.error('[AccessLogsManagement] Error details:', error.message, error.stack);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessLogs();
  }, [filters, currentOrganizationId]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // 필터 변경 시 첫 페이지로
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      action: '',
      startDate: thirtyDaysAgoStr,
      endDate: todayStr,
      limit: 100,
      offset: 0,
    });
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'login': return '로그인';
      case 'logout': return '로그아웃';
      default: return '모든 동작';
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
            액세스 로그 관리
          </Text>
          <Text color="secondaryGray.600" fontSize="md" fontWeight="400">
            사용자 로그인/로그아웃 기록을 확인할 수 있습니다. (최근 30일)
          </Text>
        </Box>

        <Button
          leftIcon={<Icon as={MdRefresh} />}
          colorScheme="brand"
          variant="outline"
          onClick={fetchAccessLogs}
        >
          새로고침
        </Button>
      </Flex>

      {/* 필터 영역 */}
      <Card p="20px" mb="20px">
        <Flex align="center" gap="12px" flexWrap="wrap">
          <Icon as={MdFilterList} w="18px" h="18px" color={brandColor} />

          {/* 동작 타입 필터 */}
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
              {filters.action ? getActionLabel(filters.action) : '모든 동작'}
            </MenuButton>
            <MenuList minW="auto" w="fit-content" px="8px" py="8px">
              <MenuItem
                onClick={() => handleFilterChange('action', '')}
                bg={!filters.action ? brandColor : 'transparent'}
                color={!filters.action ? 'white' : textColor}
                _hover={{ bg: !filters.action ? brandColor : bgHover }}
                fontWeight={!filters.action ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                모든 동작
              </MenuItem>
              <MenuItem
                onClick={() => handleFilterChange('action', 'login')}
                bg={filters.action === 'login' ? brandColor : 'transparent'}
                color={filters.action === 'login' ? 'white' : textColor}
                _hover={{ bg: filters.action === 'login' ? brandColor : bgHover }}
                fontWeight={filters.action === 'login' ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                로그인
              </MenuItem>
              <MenuItem
                onClick={() => handleFilterChange('action', 'logout')}
                bg={filters.action === 'logout' ? brandColor : 'transparent'}
                color={filters.action === 'logout' ? 'white' : textColor}
                _hover={{ bg: filters.action === 'logout' ? brandColor : bgHover }}
                fontWeight={filters.action === 'logout' ? '600' : '500'}
                fontSize="sm"
                px="12px"
                py="8px"
                borderRadius="8px"
                justifyContent="center"
                textAlign="center"
                minH="auto"
              >
                로그아웃
              </MenuItem>
            </MenuList>
          </Menu>

          {/* 시작일 */}
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

          {/* 종료일 */}
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

      <AccessLogsTable
        accessLogs={accessLogs}
        isLoading={isLoading}
        totalCount={totalCount}
        currentPage={Math.floor(filters.offset / filters.limit) + 1}
        pageSize={filters.limit}
        onPageChange={(newOffset) => handleFilterChange('offset', newOffset)}
        showOrganizationColumn={true}
      />
    </Box>
  );
}
