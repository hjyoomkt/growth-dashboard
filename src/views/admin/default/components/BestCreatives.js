// Chakra imports
import {
  AvatarGroup,
  Avatar,
  Box,
  Button,
  Flex,
  Icon,
  Image,
  Text,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { MdKeyboardArrowDown } from 'react-icons/md';
import Card from "components/card/Card.js";
import React, { useState, useEffect, useMemo } from "react";
import { IoHeart, IoHeartOutline } from "react-icons/io5";
import { useDateRange } from "contexts/DateRangeContext";
import { useAuth } from "contexts/AuthContext";
import { getBestCreatives } from "services/supabaseService";

export default function BestCreatives(props) {
  const { creativeData = [], ...rest } = props;

  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [creativesData, setCreativesData] = useState([]);

  // ===== 2025-12-31: Supabase 데이터 조회 =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
        const data = await getBestCreatives({
          advertiserId: currentAdvertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
          limit: 6,
        });
        setCreativesData(data);
      } catch (error) {
        console.error('BEST 크리에이티브 조회 실패:', error);
      }
    };
    fetchData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "white");
  const borderColor = useColorModeValue("secondaryGray.100", "whiteAlpha.100");
  const brandColor = useColorModeValue("brand.500", "white");
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');

  // 매체 필터 상태
  const [selectedMedia, setSelectedMedia] = useState("");

  /* ❌ Mock 임시 데이터 (원복용 보존)
  const defaultData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRangeStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')} ~ ${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    return [
      { adName: "광고 A", media: "네이버", author: "네이버 광고팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 100000 + 500000), conversions: Math.floor(Math.random() * 50 + 150), ctr: (Math.random() * 2 + 3).toFixed(1), roas: Math.floor(Math.random() * 150 + 450), currentBid: "₩600,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 B", media: "구글", author: "구글 광고팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 90000 + 480000), conversions: Math.floor(Math.random() * 45 + 140), ctr: (Math.random() * 1.8 + 2.9).toFixed(1), roas: Math.floor(Math.random() * 140 + 430), currentBid: "₩550,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 C", media: "카카오", author: "카카오 광고팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 80000 + 460000), conversions: Math.floor(Math.random() * 40 + 130), ctr: (Math.random() * 1.6 + 2.8).toFixed(1), roas: Math.floor(Math.random() * 130 + 410), currentBid: "₩520,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 D", media: "메타", author: "메타 광고팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 70000 + 440000), conversions: Math.floor(Math.random() * 35 + 120), ctr: (Math.random() * 1.4 + 2.7).toFixed(1), roas: Math.floor(Math.random() * 120 + 390), currentBid: "₩490,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 E", media: "네이버", author: "네이버 마케팅팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 60000 + 420000), conversions: Math.floor(Math.random() * 30 + 110), ctr: (Math.random() * 1.2 + 2.6).toFixed(1), roas: Math.floor(Math.random() * 110 + 370), currentBid: "₩460,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 F", media: "구글", author: "구글 마케팅팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 50000 + 400000), conversions: Math.floor(Math.random() * 25 + 100), ctr: (Math.random() * 1 + 2.5).toFixed(1), roas: Math.floor(Math.random() * 100 + 350), currentBid: "₩430,000", bidders: [], dateRange: dateRangeStr },
    ];
  }, [startDate, endDate]);
  */

  // ✅ Supabase 실제 데이터 우선, props 데이터 대체
  const data = useMemo(() => {
    if (creativesData.length > 0) return creativesData;
    if (creativeData.length > 0) return creativeData;
    return [];
  }, [creativesData, creativeData]);

  // 매체 목록 추출
  const mediaList = useMemo(() => {
    return [...new Set(data.map(item => item.media))];
  }, [data]);

  // 순위 배지 색상 설정
  const purpleGradient = useColorModeValue("linear-gradient(135deg, #4318FF, #7551FF)", "linear-gradient(135deg, #7551FF, #9F7AEA)");
  const tealGradient = useColorModeValue("linear-gradient(135deg, #01B574, #39B68D)", "linear-gradient(135deg, #39B68D, #68D391)");
  const blueGradient = useColorModeValue("linear-gradient(135deg, #4299E1, #63B3ED)", "linear-gradient(135deg, #63B3ED, #90CDF4)");
  const grayBg = useColorModeValue("secondaryGray.600", "secondaryGray.500");

  // 필터링 및 상위 6개 선택
  const topCreatives = useMemo(() => {
    let filtered = data;
    if (selectedMedia) {
      filtered = data.filter(item => item.media === selectedMedia);
    }
    return filtered.slice(0, 6);
  }, [data, selectedMedia]);

  // 순위 배지 설정
  const getRankBadge = (index) => {
    if (index === 0) return { label: "🏆", bg: purpleGradient, color: "#fff" };
    if (index === 1) return { label: "🥈", bg: tealGradient, color: "#fff" };
    if (index === 2) return { label: "🥉", bg: blueGradient, color: "#fff" };
    return { label: `${index + 1}위`, bg: grayBg, color: "#fff" };
  };

  return (
    <Card p='20px' {...rest}>
      <Flex justify='space-between' align='center' mb='20px' flexWrap='wrap' gap='10px'>
        <Text color={textColor} fontSize='xl' fontWeight='700'>
          조회기간 BEST 소재
        </Text>
        <Flex align='center' gap='8px'>
          <Text fontSize='sm' color={textColorSecondary}>매체</Text>
          <Menu>
            <MenuButton
              as={Button}
              rightIcon={<MdKeyboardArrowDown />}
              bg={inputBg}
              border='1px solid'
              borderColor={borderColor}
              color={textColor}
              fontWeight='500'
              fontSize='sm'
              _hover={{ bg: bgHover }}
              _active={{ bg: bgHover }}
              px='16px'
              h='36px'
              borderRadius='12px'>
              {selectedMedia || '통합'}
            </MenuButton>
            <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
              <MenuItem
                onClick={() => setSelectedMedia('')}
                bg={selectedMedia === '' ? brandColor : 'transparent'}
                color={selectedMedia === '' ? 'white' : textColor}
                _hover={{
                  bg: selectedMedia === '' ? brandColor : bgHover,
                }}
                fontWeight={selectedMedia === '' ? '600' : '500'}
                fontSize='sm'
                px='12px'
                py='8px'
                borderRadius='8px'
                justifyContent='center'
                textAlign='center'
                minH='auto'>
                통합
              </MenuItem>
              {mediaList.map((media) => (
                <MenuItem
                  key={media}
                  onClick={() => setSelectedMedia(media)}
                  bg={selectedMedia === media ? brandColor : 'transparent'}
                  color={selectedMedia === media ? 'white' : textColor}
                  _hover={{
                    bg: selectedMedia === media ? brandColor : bgHover,
                  }}
                  fontWeight={selectedMedia === media ? '600' : '500'}
                  fontSize='sm'
                  px='12px'
                  py='8px'
                  borderRadius='8px'
                  justifyContent='center'
                  textAlign='center'
                  minH='auto'>
                  {media}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Flex>
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 3, lg: 4, xl: 6 }} gap='16px'>
        {topCreatives.map((creative, index) => (
          <CreativeCard
            key={index}
            creative={creative}
            rankBadge={getRankBadge(index)}
            textColor={textColor}
            textColorSecondary={textColorSecondary}
          />
        ))}
      </SimpleGrid>
    </Card>
  );
}

