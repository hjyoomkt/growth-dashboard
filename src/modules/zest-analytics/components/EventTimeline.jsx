/**
 * ============================================================================
 * EventTimeline - 실시간 이벤트 로그
 * ============================================================================
 *
 * ⚠️ 현재 사용 안 함 (2026-01-30)
 *
 * 이 컴포넌트는 실시간 이벤트 로그를 표시하는 용도로 개발되었으나,
 * 현재는 사용하지 않습니다. 필요 시 ZestAnalytics.jsx에서 import하여 사용 가능합니다.
 *
 * 사용 방법:
 * 1. ZestAnalytics.jsx에서 import EventTimeline from './components/EventTimeline';
 * 2. 새로운 Tab 추가하거나 기존 대시보드에 배치
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Flex,
  Badge,
  Text,
  Button,
  Select,
  Spinner,
} from '@chakra-ui/react';
import { MdRefresh } from 'react-icons/md';
import Card from 'components/card/Card';
import { getRecentEvents } from '../services/zaService';

export default function EventTimeline({ advertiserId, availableAdvertiserIds }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    fetchEvents();
    // 자동 새로고침 (30초마다)
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [advertiserId, limit]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await getRecentEvents(advertiserId, availableAdvertiserIds, limit);
      setEvents(data);
    } catch (error) {
      console.error('이벤트 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 이벤트 타입별 색상
  const getEventTypeBadgeColor = (eventType) => {
    switch (eventType) {
      case 'purchase':
        return 'green';
      case 'signup':
        return 'blue';
      case 'lead':
        return 'purple';
      case 'add_to_cart':
        return 'orange';
      case 'custom':
        return 'gray';
      case 'pageview':
        return 'cyan';
      default:
        return 'gray';
    }
  };

  // 이벤트 타입 한글 변환
  const getEventTypeLabel = (eventType) => {
    switch (eventType) {
      case 'purchase':
        return '구매';
      case 'signup':
        return '회원가입';
      case 'lead':
        return '리드';
      case 'add_to_cart':
        return '장바구니';
      case 'custom':
        return '커스텀';
      case 'pageview':
        return '페이지뷰';
      default:
        return eventType;
    }
  };

  // 필터링된 이벤트
  const filteredEvents =
    filterType === 'all' ? events : events.filter((e) => e.event_type === filterType);

  return (
    <Card>
      <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={2}>
        <Heading size="md">실시간 이벤트 로그</Heading>
        <Flex gap={2} align="center">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            size="sm"
            w="150px"
          >
            <option value="all">전체</option>
            <option value="purchase">구매</option>
            <option value="signup">회원가입</option>
            <option value="lead">리드</option>
            <option value="add_to_cart">장바구니</option>
            <option value="custom">커스텀</option>
            <option value="pageview">페이지뷰</option>
          </Select>
          <Select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            size="sm"
            w="100px"
          >
            <option value="25">25개</option>
            <option value="50">50개</option>
            <option value="100">100개</option>
          </Select>
          <Button
            size="sm"
            leftIcon={<MdRefresh />}
            onClick={fetchEvents}
            isLoading={loading}
          >
            새로고침
          </Button>
        </Flex>
      </Flex>

      {loading && events.length === 0 ? (
        <Flex justify="center" align="center" minH="200px">
          <Spinner size="xl" color="brand.500" />
        </Flex>
      ) : filteredEvents.length === 0 ? (
        <Text color="gray.500">이벤트가 없습니다.</Text>
      ) : (
        <Box overflowX="auto" maxH="600px" overflowY="auto">
          <Table variant="simple" size="sm">
            <Thead position="sticky" top={0} bg="white" zIndex={1}>
              <Tr>
                <Th>시간</Th>
                <Th>이벤트</Th>
                <Th>소스</Th>
                <Th>캠페인</Th>
                <Th isNumeric>금액</Th>
                <Th>어트리뷰션</Th>
                <Th>디바이스</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredEvents.map((event) => (
                <Tr key={event.id}>
                  <Td fontSize="xs" color="gray.600">
                    {new Date(event.created_at).toLocaleString('ko-KR', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={getEventTypeBadgeColor(event.event_type)}
                      fontSize="xs"
                    >
                      {getEventTypeLabel(event.event_type)}
                    </Badge>
                    {event.event_name && (
                      <Text fontSize="xs" color="gray.500" mt={1}>
                        {event.event_name}
                      </Text>
                    )}
                  </Td>
                  <Td>
                    <Text fontSize="xs">
                      {event.utm_source || <span style={{ color: 'gray' }}>-</span>}
                    </Text>
                  </Td>
                  <Td>
                    <Text fontSize="xs" maxW="150px" isTruncated>
                      {event.utm_campaign || <span style={{ color: 'gray' }}>-</span>}
                    </Text>
                  </Td>
                  <Td isNumeric>
                    {event.value ? (
                      <Text fontSize="sm" fontWeight="medium">
                        ₩{Number(event.value).toLocaleString()}
                      </Text>
                    ) : (
                      <Text fontSize="xs" color="gray.400">
                        -
                      </Text>
                    )}
                  </Td>
                  <Td>
                    {event.is_attributed ? (
                      <Flex direction="column" gap={1}>
                        <Badge colorScheme="green" fontSize="xs">
                          {event.attribution_window}일
                        </Badge>
                        <Text fontSize="xs" color="gray.500">
                          +{event.days_since_click}일
                        </Text>
                      </Flex>
                    ) : (
                      <Text fontSize="xs" color="gray.400">
                        -
                      </Text>
                    )}
                  </Td>
                  <Td>
                    <Text fontSize="xs" color="gray.600">
                      {event.device_type || '-'}
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Flex mt={3} justify="space-between" align="center">
        <Text fontSize="sm" color="gray.600">
          총 {filteredEvents.length}개 이벤트 표시
        </Text>
        <Text fontSize="xs" color="gray.500">
          자동 새로고침: 30초마다
        </Text>
      </Flex>
    </Card>
  );
}
