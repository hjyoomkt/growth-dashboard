/* eslint-disable */

import {
  Flex,
  Box,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Icon,
  useDisclosure,
} from '@chakra-ui/react';
import * as React from 'react';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

// Custom components
import Card from 'components/card/Card';
import { MdOutlineMoreHoriz, MdLocationPin } from 'react-icons/md';
import { useDateRange } from 'contexts/DateRangeContext';

const columnHelper = createColumnHelper();

// const columns = columnsDataCheck;
export default function CheckTable(props) {
  const { tableData } = props;
  const { startDate, endDate } = useDateRange();
  const [sorting, setSorting] = React.useState([]);
  const [selectedMedia, setSelectedMedia] = React.useState(null);
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const iconColor = useColorModeValue('brand.500', 'white');
  const bgList = useColorModeValue('white', 'whiteAlpha.100');
  const bgShadow = useColorModeValue(
    '14px 17px 40px 4px rgba(112, 144, 176, 0.08)',
    'unset'
  );
  const bgButton = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const bgHover = useColorModeValue(
    { bg: 'secondaryGray.400' },
    { bg: 'whiteAlpha.50' }
  );
  const bgFocus = useColorModeValue(
    { bg: 'secondaryGray.300' },
    { bg: 'whiteAlpha.100' }
  );
  const textHover = useColorModeValue(
    { color: 'secondaryGray.900', bg: 'unset' },
    { color: 'secondaryGray.500', bg: 'unset' }
  );
  const menuTextColor = useColorModeValue('secondaryGray.500', 'white');

  const { isOpen, onOpen, onClose } = useDisclosure();

  // 전체 매체별 캠페인 데이터 생성
  const generateCampaignData = React.useMemo(() => {
    const allMediaCampaigns = {
      'Naver': [
        { campaign: '봄 시즌 프로모션', cvr: (Math.random() * 3 + 2).toFixed(2), roas: Math.floor(Math.random() * 200 + 300) },
        { campaign: '여름 특가 이벤트', cvr: (Math.random() * 2.5 + 1.8).toFixed(2), roas: Math.floor(Math.random() * 180 + 280) },
        { campaign: '신상품 런칭 캠페인', cvr: (Math.random() * 3.5 + 2.2).toFixed(2), roas: Math.floor(Math.random() * 220 + 320) },
      ],
      'Meta': [
        { campaign: '브랜드 인지도 캠페인', cvr: (Math.random() * 2.8 + 1.5).toFixed(2), roas: Math.floor(Math.random() * 190 + 290) },
        { campaign: '타겟 리타게팅', cvr: (Math.random() * 3.2 + 2.5).toFixed(2), roas: Math.floor(Math.random() * 210 + 310) },
        { campaign: '가을 시즌 세일', cvr: (Math.random() * 2.6 + 1.7).toFixed(2), roas: Math.floor(Math.random() * 170 + 270) },
      ],
      'Google': [
        { campaign: '검색 광고 최적화', cvr: (Math.random() * 4 + 2.8).toFixed(2), roas: Math.floor(Math.random() * 240 + 350) },
        { campaign: '디스플레이 네트워크', cvr: (Math.random() * 2.2 + 1.3).toFixed(2), roas: Math.floor(Math.random() * 160 + 250) },
        { campaign: '쇼핑 광고 캠페인', cvr: (Math.random() * 3.8 + 2.5).toFixed(2), roas: Math.floor(Math.random() * 230 + 340) },
      ],
      'Kakao': [
        { campaign: '카카오톡 채널 광고', cvr: (Math.random() * 2.5 + 1.5).toFixed(2), roas: Math.floor(Math.random() * 150 + 240) },
        { campaign: '비즈보드 캠페인', cvr: (Math.random() * 2.8 + 1.8).toFixed(2), roas: Math.floor(Math.random() * 170 + 260) },
      ],
      'Criteo': [
        { campaign: '리타게팅 최적화', cvr: (Math.random() * 3.5 + 2.3).toFixed(2), roas: Math.floor(Math.random() * 200 + 300) },
        { campaign: '동적 상품 광고', cvr: (Math.random() * 3 + 2).toFixed(2), roas: Math.floor(Math.random() * 180 + 280) },
      ],
    };

    return allMediaCampaigns;
  }, [startDate, endDate]);

  // 사용 가능한 매체 목록 (우선순위: 네이버 > 메타 > 구글 > 카카오 > 크리테오)
  const availableMedia = React.useMemo(() => {
    const priorityOrder = ['Naver', 'Meta', 'Google', 'Kakao', 'Criteo'];
    return priorityOrder.filter(media => generateCampaignData[media] && generateCampaignData[media].length > 0);
  }, [generateCampaignData]);

  // 초기 선택 매체 설정
  React.useEffect(() => {
    if (!selectedMedia && availableMedia.length > 0) {
      setSelectedMedia(availableMedia[0]);
    }
  }, [availableMedia]);

  // 현재 선택된 매체의 캠페인 데이터
  const currentMediaData = React.useMemo(() => {
    if (!selectedMedia || !generateCampaignData[selectedMedia]) return [];

    return generateCampaignData[selectedMedia].map((campaign) => ({
      media: selectedMedia,
      campaign: campaign.campaign,
      cvr: campaign.cvr,
      roas: campaign.roas,
    }));
  }, [selectedMedia, generateCampaignData]);

  const columns = [
    columnHelper.accessor('media', {
      id: 'media',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          NAME
        </Text>
      ),
      cell: (info) => (
        <Flex align="center">
          <Text color={textColor} fontSize="sm" fontWeight="700">
            {info.getValue()}
          </Text>
        </Flex>
      ),
    }),
    columnHelper.accessor('campaign', {
      id: 'campaign',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          CAMPAIGN
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('cvr', {
      id: 'cvr',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          CVR
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {info.getValue()}%
        </Text>
      ),
    }),
    columnHelper.accessor('roas', {
      id: 'roas',
      header: () => (
        <Text
          justifyContent="space-between"
          align="center"
          fontSize={{ sm: '10px', lg: '12px' }}
          color="gray.400"
        >
          ROAS
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {info.getValue()}%
        </Text>
      ),
    }),
  ];

  const [data, setData] = React.useState(() => [...currentMediaData]);

  // selectedMedia 변경 시 데이터 업데이트
  React.useEffect(() => {
    setData([...currentMediaData]);
  }, [currentMediaData]);
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    debugTable: true,
  });
  return (
    <Card
      flexDirection="column"
      w="100%"
      px="0px"
      overflowX={{ sm: 'scroll', lg: 'hidden' }}
    >
      <Flex px="25px" mb="8px" justifyContent="space-between" align="center">
        <Text
          color={textColor}
          fontSize="22px"
          mb="4px"
          fontWeight="700"
          lineHeight="100%"
        >
          {selectedMedia} 캠페인 분석
        </Text>
        <Menu isOpen={isOpen} onClose={onClose}>
          <MenuButton
            align='center'
            justifyContent='center'
            bg={bgButton}
            _hover={bgHover}
            _focus={bgFocus}
            _active={bgFocus}
            w='37px'
            h='37px'
            lineHeight='100%'
            onClick={onOpen}
            borderRadius='10px'>
            <Icon as={MdOutlineMoreHoriz} color={iconColor} w='24px' h='24px' />
          </MenuButton>
          <MenuList
            w='150px'
            minW='unset'
            maxW='150px !important'
            border='transparent'
            backdropFilter='blur(63px)'
            bg={bgList}
            boxShadow={bgShadow}
            borderRadius='20px'
            p='15px'>
            {availableMedia.map((media, index) => (
              <MenuItem
                key={media}
                transition='0.2s linear'
                color={menuTextColor}
                _hover={textHover}
                p='0px'
                borderRadius='8px'
                _active={{
                  bg: 'transparent',
                }}
                _focus={{
                  bg: 'transparent',
                }}
                mb={index < availableMedia.length - 1 ? '10px' : '0px'}
                onClick={() => setSelectedMedia(media)}>
                <Flex align='center'>
                  <Icon as={MdLocationPin} h='16px' w='16px' me='8px' />
                  <Text fontSize='sm' fontWeight='400'>
                    {media}
                  </Text>
                </Flex>
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </Flex>
      <Box>
        <Table variant="simple" color="gray.500" mb="24px" mt="12px">
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <Th
                      key={header.id}
                      colSpan={header.colSpan}
                      pe="10px"
                      borderColor={borderColor}
                      cursor="pointer"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <Flex
                        justifyContent="space-between"
                        align="center"
                        fontSize={{ sm: '10px', lg: '12px' }}
                        color="gray.400"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {{
                          asc: '',
                          desc: '',
                        }[header.column.getIsSorted()] ?? null}
                      </Flex>
                    </Th>
                  );
                })}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table
              .getRowModel()
              .rows.slice(0, 11)
              .map((row) => {
                return (
                  <Tr key={row.id}>
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <Td
                          key={cell.id}
                          fontSize={{ sm: '14px' }}
                          minW={{ sm: '150px', md: '200px', lg: 'auto' }}
                          borderColor="transparent"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </Td>
                      );
                    })}
                  </Tr>
                );
              })}
          </Tbody>
        </Table>
      </Box>
    </Card>
  );
}
