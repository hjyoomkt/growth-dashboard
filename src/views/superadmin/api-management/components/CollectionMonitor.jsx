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
  Button,
  HStack,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import { MdCheckCircle, MdError, MdSchedule, MdSync } from 'react-icons/md';
import { supabase } from 'config/supabase';
import { useAuth } from 'contexts/AuthContext';

export default function CollectionMonitor() {
  const { isAgency, advertiserId, isMaster, currentOrganizationId } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');

  // 최근 작업 조회
  const fetchJobs = async () => {
    try {
      let query = supabase
        .from('collection_jobs')
        .select('*');

      // 역할별 필터링
      if (isMaster && isMaster()) {
        if (currentOrganizationId) {
          // 해당 대행사의 advertiser_id 조회
          const { data: advertiserIds, error: advError } = await supabase
            .from('advertisers')
            .select('id')
            .eq('organization_id', currentOrganizationId)
            .is('deleted_at', null);

          if (advError) throw advError;

          if (advertiserIds && advertiserIds.length > 0) {
            // collection_jobs.advertiser_id로 직접 필터링
            query = query.in('advertiser_id', advertiserIds.map(a => a.id));
          } else {
            setJobs([]);
            setLoading(false);
            return;
          }
        }
        // else: 대행사 미선택 시 필터링 없음
      } else if (isAgency && isAgency()) {
        // Agency: 필터링 없음 (원래 동작 유지)
      } else {
        // Client: 자신의 advertiser_id만
        if (advertiserId) {
          query = query.eq('advertiser_id', advertiserId);
        }
      }

      const { data: jobsData, error } = await query
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching collection jobs:', error);
        setJobs([]);
        setLoading(false);
        return;
      }

      // 광고주 정보 조회
      const advertiserIds = [...new Set(jobsData.map(job => job.advertiser_id))];
      const { data: advertisersData } = await supabase
        .from('advertisers')
        .select('id, name')
        .in('id', advertiserIds);

      // Integration 정보 조회
      const { data: integrationsData } = await supabase
        .from('integrations')
        .select('id, advertiser_id, platform, legacy_account_id, legacy_customer_id, account_description')
        .in('advertiser_id', advertiserIds)
        .is('deleted_at', null);

      // 데이터 결합
      const enrichedJobs = jobsData.map(job => {
        const advertiser = advertisersData?.find(a => a.id === job.advertiser_id);
        const integration = integrationsData?.find(
          i => i.advertiser_id === job.advertiser_id && i.platform === job.platform
        );

        return {
          ...job,
          advertisers: advertiser ? { name: advertiser.name } : null,
          integrations: integration ? {
            legacy_account_id: integration.legacy_account_id,
            legacy_customer_id: integration.legacy_customer_id,
            account_description: integration.account_description
          } : null
        };
      });

      setJobs(enrichedJobs);
      setCurrentPage(1); // 데이터 업데이트 시 1페이지로 리셋
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
  }, [currentOrganizationId, isMaster, isAgency, advertiserId]);

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

  // 날짜 축약 (2026-01-11 -> 26-01-11)
  const formatDateShort = (dateStr) => {
    if (!dateStr) return '-';
    return dateStr.replace(/^20/, '');
  };

  // 페이지네이션 계산
  const totalPages = Math.ceil(jobs.length / itemsPerPage);
  const currentJobs = jobs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
                <Th borderColor={borderColor} whiteSpace="nowrap">광고주명</Th>
                <Th borderColor={borderColor} whiteSpace="nowrap">플랫폼</Th>
                <Th borderColor={borderColor} whiteSpace="nowrap">계정ID</Th>
                <Th borderColor={borderColor} whiteSpace="nowrap">설명</Th>
                <Th borderColor={borderColor} whiteSpace="nowrap">유형</Th>
                <Th borderColor={borderColor} whiteSpace="nowrap">모드</Th>
                <Th borderColor={borderColor} whiteSpace="nowrap">수집 날짜/기간</Th>
                <Th borderColor={borderColor} whiteSpace="nowrap">상태</Th>
                <Th borderColor={borderColor} whiteSpace="nowrap">진행률</Th>
                <Th borderColor={borderColor} whiteSpace="nowrap">시작 시간</Th>
                <Th borderColor={borderColor} whiteSpace="nowrap">완료 시간</Th>
              </Tr>
            </Thead>
            <Tbody>
              {currentJobs.map((job) => (
                <Tr
                  key={job.id}
                  _hover={{ bg: bgHover }}
                  cursor="pointer"
                  title={job.error_message || ''}
                >
                  <Td borderColor={borderColor}>
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color={textColor}
                      noOfLines={1}
                      maxW="150px"
                      title={job.advertisers?.name || '-'}
                    >
                      {job.advertisers?.name || '-'}
                    </Text>
                  </Td>
                  <Td borderColor={borderColor}>
                    <Text fontSize="sm" fontWeight="bold" color={textColor} whiteSpace="nowrap">
                      {job.platform}
                    </Text>
                  </Td>
                  <Td borderColor={borderColor}>
                    <Text fontSize="sm" color={textColor}>
                      {job.platform === 'Google Ads'
                        ? (job.integrations?.legacy_customer_id || '-')
                        : (job.integrations?.legacy_account_id ||
                           job.integrations?.legacy_customer_id || '-')}
                    </Text>
                  </Td>
                  <Td borderColor={borderColor}>
                    <Text
                      fontSize="sm"
                      color={textColor}
                      noOfLines={1}
                      maxW="200px"
                      title={job.integrations?.account_description || '-'}
                    >
                      {job.integrations?.account_description || '-'}
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
                    <Text fontSize="sm" color={textColor} whiteSpace="pre-line">
                      {job.mode === 'daily'
                        ? formatDateShort(job.collection_date)
                        : `${formatDateShort(job.start_date)}\n~ ${formatDateShort(job.end_date)}`}
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

          {/* 페이지네이션 UI */}
          {jobs.length > 0 && (
            <Flex justify="center" align="center" mt={4}>
              <HStack spacing={2}>
                <Button
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  isDisabled={currentPage === 1}
                >
                  처음
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  isDisabled={currentPage === 1}
                >
                  이전
                </Button>
                <Text fontSize="sm" px={3}>
                  {currentPage} / {totalPages}
                </Text>
                <Button
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  isDisabled={currentPage === totalPages}
                >
                  다음
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  isDisabled={currentPage === totalPages}
                >
                  마지막
                </Button>
              </HStack>
            </Flex>
          )}
        </Box>
      )}
    </Card>
  );
}
