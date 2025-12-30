import {
  Box,
  Text,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Icon,
  Flex,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import React from "react";
import { MdCheckCircle, MdOutlineError, MdSchedule } from "react-icons/md";
import { useAuth } from "contexts/AuthContext";
import { isAfter10AM } from "utils/dataCollectionChecker";

export default function APIStatus(props) {
  const { ...rest } = props;
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = "gray.400";
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const { addApiNotification } = useAuth();

  // TODO: Supabase 연동 시 실제 데이터 가져오기
  // 현재는 Mock 데이터
  const apiTokens = [
    {
      id: 1,
      advertiser: '나이키',
      platform: 'Google Ads',
      lastUpdated: '2024.12.01',
      dataCollectionStatus: 'success',
    },
    {
      id: 2,
      advertiser: '아디다스',
      platform: 'Meta Ads',
      lastUpdated: '2024.11.28',
      dataCollectionStatus: 'error',
    },
    {
      id: 3,
      advertiser: '페퍼툭스',
      platform: 'Naver Ads',
      lastUpdated: '2024.11.15',
      dataCollectionStatus: 'pending',
    },
  ];

  // 오전 10시 이후 오류 체크 및 알림 생성
  React.useEffect(() => {
    if (!isAfter10AM()) return;

    // TODO: Supabase 연동 시 실제 데이터로 교체
    const errorTokens = apiTokens.filter(token => token.dataCollectionStatus === 'error');

    errorTokens.forEach(token => {
      // 중복 알림 방지를 위해 오늘 날짜 + advertiser + platform으로 체크
      const today = new Date().toISOString().split('T')[0];
      const notificationKey = `api-error-${today}-${token.advertiser}-${token.platform}`;

      // localStorage에 이미 알림을 보낸 기록이 있는지 확인
      if (!localStorage.getItem(notificationKey)) {
        addApiNotification({
          type: 'error',
          title: 'API 데이터 수집 오류',
          message: `${token.advertiser}의 ${token.platform} 데이터 수집에 실패했습니다. (최종 업데이트: ${token.lastUpdated})`,
          advertiser: token.advertiser,
          platform: token.platform,
        });

        // 알림 생성 기록 저장
        localStorage.setItem(notificationKey, 'true');
      }
    });

    // 자정이 지나면 localStorage 초기화 (다음날 다시 알림 받도록)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    const midnightTimer = setTimeout(() => {
      // 어제 날짜의 알림 기록 삭제
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = yesterday.toISOString().split('T')[0];

      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('api-error-') && key.includes(yesterdayKey)) {
          localStorage.removeItem(key);
        }
      });
    }, timeUntilMidnight);

    return () => clearTimeout(midnightTimer);
  }, [addApiNotification]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStatusDisplay = (status) => {
    switch (status) {
      case 'success':
        return {
          icon: MdCheckCircle,
          color: 'green.500',
          label: '정상',
          badgeColor: 'green',
        };
      case 'error':
        return {
          icon: MdOutlineError,
          color: 'red.500',
          label: '오류',
          badgeColor: 'red',
        };
      case 'pending':
        return {
          icon: MdSchedule,
          color: 'orange.500',
          label: '대기',
          badgeColor: 'orange',
        };
      default:
        return {
          icon: MdSchedule,
          color: 'gray.500',
          label: '알 수 없음',
          badgeColor: 'gray',
        };
    }
  };

  return (
    <Card mb={{ base: "0px", "2xl": "20px" }} display="flex" flexDirection="column" {...rest}>
      <Box p="20px">
        <Text
          color={textColor}
          fontWeight="700"
          fontSize="lg"
          mb="5px"
        >
          API 연동 상태
        </Text>
        <Text color={textColorSecondary} fontSize="sm" mb="20px">
          광고 플랫폼별 데이터 수집 상태를 확인합니다
        </Text>
      </Box>

      <Box flex="1" overflowY="auto" px="20px" pb="20px">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th borderColor={borderColor} color="gray.400" fontSize="xs">
                광고주
              </Th>
              <Th borderColor={borderColor} color="gray.400" fontSize="xs">
                플랫폼
              </Th>
              <Th borderColor={borderColor} color="gray.400" fontSize="xs">
                수정 상태
              </Th>
              <Th borderColor={borderColor} color="gray.400" fontSize="xs">
                수집 상태
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {apiTokens.map((token) => {
              const statusDisplay = getStatusDisplay(token.dataCollectionStatus);
              return (
                <Tr key={token.id}>
                  <Td borderColor={borderColor} fontSize="sm" color={textColor} fontWeight="600">
                    {token.advertiser}
                  </Td>
                  <Td borderColor={borderColor} fontSize="sm">
                    <Badge
                      colorScheme={
                        token.platform === 'Google Ads' ? 'red' :
                        token.platform === 'Meta Ads' ? 'purple' :
                        token.platform === 'Naver Ads' ? 'green' : 'gray'
                      }
                      fontSize="xs"
                      px="8px"
                      py="2px"
                      borderRadius="5px"
                    >
                      {token.platform}
                    </Badge>
                  </Td>
                  <Td borderColor={borderColor} fontSize="xs" color={textColorSecondary}>
                    {token.lastUpdated}
                  </Td>
                  <Td borderColor={borderColor}>
                    <Flex align="center">
                      <Icon
                        as={statusDisplay.icon}
                        w="18px"
                        h="18px"
                        color={statusDisplay.color}
                        mr="6px"
                      />
                      <Text color={textColor} fontSize="sm" fontWeight="600">
                        {statusDisplay.label}
                      </Text>
                    </Flex>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Card>
  );
}
