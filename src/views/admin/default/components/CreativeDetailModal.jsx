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
  const [metric1, setMetric1] = useState('impressions');
  const [metric2, setMetric2] = useState('ctr');
  const [loading, setLoading] = useState(false);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const bgColor = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const textColorSecondary = useColorModeValue('gray.600', 'gray.400');
  const mediaBoxBg = useColorModeValue('gray.50', 'navy.700');

  // 모달이 열릴 때 데이터 fetch
  useEffect(() => {
    if (!isOpen || !creative?.ad_id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getAdDailyPerformance(creative.ad_id, startDate, endDate);
        setDailyData(data || []);
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
      setMetric1('impressions');
      setMetric2('ctr');
      setLoading(false);
    }
  }, [isOpen]);

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
              {/* 왼쪽: 이미지 or 동영상 */}
              <GridItem>
                <Box
                  w='100%'
                  h='100%'
                  minH='250px'
                  maxH='400px'
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
                        style={{
                          width: '100%',
                          height: '100%',
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
