import React from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import Card from 'components/card/Card';

export default function DailyPerformanceTable({ dailyData }) {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textColorSecondary = useColorModeValue('gray.400', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const bgHover = useColorModeValue('gray.50', 'whiteAlpha.50');
  const theadBg = useColorModeValue('white', 'navy.800');

  // 데이터가 없을 경우 처리
  if (!dailyData || dailyData.length === 0) {
    return (
      <Card p='16px'>
        <Text fontSize='lg' fontWeight='700' mb='16px' color={textColor}>
          일자별 성과
        </Text>
        <Text color={textColorSecondary} fontSize='sm'>
          조회 기간에 데이터가 없습니다.
        </Text>
      </Card>
    );
  }

  return (
    <Card p='16px'>
      <Text fontSize='lg' fontWeight='700' mb='16px' color={textColor}>
        일자별 성과
      </Text>
      <Box maxH='300px' overflowY='auto'>
        <Table variant='simple' size='sm'>
          <Thead position='sticky' top='0' bg={theadBg} zIndex='1'>
            <Tr>
              <Th
                borderColor={borderColor}
                color={textColorSecondary}
                fontSize={{ sm: '10px', lg: '12px' }}
                fontWeight='700'
                textTransform='uppercase'
              >
                날짜
              </Th>
              <Th
                borderColor={borderColor}
                color={textColorSecondary}
                fontSize={{ sm: '10px', lg: '12px' }}
                fontWeight='700'
                textTransform='uppercase'
                isNumeric
              >
                노출
              </Th>
              <Th
                borderColor={borderColor}
                color={textColorSecondary}
                fontSize={{ sm: '10px', lg: '12px' }}
                fontWeight='700'
                textTransform='uppercase'
                isNumeric
              >
                클릭
              </Th>
              <Th
                borderColor={borderColor}
                color={textColorSecondary}
                fontSize={{ sm: '10px', lg: '12px' }}
                fontWeight='700'
                textTransform='uppercase'
                isNumeric
              >
                CTR
              </Th>
              <Th
                borderColor={borderColor}
                color={textColorSecondary}
                fontSize={{ sm: '10px', lg: '12px' }}
                fontWeight='700'
                textTransform='uppercase'
                isNumeric
              >
                지출금액
              </Th>
              <Th
                borderColor={borderColor}
                color={textColorSecondary}
                fontSize={{ sm: '10px', lg: '12px' }}
                fontWeight='700'
                textTransform='uppercase'
                isNumeric
              >
                전환수
              </Th>
              <Th
                borderColor={borderColor}
                color={textColorSecondary}
                fontSize={{ sm: '10px', lg: '12px' }}
                fontWeight='700'
                textTransform='uppercase'
                isNumeric
              >
                ROAS
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {dailyData.map((row, index) => (
              <Tr
                key={row.date}
                bg={index % 2 === 0 ? 'transparent' : bgHover}
                _hover={{ bg: bgHover }}
              >
                <Td borderColor={borderColor} fontSize='sm' fontWeight='500' color={textColor}>
                  {row.date}
                </Td>
                <Td borderColor={borderColor} fontSize='sm' fontWeight='700' color={textColor} isNumeric>
                  {Math.round(row.impressions).toLocaleString()}
                </Td>
                <Td borderColor={borderColor} fontSize='sm' fontWeight='700' color={textColor} isNumeric>
                  {Math.round(row.clicks).toLocaleString()}
                </Td>
                <Td borderColor={borderColor} fontSize='sm' fontWeight='700' color={textColor} isNumeric>
                  {row.ctr.toFixed(2)}%
                </Td>
                <Td borderColor={borderColor} fontSize='sm' fontWeight='700' color={textColor} isNumeric>
                  ₩{Math.round(row.cost).toLocaleString()}
                </Td>
                <Td borderColor={borderColor} fontSize='sm' fontWeight='700' color={textColor} isNumeric>
                  {Math.round(row.conversions).toLocaleString()}
                </Td>
                <Td borderColor={borderColor} fontSize='sm' fontWeight='700' color={textColor} isNumeric>
                  {Math.round(row.roas)}%
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Card>
  );
}
