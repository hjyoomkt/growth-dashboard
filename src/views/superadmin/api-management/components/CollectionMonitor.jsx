/* eslint-disable */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Flex,
  Icon,
  useColorModeValue,
  Spinner,
  Progress,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import { MdCheckCircle, MdError, MdSchedule, MdSync } from 'react-icons/md';
import { supabase } from 'config/supabase';

export default function CollectionMonitor() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');

  // 최근 작업 조회
  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('collection_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching collection jobs:', error);
      } else {
        setJobs(data || []);
      }
    } catch (error) {
      console.error('Exception fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();

    // 실시간 구독 설정
    const subscription = supabase
      .channel('collection_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'collection_jobs',
        },
        (payload) => {
          console.log('Collection job change:', payload);
          fetchJobs(); // 변경 발생 시 재조회
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 상태별 아이콘 및 색상
  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <Badge colorScheme="green" display="flex" alignItems="center" gap="1">
            <Icon as={MdCheckCircle} />
            완료
          </Badge>
        );
      case 'failed':
        return (
          <Badge colorScheme="red" display="flex" alignItems="center" gap="1">
            <Icon as={MdError} />
            실패
          </Badge>
        );
      case 'partial':
        return (
          <Badge colorScheme="orange" display="flex" alignItems="center" gap="1">
            <Icon as={MdError} />
            부분 실패
          </Badge>
        );
      case 'running':
        return (
          <Badge colorScheme="blue" display="flex" alignItems="center" gap="1">
            <Icon as={MdSync} />
            진행 중
          </Badge>
        );
      case 'pending':
        return (
          <Badge colorScheme="gray" display="flex" alignItems="center" gap="1">
            <Icon as={MdSchedule} />
            대기 중
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // 진행률 계산
  const getProgress = (job) => {
    if (job.chunks_total === 0) return 0;
    return Math.round((job.chunks_completed / job.chunks_total) * 100);
  };

  // 날짜 포맷
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Collection Type 라벨
  const getCollectionTypeLabel = (type) => {
    switch (type) {
      case 'ads':
        return '광고 데이터';
      case 'demographics':
        return '성별/연령대';
      case 'creatives':
        return '크리에이티브';
      case 'daily':
        return '일일 수집';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Card p="20px">
        <Flex justify="center" align="center" h="200px">
          <Spinner size="xl" />
        </Flex>
      </Card>
    );
  }

  return (
    <Card p="20px">
      <Text fontSize="xl" fontWeight="bold" color={textColor} mb="20px">
        데이터 수집 현황
      </Text>

      {jobs.length === 0 ? (
        <Text color="gray.500" textAlign="center" py="40px">
          수집 작업이 없습니다.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th borderColor={borderColor}>플랫폼</Th>
                <Th borderColor={borderColor}>유형</Th>
                <Th borderColor={borderColor}>모드</Th>
                <Th borderColor={borderColor}>수집 날짜/기간</Th>
                <Th borderColor={borderColor}>상태</Th>
                <Th borderColor={borderColor}>진행률</Th>
                <Th borderColor={borderColor}>시작 시간</Th>
                <Th borderColor={borderColor}>완료 시간</Th>
              </Tr>
            </Thead>
            <Tbody>
              {jobs.map((job) => (
                <Tr
                  key={job.id}
                  _hover={{ bg: bgHover }}
                  cursor="pointer"
                  title={job.error_message || ''}
                >
                  <Td borderColor={borderColor}>
                    <Text fontSize="sm" fontWeight="bold" color={textColor}>
                      {job.platform}
                    </Text>
                  </Td>
                  <Td borderColor={borderColor}>
                    <Text fontSize="sm" color={textColor}>
                      {getCollectionTypeLabel(job.collection_type)}
                    </Text>
                  </Td>
                  <Td borderColor={borderColor}>
                    <Badge colorScheme={job.mode === 'initial' ? 'purple' : 'cyan'}>
                      {job.mode === 'initial' ? '초기 수집' : '일일 수집'}
                    </Badge>
                  </Td>
                  <Td borderColor={borderColor}>
                    <Text fontSize="sm" color={textColor}>
                      {job.mode === 'daily'
                        ? job.collection_date || '-'
                        : `${job.start_date} ~ ${job.end_date}`}
                    </Text>
                  </Td>
                  <Td borderColor={borderColor}>{getStatusBadge(job.status)}</Td>
                  <Td borderColor={borderColor}>
                    <Box>
                      <Text fontSize="sm" color={textColor} mb="1">
                        {job.chunks_completed} / {job.chunks_total} 청크
                        {job.chunks_failed > 0 && (
                          <Text as="span" color="red.500" ml="2">
                            ({job.chunks_failed} 실패)
                          </Text>
                        )}
                      </Text>
                      <Progress
                        value={getProgress(job)}
                        size="sm"
                        colorScheme={
                          job.status === 'completed'
                            ? 'green'
                            : job.status === 'failed'
                            ? 'red'
                            : job.status === 'partial'
                            ? 'orange'
                            : 'blue'
                        }
                      />
                    </Box>
                  </Td>
                  <Td borderColor={borderColor}>
                    <Text fontSize="sm" color={textColor}>
                      {formatDate(job.started_at)}
                    </Text>
                  </Td>
                  <Td borderColor={borderColor}>
                    <Text fontSize="sm" color={textColor}>
                      {formatDate(job.completed_at)}
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Card>
  );
}
