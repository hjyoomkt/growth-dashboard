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
  IconButton,
} from "@chakra-ui/react";
import { MdKeyboardArrowDown, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import Card from "components/card/Card.js";
import React, { useState, useEffect, useMemo } from "react";
import { IoHeart, IoHeartOutline } from "react-icons/io5";
import { useDateRange } from "contexts/DateRangeContext";
import { useAuth } from "contexts/AuthContext";
import { getAllCreatives } from "services/supabaseService";

export default function AllCreatives(props) {
  const { creativeData = [], ...rest } = props;

  const { startDate, endDate } = useDateRange();
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const [creativesData, setCreativesData] = useState([]);

  // ===== 2025-12-31: Supabase 데이터 조회 =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
        const data = await getAllCreatives({
          advertiserId: currentAdvertiserId,
          availableAdvertiserIds,
          startDate,
          endDate,
        });
        setCreativesData(data);
      } catch (error) {
        console.error('모든 크리에이티브 조회 실패:', error);
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

  // 필터 상태
  const [selectedMedia, setSelectedMedia] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [sortBy, setSortBy] = useState("cost");

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 12; // 2행 x 6개

  /* ❌ Mock 임시 데이터 (원복용 보존)
  const defaultData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateRangeStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')} ~ ${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    return [
      { adName: "광고 A", media: "네이버", campaign: "캠페인 1", author: "네이버 광고팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 100000 + 450000), conversions: Math.floor(Math.random() * 30 + 110), clicks: Math.floor(Math.random() * 800 + 3200), ctr: (Math.random() * 1 + 3).toFixed(1), roas: Math.floor(Math.random() * 100 + 400), impressions: Math.floor(Math.random() * 20000 + 95000), currentBid: "₩500,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 B", media: "네이버", campaign: "캠페인 2", author: "네이버 마케팅팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 90000 + 410000), conversions: Math.floor(Math.random() * 25 + 100), clicks: Math.floor(Math.random() * 700 + 2900), ctr: (Math.random() * 0.8 + 2.8).toFixed(1), roas: Math.floor(Math.random() * 90 + 370), impressions: Math.floor(Math.random() * 18000 + 88000), currentBid: "₩450,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 C", media: "구글", campaign: "캠페인 3", author: "구글 광고팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 80000 + 370000), conversions: Math.floor(Math.random() * 20 + 90), clicks: Math.floor(Math.random() * 600 + 2600), ctr: (Math.random() * 0.7 + 2.5).toFixed(1), roas: Math.floor(Math.random() * 80 + 340), impressions: Math.floor(Math.random() * 16000 + 82000), currentBid: "₩400,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 D", media: "구글", campaign: "캠페인 4", author: "구글 마케팅팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 70000 + 350000), conversions: Math.floor(Math.random() * 18 + 85), clicks: Math.floor(Math.random() * 500 + 2300), ctr: (Math.random() * 0.6 + 2.2).toFixed(1), roas: Math.floor(Math.random() * 70 + 320), impressions: Math.floor(Math.random() * 14000 + 78000), currentBid: "₩380,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 E", media: "카카오", campaign: "캠페인 5", author: "카카오 광고팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 60000 + 320000), conversions: Math.floor(Math.random() * 15 + 80), clicks: Math.floor(Math.random() * 450 + 2100), ctr: (Math.random() * 0.5 + 2.0).toFixed(1), roas: Math.floor(Math.random() * 60 + 300), impressions: Math.floor(Math.random() * 12000 + 74000), currentBid: "₩350,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 F", media: "카카오", campaign: "캠페인 6", author: "카카오 마케팅팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 50000 + 295000), conversions: Math.floor(Math.random() * 12 + 72), clicks: Math.floor(Math.random() * 400 + 1950), ctr: (Math.random() * 0.4 + 1.9).toFixed(1), roas: Math.floor(Math.random() * 50 + 285), impressions: Math.floor(Math.random() * 10000 + 70000), currentBid: "₩320,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 G", media: "네이버", campaign: "캠페인 1", author: "네이버 광고팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 40000 + 280000), conversions: Math.floor(Math.random() * 10 + 68), clicks: Math.floor(Math.random() * 350 + 1850), ctr: (Math.random() * 0.3 + 1.8).toFixed(1), roas: Math.floor(Math.random() * 40 + 270), impressions: Math.floor(Math.random() * 8000 + 66000), currentBid: "₩300,000", bidders: [], dateRange: dateRangeStr },
      { adName: "광고 H", media: "구글", campaign: "캠페인 3", author: "구글 마케팅팀", imageUrl: "", videoUrl: "", isVideo: false, cost: Math.floor(Math.random() * 35000 + 265000), conversions: Math.floor(Math.random() * 8 + 63), clicks: Math.floor(Math.random() * 300 + 1750), ctr: (Math.random() * 0.3 + 1.7).toFixed(1), roas: Math.floor(Math.random() * 35 + 255), impressions: Math.floor(Math.random() * 7000 + 62000), currentBid: "₩280,000", bidders: [], dateRange: dateRangeStr },
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

  // 선택된 매체에 따른 캠페인 목록
  const campaignList = useMemo(() => {
    if (!selectedMedia) return [];
    return [...new Set(data.filter(item => item.media === selectedMedia).map(item => item.campaign))];
  }, [data, selectedMedia]);

  // 필터링 및 정렬
  const filteredAndSortedCreatives = useMemo(() => {
    let filtered = data;

    // 매체 필터
    if (selectedMedia) {
      filtered = filtered.filter(item => item.media === selectedMedia);
    }

    // 캠페인 필터
    if (selectedCampaign) {
      filtered = filtered.filter(item => item.campaign === selectedCampaign);
    }

    // 정렬
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "cost":
          return b.cost - a.cost;
        case "conversions":
          return b.conversions - a.conversions;
        case "clicks":
          return b.clicks - a.clicks;
        case "ctr":
          return b.ctr - a.ctr;
        case "roas":
          return b.roas - a.roas;
        default:
          return 0;
      }
    });

    return sorted;
  }, [data, selectedMedia, selectedCampaign, sortBy]);

  // 전체 페이지 수 계산
  const totalPages = Math.ceil(filteredAndSortedCreatives.length / itemsPerPage);

  // 페이지네이션된 크리에이티브
  const paginatedCreatives = useMemo(() => {
    const start = currentPage * itemsPerPage;
    return filteredAndSortedCreatives.slice(start, start + itemsPerPage);
  }, [filteredAndSortedCreatives, currentPage, itemsPerPage]);

  // 필터 변경 시 첫 페이지로 리셋
  React.useEffect(() => {
    setCurrentPage(0);
  }, [selectedMedia, selectedCampaign, sortBy]);

  // 매체 선택 변경 시 캠페인 초기화
  const handleMediaChange = (e) => {
    setSelectedMedia(e.target.value);
    setSelectedCampaign("");
  };

  // 페이지 변경 핸들러
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  return (
    <Card p='20px' {...rest}>
      <Flex justify='space-between' align='center' mb='20px' flexWrap='wrap' gap='12px'>
        <Text color={textColor} fontSize='xl' fontWeight='700'>
          광고 크리에이티브
        </Text>
        <Flex align='center' gap='8px' flexWrap='wrap'>
          {/* 매체 선택 */}
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
                {selectedMedia || '전체'}
              </MenuButton>
              <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
                <MenuItem
                  onClick={() => handleMediaChange({ target: { value: '' } })}
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
                  전체
                </MenuItem>
                {mediaList.map((media) => (
                  <MenuItem
                    key={media}
                    onClick={() => handleMediaChange({ target: { value: media } })}
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

          {/* 캠페인 선택 */}
          <Flex align='center' gap='8px'>
            <Text fontSize='sm' color={textColorSecondary}>캠페인</Text>
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
                borderRadius='12px'
                isDisabled={!selectedMedia}>
                {selectedCampaign || '전체'}
              </MenuButton>
              <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
                <MenuItem
                  onClick={() => setSelectedCampaign('')}
                  bg={selectedCampaign === '' ? brandColor : 'transparent'}
                  color={selectedCampaign === '' ? 'white' : textColor}
                  _hover={{
                    bg: selectedCampaign === '' ? brandColor : bgHover,
                  }}
                  fontWeight={selectedCampaign === '' ? '600' : '500'}
                  fontSize='sm'
                  px='12px'
                  py='8px'
                  borderRadius='8px'
                  justifyContent='center'
                  textAlign='center'
                  minH='auto'>
                  전체
                </MenuItem>
                {campaignList.map((campaign) => (
                  <MenuItem
                    key={campaign}
                    onClick={() => setSelectedCampaign(campaign)}
                    bg={selectedCampaign === campaign ? brandColor : 'transparent'}
                    color={selectedCampaign === campaign ? 'white' : textColor}
                    _hover={{
                      bg: selectedCampaign === campaign ? brandColor : bgHover,
                    }}
                    fontWeight={selectedCampaign === campaign ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='8px'
                    borderRadius='8px'
                    justifyContent='center'
                    textAlign='center'
                    minH='auto'>
                    {campaign}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </Flex>

          {/* 정렬 선택 */}
          <Flex align='center' gap='8px'>
            <Text fontSize='sm' color={textColorSecondary}>정렬</Text>
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
                {sortBy === 'cost' ? '지출' : sortBy === 'conversions' ? '전환' : sortBy === 'clicks' ? '클릭' : sortBy === 'ctr' ? 'CTR' : 'ROAS'}
              </MenuButton>
              <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
                {[
                  { value: 'cost', label: '지출' },
                  { value: 'conversions', label: '전환' },
                  { value: 'clicks', label: '클릭' },
                  { value: 'ctr', label: 'CTR' },
                  { value: 'roas', label: 'ROAS' }
                ].map((option) => (
                  <MenuItem
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    bg={sortBy === option.value ? brandColor : 'transparent'}
                    color={sortBy === option.value ? 'white' : textColor}
                    _hover={{
                      bg: sortBy === option.value ? brandColor : bgHover,
                    }}
                    fontWeight={sortBy === option.value ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='8px'
                    borderRadius='8px'
                    justifyContent='center'
                    textAlign='center'
                    minH='auto'>
                    {option.label}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          </Flex>
        </Flex>
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 3, lg: 4, xl: 6 }} gap='16px'>
        {paginatedCreatives.map((creative, index) => (
          <CreativeCard
            key={index}
            creative={creative}
            textColor={textColor}
            textColorSecondary={textColorSecondary}
          />
        ))}
      </SimpleGrid>

      {/* 페이지네이션 버튼 */}
      {totalPages > 1 && (
        <Flex justify='center' align='center' mt='20px' gap='12px'>
          <IconButton
            icon={<Icon as={MdChevronLeft} w='20px' h='20px' />}
            onClick={handlePrevPage}
            isDisabled={currentPage === 0}
            size='sm'
            variant='outline'
            borderColor={borderColor}
            color={textColor}
            _hover={{ bg: bgHover }}
            borderRadius='10px'
            aria-label='Previous page'
          />
          <Text fontSize='sm' color={textColor} fontWeight='600' minW='60px' textAlign='center'>
            {currentPage + 1} / {totalPages}
          </Text>
          <IconButton
            icon={<Icon as={MdChevronRight} w='20px' h='20px' />}
            onClick={handleNextPage}
            isDisabled={currentPage === totalPages - 1}
            size='sm'
            variant='outline'
            borderColor={borderColor}
            color={textColor}
            _hover={{ bg: bgHover }}
            borderRadius='10px'
            aria-label='Next page'
          />
        </Flex>
      )}
    </Card>
  );
}

function CreativeCard({ creative, textColor, textColorSecondary }) {
  const [like, setLike] = useState(false);
  const textColorBid = useColorModeValue("brand.500", "white");
  const cardBorder = useColorModeValue("transparent", "whiteAlpha.100");

  return (
    <Card p='20px' border='1px solid' borderColor={cardBorder}>
      <Flex direction={{ base: "column" }} justify='center'>
        {/* 이미지/영상 영역 */}
        <Box mb={{ base: "20px", "2xl": "20px" }} position='relative'>
          {creative.isVideo && creative.videoUrl ? (
            <Box w={{ base: "100%", "3xl": "100%" }} h={{ base: "100%", "3xl": "100%" }} borderRadius='20px' overflow='hidden'>
              <iframe
                src={creative.videoUrl}
                width='100%'
                height='100%'
                style={{ border: 'none', minHeight: '200px' }}
                title={creative.adName}
              />
            </Box>
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
