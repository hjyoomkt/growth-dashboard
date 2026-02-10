import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Icon,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorModeValue,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from '@chakra-ui/react';
import { MdCalendarToday, MdKeyboardArrowDown, MdChevronLeft, MdChevronRight, MdFileDownload, MdCompareArrows, MdClose } from 'react-icons/md';
import { useDateRange } from 'contexts/DateRangeContext';
import { useAuth } from 'contexts/AuthContext';
import Card from 'components/card/Card';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import 'assets/css/MiniCalendar.css';
import { getDownloadCSVData, supabase } from 'services/supabaseService';

const DateRangePicker = () => {
  const {
    startDate,
    endDate,
    selectedPreset,
    setStartDate,
    setEndDate,
    setSelectedPreset,
    updateDateRange,
    comparisonMode,
    comparisonStartDate,
    setComparisonStartDate,
    comparisonEndDate,
    setComparisonEndDate,
    comparisonPreset,
    toggleComparisonMode,
    updateComparisonRange,
  } = useDateRange();

  const { user, currentAdvertiserId, availableAdvertisers } = useAuth();
  const isDemoUser = user?.email === 'demo@zestdot.com';

  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [isCompStartOpen, setIsCompStartOpen] = useState(false);
  const [isCompEndOpen, setIsCompEndOpen] = useState(false);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const brandColor = useColorModeValue('brand.500', 'white');
  const borderColor = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const inputTextColor = useColorModeValue('secondaryGray.900', 'white');
  const noticeBoxBg = useColorModeValue('orange.50', 'orange.900');
  const noticeTextColor = useColorModeValue('orange.700', 'orange.200');

  const presets = [
    '직접설정',
    '어제',
    '최근 7일',
    '최근 14일',
    '최근 30일',
    '이번 주',
    '지난주',
    '이번 달',
    '지난달',
  ];

  const handlePresetClick = (preset) => {
    updateDateRange(preset);
  };

  const formatDateDisplay = (start, end) => {
    if (!start || !end) return '기간을 선택하세요';

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return `${formatDate(start)} ~ ${formatDate(end)}`;
  };

  const handleStartDateChange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setStartDate(`${year}-${month}-${day}`);
    setSelectedPreset('직접설정');
    setIsStartOpen(false);
  };

  const handleEndDateChange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setEndDate(`${year}-${month}-${day}`);
    setSelectedPreset('직접설정');
    setIsEndOpen(false);
  };

  const handleComparisonStartDateChange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setComparisonStartDate(`${year}-${month}-${day}`);
    updateComparisonRange('직접설정');
    setIsCompStartOpen(false);
  };

  const handleComparisonEndDateChange = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setComparisonEndDate(`${year}-${month}-${day}`);
    updateComparisonRange('직접설정');
    setIsCompEndOpen(false);
  };

  const handleComparisonClick = () => {
    toggleComparisonMode();
  };

  const handleComparisonPresetClick = (preset) => {
    updateComparisonRange(preset);
  };

  const handleDownloadCSV = async () => {
    try {
      // 광고주 정보 가져오기
      const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);

      // Meta 전환 타입 조회 (단일 광고주인 경우)
      let metaConversionType = 'purchase';
      if (currentAdvertiserId && currentAdvertiserId !== 'all') {
        const { data: advertiserData } = await supabase
          .from('advertisers')
          .select('meta_conversion_type')
          .eq('id', currentAdvertiserId)
          .single();
        metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
      }

      console.log('[CSV 다운로드] 조회 시작:', {
        currentAdvertiserId,
        availableAdvertiserIds,
        startDate,
        endDate,
        metaConversionType
      });

      // Supabase에서 실제 데이터 조회
      const data = await getDownloadCSVData({
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds,
        startDate,
        endDate,
        metaConversionType
      });

      console.log('[CSV 다운로드] 조회 완료:', { rowCount: data.length });

      // 5만 건 이상 경고
      if (data.length >= 50000) {
        if (!window.confirm(`데이터가 ${data.length.toLocaleString()}건입니다. 다운로드 시 시간이 오래 걸릴 수 있습니다. 계속하시겠습니까?`)) {
          return;
        }
      }

      // CSV 생성
      const headers = ['날짜', '매체', '캠페인명', '그룹', '광고명', '지출', '노출', '클릭', '전환', '전환금액', '장바구니', '장바구니담기', '회원가입', '회원가입금액', '조회기간'];
      const dateRange = `${startDate} ~ ${endDate}`;

      // CSV 값 이스케이프 처리 (쉼표, 탭, 개행 등 특수문자 처리)
      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        // 쉼표, 개행, 탭, 큰따옴표가 포함된 경우 큰따옴표로 감싸기
        if (str.includes(',') || str.includes('\n') || str.includes('\t') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = data.map(row => [
        escapeCSV(row.date),
        escapeCSV(row.source || ''),
        escapeCSV(row.campaign_name || ''),
        escapeCSV(row.ad_group_name || ''),
        escapeCSV(row.ad_name || ''),
        row.cost || 0,
        row.impressions || 0,
        row.clicks || 0,
        row.conversions || 0,
        row.conversion_value || 0,
        row.add_to_cart || 0,
        row.add_to_cart_value || 0,
        row.complete_registrations || 0,
        row.complete_registrations_value || 0,
        escapeCSV(dateRange)
      ]);

      const csvData = [headers, ...rows];
      const csvContent = csvData.map(row => row.join(',')).join('\n');

      // UTF-8 BOM 추가 (엑셀에서 한글 깨짐 방지)
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const fileName = `광고_상세데이터_${startDate}_${endDate}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('[CSV 다운로드] 완료:', fileName);
    } catch (error) {
      console.error('[CSV 다운로드] 실패:', error);
      alert(`CSV 다운로드에 실패했습니다.\n오류: ${error.message}`);
    }
  };

  return (
    <Card p='20px' mb='20px'>
      <Flex direction='column' gap='12px'>
        {isDemoUser && (
          <Box
            mb='8px'
            p='10px 12px'
            bg={noticeBoxBg}
            borderLeft='3px solid'
            borderColor='orange.400'
            borderRadius='6px'>
            <Text
              fontSize='xs'
              fontWeight='500'
              color={noticeTextColor}>
              알림: 250130~250205 데이터만 조회 가능합니다.
            </Text>
          </Box>
        )}
        <Flex align='center' gap='12px' flexWrap='wrap'>
          <Icon as={MdCalendarToday} w='18px' h='18px' color={brandColor} />

        <Flex align='center' gap='8px'>
          <Popover isOpen={isStartOpen} onClose={() => setIsStartOpen(false)}>
            <PopoverTrigger>
              <Input
                value={startDate}
                onClick={() => setIsStartOpen(true)}
                readOnly
                cursor='pointer'
                size='sm'
                w='130px'
                h='36px'
                bg={inputBg}
                color={inputTextColor}
                borderColor={borderColor}
                borderRadius='12px'
                textAlign='center'
                fontSize='sm'
                fontFamily='DM Sans'
                fontWeight='500'
                px='4px'
                _focus={{ borderColor: brandColor }}
              />
            </PopoverTrigger>
            <PopoverContent w='290px'>
              <PopoverBody p='15px'>
                <Box transform='scale(0.85)' transformOrigin='top left' w='300px'>
                  <Calendar
                    onChange={handleStartDateChange}
                    value={startDate ? new Date(startDate) : new Date()}
                    view='month'
                    prevLabel={<Icon as={MdChevronLeft} w='24px' h='24px' mt='4px' />}
                    nextLabel={<Icon as={MdChevronRight} w='24px' h='24px' mt='4px' />}
                  />
                </Box>
              </PopoverBody>
            </PopoverContent>
          </Popover>

          <Text fontSize='sm' color={textColor}>
            ~
          </Text>

          <Popover isOpen={isEndOpen} onClose={() => setIsEndOpen(false)}>
            <PopoverTrigger>
              <Input
                value={endDate}
                onClick={() => setIsEndOpen(true)}
                readOnly
                cursor='pointer'
                size='sm'
                w='130px'
                h='36px'
                bg={inputBg}
                color={inputTextColor}
                borderColor={borderColor}
                borderRadius='12px'
                textAlign='center'
                fontSize='sm'
                fontFamily='DM Sans'
                fontWeight='500'
                px='4px'
                _focus={{ borderColor: brandColor }}
              />
            </PopoverTrigger>
            <PopoverContent w='290px'>
              <PopoverBody p='15px'>
                <Box transform='scale(0.85)' transformOrigin='top left' w='300px'>
                  <Calendar
                    onChange={handleEndDateChange}
                    value={endDate ? new Date(endDate) : new Date()}
                    view='month'
                    prevLabel={<Icon as={MdChevronLeft} w='24px' h='24px' mt='4px' />}
                    nextLabel={<Icon as={MdChevronRight} w='24px' h='24px' mt='4px' />}
                  />
                </Box>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </Flex>

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
            {selectedPreset}
          </MenuButton>
          <MenuList minW='auto' w='fit-content' px='8px' py='8px' zIndex={2000}>
            {presets.map((preset) => (
              <MenuItem
                key={preset}
                onClick={() => handlePresetClick(preset)}
                bg={selectedPreset === preset ? brandColor : 'transparent'}
                color={selectedPreset === preset ? 'white' : textColor}
                _hover={{
                  bg: selectedPreset === preset ? brandColor : bgHover,
                }}
                fontWeight={selectedPreset === preset ? '600' : '500'}
                fontSize='sm'
                px='12px'
                py='8px'
                borderRadius='8px'
                justifyContent='center'
                textAlign='center'
                minH='auto'>
                {preset}
              </MenuItem>
            ))}

            <Box borderTop='1px solid' borderColor={borderColor} my='8px' />

            <MenuItem
              onClick={handleComparisonClick}
              bg={comparisonMode ? brandColor : 'transparent'}
              color={comparisonMode ? 'white' : textColor}
              _hover={{
                bg: comparisonMode ? brandColor : bgHover,
              }}
              fontWeight={comparisonMode ? '600' : '500'}
              fontSize='sm'
              px='12px'
              py='8px'
              borderRadius='8px'
              justifyContent='center'
              textAlign='center'
              minH='auto'
              icon={<Icon as={MdCompareArrows} />}>
              <Flex align='center' gap='6px'>
                <Icon as={MdCompareArrows} w='14px' h='14px' />
                <Text>비교</Text>
              </Flex>
            </MenuItem>
          </MenuList>
        </Menu>

        <Button
          leftIcon={<Icon as={MdFileDownload} w='16px' h='16px' />}
          bg={brandColor}
          color='white'
          fontWeight='500'
          fontSize='sm'
          _hover={{ opacity: 0.9 }}
          _active={{ opacity: 0.8 }}
          px='16px'
          h='36px'
          borderRadius='12px'
          onClick={handleDownloadCSV}>
          다운로드
        </Button>
        </Flex>

        {comparisonMode && (
          <Flex
            align='center'
            gap='12px'
            pt='12px'
            borderTop='1px solid'
            borderColor={borderColor}
            flexWrap='wrap'>
            <Icon as={MdCompareArrows} w='18px' h='18px' color={brandColor} />
            <Text fontSize='sm' fontWeight='500' color={textColor} minW='60px'>
              비교 기간
            </Text>

            <Flex align='center' gap='8px'>
              <Popover isOpen={isCompStartOpen} onClose={() => setIsCompStartOpen(false)}>
                <PopoverTrigger>
                  <Input
                    value={comparisonStartDate || '시작일'}
                    onClick={() => setIsCompStartOpen(true)}
                    readOnly
                    cursor='pointer'
                    size='sm'
                    w='130px'
                    h='36px'
                    bg={inputBg}
                    color={comparisonStartDate ? inputTextColor : 'gray.400'}
                    borderColor={borderColor}
                    borderRadius='12px'
                    textAlign='center'
                    fontSize='sm'
                    fontFamily='DM Sans'
                    fontWeight='500'
                    px='4px'
                    _focus={{ borderColor: brandColor }}
                  />
                </PopoverTrigger>
                <PopoverContent w='290px'>
                  <PopoverBody p='15px'>
                    <Box transform='scale(0.85)' transformOrigin='top left' w='300px'>
                      <Calendar
                        onChange={handleComparisonStartDateChange}
                        value={comparisonStartDate ? new Date(comparisonStartDate) : new Date()}
                        view='month'
                        prevLabel={<Icon as={MdChevronLeft} w='24px' h='24px' mt='4px' />}
                        nextLabel={<Icon as={MdChevronRight} w='24px' h='24px' mt='4px' />}
                      />
                    </Box>
                  </PopoverBody>
                </PopoverContent>
              </Popover>

              <Text fontSize='sm' color={textColor}>
                ~
              </Text>

              <Popover isOpen={isCompEndOpen} onClose={() => setIsCompEndOpen(false)}>
                <PopoverTrigger>
                  <Input
                    value={comparisonEndDate || '종료일'}
                    onClick={() => setIsCompEndOpen(true)}
                    readOnly
                    cursor='pointer'
                    size='sm'
                    w='130px'
                    h='36px'
                    bg={inputBg}
                    color={comparisonEndDate ? inputTextColor : 'gray.400'}
                    borderColor={borderColor}
                    borderRadius='12px'
                    textAlign='center'
                    fontSize='sm'
                    fontFamily='DM Sans'
                    fontWeight='500'
                    px='4px'
                    _focus={{ borderColor: brandColor }}
                  />
                </PopoverTrigger>
                <PopoverContent w='290px'>
                  <PopoverBody p='15px'>
                    <Box transform='scale(0.85)' transformOrigin='top left' w='300px'>
                      <Calendar
                        onChange={handleComparisonEndDateChange}
                        value={comparisonEndDate ? new Date(comparisonEndDate) : new Date()}
                        view='month'
                        prevLabel={<Icon as={MdChevronLeft} w='24px' h='24px' mt='4px' />}
                        nextLabel={<Icon as={MdChevronRight} w='24px' h='24px' mt='4px' />}
                      />
                    </Box>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </Flex>

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
                {comparisonPreset}
              </MenuButton>
              <MenuList minW='auto' w='fit-content' px='8px' py='8px' zIndex={2000}>
                {presets.map((preset) => (
                  <MenuItem
                    key={preset}
                    onClick={() => handleComparisonPresetClick(preset)}
                    bg={comparisonPreset === preset ? brandColor : 'transparent'}
                    color={comparisonPreset === preset ? 'white' : textColor}
                    _hover={{
                      bg: comparisonPreset === preset ? brandColor : bgHover,
                    }}
                    fontWeight={comparisonPreset === preset ? '600' : '500'}
                    fontSize='sm'
                    px='12px'
                    py='8px'
                    borderRadius='8px'
                    justifyContent='center'
                    textAlign='center'
                    minH='auto'>
                    {preset}
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>

            <Button
              size='sm'
              variant='ghost'
              color='gray.500'
              onClick={handleComparisonClick}
              leftIcon={<Icon as={MdClose} w='16px' h='16px' />}
              h='36px'
              px='12px'
              fontSize='sm'>
              닫기
            </Button>
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default DateRangePicker;
