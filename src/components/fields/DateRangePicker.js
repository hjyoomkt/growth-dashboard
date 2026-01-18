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
import { MdCalendarToday, MdKeyboardArrowDown, MdChevronLeft, MdChevronRight, MdFileDownload } from 'react-icons/md';
import { useDateRange } from 'contexts/DateRangeContext';
import Card from 'components/card/Card';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import 'assets/css/MiniCalendar.css';

const DateRangePicker = () => {
  const {
    startDate,
    endDate,
    selectedPreset,
    setStartDate,
    setEndDate,
    setSelectedPreset,
    updateDateRange,
  } = useDateRange();

  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const brandColor = useColorModeValue('brand.500', 'white');
  const borderColor = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const bgHover = useColorModeValue('secondaryGray.100', 'whiteAlpha.100');
  const inputBg = useColorModeValue('white', 'navy.700');
  const inputTextColor = useColorModeValue('secondaryGray.900', 'white');

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

  const handleDownloadCSV = () => {
    // CSV 데이터 생성
    const generateCSVData = () => {
      const headers = ['날짜', '매체', '캠페인명', '그룹', '광고명', '지출', '노출', '클릭', '전환', '전환금액', '장바구니', '장바구니담기', '조회기간'];

      const mediaList = ["Google", "Naver", "Meta", "Kakao", "Criteo"];
      const campaigns = ["봄 시즌 캠페인", "여름 프로모션", "신상품 런칭", "가을 세일", "겨울 특가"];
      const groups = ["그룹A", "그룹B", "그룹C"];
      const ads = ["광고1", "광고2", "광고3"];

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const dateRange = `${startDate} ~ ${endDate}`;
      const rows = [];

      // 일별 데이터 생성 (조회 기간 전체)
      for (let i = 0; i < diffDays; i++) {
        const currentDate = new Date(start);
        currentDate.setDate(start.getDate() + i);
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

        mediaList.forEach((media) => {
          campaigns.forEach((campaign) => {
            groups.forEach((group) => {
              ads.forEach((ad) => {
                rows.push([
                  dateStr,
                  media,
                  campaign,
                  group,
                  ad,
                  Math.floor(Math.random() * 10000 + 5000), // 지출
                  Math.floor(Math.random() * 20000 + 10000), // 노출
                  Math.floor(Math.random() * 500 + 200), // 클릭
                  Math.floor(Math.random() * 10 + 5), // 전환
                  Math.floor(Math.random() * 100000 + 50000), // 전환금액
                  Math.floor(Math.random() * 30 + 10), // 장바구니
                  Math.floor(Math.random() * 50 + 20), // 장바구니담기
                  dateRange, // 조회기간
                ]);
              });
            });
          });
        });
      }

      return [headers, ...rows];
    };

    const csvData = generateCSVData();
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
  };

  return (
    <Card p='20px' mb='20px'>
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
          <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
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
    </Card>
  );
};

export default DateRangePicker;
