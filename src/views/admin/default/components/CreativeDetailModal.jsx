import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Grid,
  GridItem,
  Box,
  Image,
  Flex,
  Text,
  Spinner,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { useDateRange } from 'contexts/DateRangeContext';
import { getAdDailyPerformance } from 'services/supabaseService';
import MixedMetricChart from './MixedMetricChart';
import DailyPerformanceTable from './DailyPerformanceTable';

export default function CreativeDetailModal({ isOpen, onClose, creative }) {
  const { startDate, endDate } = useDateRange();
  const toast = useToast();

  const [dailyData, setDailyData] = useState([]);
  const [adInfo, setAdInfo] = useState(null);
  const [metric1, setMetric1] = useState('impressions');
  const [metric2, setMetric2] = useState('ctr');
  const [loading, setLoading] = useState(false);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const bgColor = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const textColorSecondary = useColorModeValue('gray.600', 'gray.400');
  const mediaBoxBg = useColorModeValue('gray.50', 'navy.700');
  const cardBg = useColorModeValue('gray.50', 'navy.700');

  // 모달이 열릴 때 데이터 fetch
  useEffect(() => {
    if (!isOpen || !creative?.ad_id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await getAdDailyPerformance(creative.ad_id, startDate, endDate);
        setDailyData(result?.dailyData || []);
        setAdInfo(result?.adInfo || null);
      } catch (error) {
        console.error('일자별 성과 조회 실패:', error);
        toast({
          title: '데이터 조회 실패',
          description: '일자별 성과 데이터를 불러오는 데 실패했습니다.',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        setDailyData([]);
        setAdInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, creative?.ad_id, startDate, endDate, toast]);

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setDailyData([]);
      setAdInfo(null);
      setMetric1('impressions');
      setMetric2('ctr');
      setLoading(false);
    }
  }, [isOpen]);

  // 조회기간 합계 계산
  const totalSummary = React.useMemo(() => {
    if (!dailyData || dailyData.length === 0) {
      return { cost: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpa: 0, roas: 0 };
    }
    const totals = dailyData.reduce((acc, row) => {
      acc.cost += row.cost || 0;
      acc.impressions += row.impressions || 0;
      acc.clicks += row.clicks || 0;
      acc.conversions += row.conversions || 0;
      acc.conversion_value += row.conversion_value || 0;
      return acc;
    }, { cost: 0, impressions: 0, clicks: 0, conversions: 0, conversion_value: 0 });

    return {
      cost: totals.cost,
      impressions: totals.impressions,
      clicks: totals.clicks,
      conversions: totals.conversions,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
      roas: totals.cost > 0 ? (totals.conversion_value / totals.cost) * 100 : 0,
    };
  }, [dailyData]);

  if (!creative) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='4xl'>
      <ModalOverlay />
      <ModalContent bg={bgColor} maxW='70vw' maxH='85vh'>
        <ModalHeader>
          <Text color={textColor} fontSize='xl' fontWeight='700'>
            {creative.adName}
          </Text>
          <Text color={textColorSecondary} fontSize='sm' fontWeight='500' mt='4px'>
            {creative.media} • {`${startDate} ~ ${endDate}`}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb='20px' overflowY='auto'>
          {loading ? (
            <Flex justify='center' align='center' h='400px'>
              <Spinner size='xl' color='brand.500' thickness='4px' />
            </Flex>
          ) : (
            <Grid
              templateColumns={{ base: '1fr', lg: '1fr 2fr' }}
              gap='16px'
            >
              {/* 왼쪽: 이미지 or 동영상 + 광고 정보 */}
              <GridItem>
                <Flex direction='column' gap='16px'>
                  {/* 이미지/동영상 영역 */}
                  <Box
                    w='100%'
                    h='400px'
                    border='1px solid'
                    borderColor={borderColor}
                    borderRadius='16px'
                    overflow='hidden'
                    bg={mediaBoxBg}
                    display='flex'
                    alignItems='center'
                    justifyContent='center'
                  >
                    {creative.isVideo ? (
                      creative.videoUrl ? (
                        <video
                          src={creative.videoUrl}
                          controls
                          playsInline
                          style={{
                            width: '100%',
                            height: '400px',
                            objectFit: 'contain',
                          }}
                        >
                          브라우저가 비디오를 지원하지 않습니다.
                        </video>
                      ) : (
                        <Text color={textColorSecondary} fontSize='sm'>
                          동영상 없음
                        </Text>
                      )
                    ) : creative.imageUrl ? (
                      <Image
                        src={creative.imageUrl}
                        alt={creative.adName}
                        w='100%'
                        h='100%'
                        objectFit='contain'
                      />
                    ) : (
                      <Text color={textColorSecondary} fontSize='sm'>
                        이미지 없음
                      </Text>
                    )}
                  </Box>

                  {/* 광고 정보 영역 */}
                  <Box
                    p='16px'
                    bg={cardBg}
                    borderRadius='16px'
                    border='1px solid'
                    borderColor={borderColor}
                  >
                    {/* 캠페인명, 그룹명, 광고이름 */}
                    <Flex direction='column' gap='8px' mb='16px'>
                      <Flex justify='space-between' align='center'>
                        <Text fontSize='xs' color={textColorSecondary} fontWeight='500'>캠페인명</Text>
                        <Text fontSize='sm' color={textColor} fontWeight='600' textAlign='right' maxW='70%' noOfLines={1}>
                          {adInfo?.campaignName || '-'}
                        </Text>
                      </Flex>
                      <Flex justify='space-between' align='center'>
                        <Text fontSize='xs' color={textColorSecondary} fontWeight='500'>그룹명</Text>
                        <Text fontSize='sm' color={textColor} fontWeight='600' textAlign='right' maxW='70%' noOfLines={1}>
                          {adInfo?.adGroupName || '-'}
                        </Text>
                      </Flex>
                      <Flex justify='space-between' align='center'>
                        <Text fontSize='xs' color={textColorSecondary} fontWeight='500'>광고이름</Text>
                        <Text fontSize='sm' color={textColor} fontWeight='600' textAlign='right' maxW='70%' noOfLines={1}>
                          {adInfo?.adName || creative.adName || '-'}
                        </Text>
                      </Flex>
                    </Flex>

                    {/* 구분선 */}
                    <Box h='1px' bg={borderColor} mb='16px' />

                    {/* 성과 지표 (3개씩 배치) */}
                    <Grid templateColumns='repeat(3, 1fr)' gap='12px'>
                      <GridItem>
                        <Text fontSize='xs' color={textColorSecondary} fontWeight='500'>지출금액</Text>
                        <Text fontSize='sm' color={textColor} fontWeight='700'>
                          ₩{Math.round(totalSummary.cost).toLocaleString()}
                        </Text>
                      </GridItem>
                      <GridItem>
                        <Text fontSize='xs' color={textColorSecondary} fontWeight='500'>CTR</Text>
                        <Text fontSize='sm' color={textColor} fontWeight='700'>
                          {totalSummary.ctr.toFixed(2)}%
                        </Text>
                      </GridItem>
                      <GridItem>
                        <Text fontSize='xs' color={textColorSecondary} fontWeight='500'>전환수</Text>
                        <Text fontSize='sm' color={textColor} fontWeight='700'>
                          {Math.round(totalSummary.conversions).toLocaleString()}
                        </Text>
                      </GridItem>
                      <GridItem>
                        <Text fontSize='xs' color={textColorSecondary} fontWeight='500'>CPA</Text>
                        <Text fontSize='sm' color={textColor} fontWeight='700'>
                          ₩{Math.round(totalSummary.cpa).toLocaleString()}
                        </Text>
                      </GridItem>
                      <GridItem>
                        <Text fontSize='xs' color={textColorSecondary} fontWeight='500'>ROAS</Text>
                        <Text fontSize='sm' color={textColor} fontWeight='700'>
                          {Math.round(totalSummary.roas)}%
                        </Text>
                      </GridItem>
                    </Grid>
                  </Box>
                </Flex>
              </GridItem>

              {/* 오른쪽: 차트 + 테이블 */}
              <GridItem>
                <Flex direction='column' gap='16px'>
                  {/* 혼합 차트 */}
                  <MixedMetricChart
                    dailyData={dailyData}
                    metric1={metric1}
                    metric2={metric2}
                    onMetric1Change={setMetric1}
                    onMetric2Change={setMetric2}
                  />

                  {/* 일자별 성과 테이블 */}
                  <DailyPerformanceTable dailyData={dailyData} />
                </Flex>
              </GridItem>
            </Grid>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