function CreativeCard({ creative, rankBadge, textColor, textColorSecondary }) {
  const [like, setLike] = useState(false);
  const textColorBid = useColorModeValue("brand.500", "white");
  const cardBorder = useColorModeValue("transparent", "whiteAlpha.100");

  return (
    <Card p='20px' border='1px solid' borderColor={cardBorder}>
      <Flex direction={{ base: "column" }} justify='center'>
        {/* 순위 배지 */}
        <Box position='absolute' top='14px' left='14px' bg={rankBadge.bg} color={rankBadge.color} px='10px' py='4px' borderRadius='12px' fontSize='14px' fontWeight='700' zIndex='5'>
          {rankBadge.label}
        </Box>

        {/* 이미지/영상 영역 */}
        <Box mb={{ base: "20px", "2xl": "20px" }} position='relative'>
          {creative.isVideo && creative.videoUrl ? (
            <video
              src={creative.videoUrl}
              style={{
                width: '100%',
                maxHeight: '200px',
                objectFit: 'cover',
                borderRadius: '20px',
                display: 'block'
              }}
              title={creative.adName}
              controls
              preload='metadata'
            />
          ) : creative.imageUrl ? (
            <Image
              src={creative.imageUrl}
              w={{ base: "100%", "3xl": "100%" }}
              h={{ base: "100%", "3xl": "100%" }}
              borderRadius='20px'
              alt={creative.adName}
            />
          ) : (
            <Flex
              w={{ base: "100%", "3xl": "100%" }}
              h='200px'
              borderRadius='20px'
              bg='gray.100'
              align='center'
              justify='center'
              color='gray.400'
            >
              이미지 없음
            </Flex>
          )}

          {/* 좋아요 버튼 */}
          <Button
            position='absolute'
            bg='white'
            _hover={{ bg: "whiteAlpha.900" }}
            _active={{ bg: "white" }}
            _focus={{ bg: "white" }}
            p='0px !important'
            top='14px'
            right='14px'
            borderRadius='50%'
            minW='36px'
            h='36px'
            onClick={() => setLike(!like)}
          >
            <Icon
              transition='0.2s linear'
              w='20px'
              h='20px'
              as={like ? IoHeart : IoHeartOutline}
              color='brand.500'
            />
          </Button>
        </Box>

        <Flex flexDirection='column' justify='space-between' h='100%'>
          <Flex
            justify='space-between'
            direction={{
              base: "row",
              md: "column",
              lg: "row",
              xl: "column",
              "2xl": "row",
            }}
            mb='auto'>
            <Flex direction='row' align='center' gap='8px' flexWrap='wrap'>
              <Text
                color={textColor}
                fontSize={{
                  base: "xl",
                  md: "lg",
                  lg: "lg",
                  xl: "lg",
                  "2xl": "md",
                  "3xl": "lg",
                }}
                fontWeight='bold'>
                {creative.adName}
              </Text>
              <Text
                color='secondaryGray.600'
                fontSize={{
                  base: "sm",
                }}
                fontWeight='400'>
                {creative.author}
              </Text>
            </Flex>
            {creative.bidders && creative.bidders.length > 0 && (
              <AvatarGroup
                max={3}
                color={textColorBid}
                size='sm'
                mt={{
                  base: "0px",
                  md: "10px",
                  lg: "0px",
                  xl: "10px",
                  "2xl": "0px",
                }}
                fontSize='12px'>
                {creative.bidders.map((avt, key) => (
                  <Avatar key={key} src={avt} />
                ))}
              </AvatarGroup>
            )}
          </Flex>
          {/* 지표 그리드 */}
          <Grid templateColumns='repeat(2, 1fr)' gap='8px' mt='15px' mb='15px'>
            <GridItem>
              <Text fontSize='10px' color='secondaryGray.600'>지출</Text>
              <Text fontSize='13px' fontWeight='700' color={textColor}>
                ₩{Math.round(creative.cost).toLocaleString()}
              </Text>
            </GridItem>
            <GridItem>
              <Text fontSize='10px' color='secondaryGray.600'>전환</Text>
              <Text fontSize='13px' fontWeight='700' color={textColor}>
                {creative.conversions}
              </Text>
            </GridItem>
            <GridItem>
              <Text fontSize='10px' color='secondaryGray.600'>CTR</Text>
              <Text fontSize='13px' fontWeight='700' color={textColor}>
                {creative.ctr}%
              </Text>
            </GridItem>
            <GridItem>
              <Text fontSize='10px' color='secondaryGray.600'>ROAS</Text>
              <Text fontSize='13px' fontWeight='700' color={textColor}>
                {creative.roas}%
              </Text>
            </GridItem>
          </Grid>

          <Button
            variant='darkBrand'
            color='white'
            fontSize='xs'
            fontWeight='500'
            borderRadius='70px'
            px='16px'
            py='4px'
            h='32px'
            w='100%'>
            상세보기
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
