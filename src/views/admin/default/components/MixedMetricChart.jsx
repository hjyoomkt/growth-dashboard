import React, { useMemo } from 'react';
import {
  Box,
  Flex,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  useColorModeValue,
} from '@chakra-ui/react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import Card from 'components/card/Card';
import ReactApexChart from 'react-apexcharts';

// 지표 설정
const METRICS = {
  impressions: { label: '노출', chartType: 'column', color: '#4318FF' },
  clicks: { label: '클릭', chartType: 'column', color: '#6AD2FF' },
  ctr: { label: 'CTR', chartType: 'line', color: '#01B574', suffix: '%', decimals: 2 },
  roas: { label: 'ROAS', chartType: 'line', color: '#FFB547', suffix: '%', decimals: 0 },
  cost: { label: '지출금액', chartType: 'column', color: '#E31A1A', prefix: '₩' },
  conversions: { label: '전환수', chartType: 'column', color: '#39B68D' },
};

export default function MixedMetricChart({
  dailyData,
  metric1,
  metric2,
  onMetric1Change,
  onMetric2Change,
}) {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textColorSecondary = useColorModeValue('gray.400', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const brandColor = useColorModeValue('brand.500', 'white');
  const bgHover = useColorModeValue('gray.50', 'whiteAlpha.50');
  const inputBg = useColorModeValue('white', 'navy.700');
  const gridColor = useColorModeValue('#E0E5F2', 'rgba(255, 255, 255, 0.1)');

  // 차트 데이터 및 옵션 생성
  const { series, options } = useMemo(() => {
    if (!dailyData || dailyData.length === 0) {
      return { series: [], options: {} };
    }

    const config1 = METRICS[metric1];
    const config2 = METRICS[metric2];

    // 날짜 카테고리 생성
    const categories = dailyData.map(row => {
      const date = new Date(row.date);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    // 시리즈 데이터 생성
    const seriesData = [
      {
        name: config1.label,
        type: config1.chartType,
        data: dailyData.map(row => {
          const value = row[metric1];
          return config1.decimals !== undefined
            ? Number(value.toFixed(config1.decimals))
            : Math.round(value);
        }),
      },
      {
        name: config2.label,
        type: config2.chartType,
        data: dailyData.map(row => {
          const value = row[metric2];
          return config2.decimals !== undefined
            ? Number(value.toFixed(config2.decimals))
            : Math.round(value);
        }),
      },
    ];

    // 차트 옵션 설정
    const chartOptions = {
      chart: {
        type: 'line',
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      colors: [config1.color, config2.color],
      stroke: {
        width: [
          config1.chartType === 'line' ? 3 : 0,
          config2.chartType === 'line' ? 3 : 0,
        ],
        curve: 'smooth',
      },
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '16px',
        },
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right',
        fontSize: '12px',
        fontWeight: 500,
        labels: {
          colors: textColorSecondary,
        },
        markers: {
          width: 12,
          height: 12,
          radius: 12,
        },
        itemMargin: {
          horizontal: 10,
        },
      },
      xaxis: {
        categories: categories,
        labels: {
          style: {
            colors: textColorSecondary,
            fontSize: '12px',
            fontWeight: '500',
          },
        },
        axisBorder: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
      },
      yaxis: [
        {
          seriesName: config1.label,
          title: {
            text: config1.label,
            style: {
              color: textColorSecondary,
              fontSize: '12px',
              fontWeight: '600',
            },
          },
          labels: {
            style: {
              colors: textColorSecondary,
              fontSize: '12px',
              fontWeight: '500',
            },
            formatter: (val) => {
              if (val === null || val === undefined) return '';
              const formatted = config1.decimals !== undefined
                ? val.toFixed(config1.decimals)
                : Math.round(val).toLocaleString();
              return `${config1.prefix || ''}${formatted}${config1.suffix || ''}`;
            },
          },
        },
        {
          seriesName: config2.label,
          opposite: true,
          title: {
            text: config2.label,
            style: {
              color: textColorSecondary,
              fontSize: '12px',
              fontWeight: '600',
            },
          },
          labels: {
            style: {
              colors: textColorSecondary,
              fontSize: '12px',
              fontWeight: '500',
            },
            formatter: (val) => {
              if (val === null || val === undefined) return '';
              const formatted = config2.decimals !== undefined
                ? val.toFixed(config2.decimals)
                : Math.round(val).toLocaleString();
              return `${config2.prefix || ''}${formatted}${config2.suffix || ''}`;
            },
          },
        },
      ],
      grid: {
        borderColor: gridColor,
        strokeDashArray: 5,
        yaxis: {
          lines: {
            show: true,
          },
        },
        xaxis: {
          lines: {
            show: false,
          },
        },
      },
      tooltip: {
        theme: 'dark',
        y: [
          {
            formatter: (val) => {
              if (val === null || val === undefined) return '';
              const formatted = config1.decimals !== undefined
                ? val.toFixed(config1.decimals)
                : Math.round(val).toLocaleString();
              return `${config1.prefix || ''}${formatted}${config1.suffix || ''}`;
            },
          },
          {
            formatter: (val) => {
              if (val === null || val === undefined) return '';
              const formatted = config2.decimals !== undefined
                ? val.toFixed(config2.decimals)
                : Math.round(val).toLocaleString();
              return `${config2.prefix || ''}${formatted}${config2.suffix || ''}`;
            },
          },
        ],
      },
    };

    return { series: seriesData, options: chartOptions };
  }, [dailyData, metric1, metric2, textColorSecondary, gridColor]);

  return (
    <Card p='16px'>
      <Flex justify='space-between' align='center' mb='16px' flexWrap='wrap' gap='10px'>
        <Text fontSize='lg' fontWeight='700' color={textColor}>
          성과 지표
        </Text>
        <Flex gap='10px' flexWrap='wrap'>
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
              px='12px'
              h='32px'
              borderRadius='8px'
              minW='80px'
            >
              {METRICS[metric1].label}
            </MenuButton>
            <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
              {Object.entries(METRICS).map(([key, value]) => (
                <MenuItem
                  key={key}
                  onClick={() => onMetric1Change(key)}
                  bg={metric1 === key ? brandColor : 'transparent'}
                  color={metric1 === key ? 'white' : textColor}
                  _hover={{
                    bg: metric1 === key ? brandColor : bgHover,
                  }}
                  fontWeight={metric1 === key ? '600' : '500'}
                  fontSize='sm'
                  px='12px'
                  py='6px'
                  borderRadius='6px'
                  minH='auto'
                >
                  {value.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>

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
              px='12px'
              h='32px'
              borderRadius='8px'
              minW='80px'
            >
              {METRICS[metric2].label}
            </MenuButton>
            <MenuList minW='auto' w='fit-content' px='8px' py='8px'>
              {Object.entries(METRICS).map(([key, value]) => (
                <MenuItem
                  key={key}
                  onClick={() => onMetric2Change(key)}
                  bg={metric2 === key ? brandColor : 'transparent'}
                  color={metric2 === key ? 'white' : textColor}
                  _hover={{
                    bg: metric2 === key ? brandColor : bgHover,
                  }}
                  fontWeight={metric2 === key ? '600' : '500'}
                  fontSize='sm'
                  px='12px'
                  py='6px'
                  borderRadius='6px'
                  minH='auto'
                >
                  {value.label}
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </Flex>
      </Flex>

      <Box h='250px'>
        {series.length > 0 ? (
          <ReactApexChart
            options={options}
            series={series}
            type='line'
            width='100%'
            height='100%'
          />
        ) : (
          <Flex h='100%' align='center' justify='center'>
            <Text color={textColorSecondary} fontSize='sm'>
              조회 기간에 데이터가 없습니다.
            </Text>
          </Flex>
        )}
      </Box>
    </Card>
  );
}
