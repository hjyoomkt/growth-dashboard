/*!
  _   _  ___  ____  ___ ________  _   _   _   _ ___
 | | | |/ _ \|  _ \|_ _|__  / _ \| \ | | | | | |_ _|
 | |_| | | | | |_) || |  / / | | |  \| | | | | || |
 |  _  | |_| |  _ < | | / /| |_| | |\  | | |_| || |
 |_| |_|\___/|_| \_\___/____\___/|_| \_|  \___/|___|

=========================================================
* Horizon UI - v1.1.0
=========================================================

* Product Page: https://www.horizon-ui.com/
* Copyright 2023 Horizon UI (https://www.horizon-ui.com/)

* Designed and Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

import {
  Box,
  SimpleGrid,
  Text,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import APITokenTable from 'views/superadmin/api-management/components/APITokenTable';
import CollectionMonitor from 'views/superadmin/api-management/components/CollectionMonitor';
import Card from 'components/card/Card';
import { useAuth } from 'contexts/AuthContext';
import { getApiTokens } from 'services/supabaseService';
import React, { useState, useEffect } from 'react';

export default function APIManagement() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const cardBg = useColorModeValue('white', 'navy.800');
  const { isAgency, advertiserId } = useAuth();

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    error: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const tokens = await getApiTokens(isAgency() ? null : advertiserId);
        const total = tokens.length;
        const active = tokens.filter(t => t.status === 'active').length;
        const inactive = tokens.filter(t => t.status === 'inactive').length;
        const error = tokens.filter(t => t.dataCollectionStatus === 'error').length;

        setStats({ total, active, inactive, error });
      } catch (error) {
        console.error('API 토큰 통계 조회 실패:', error);
      }
    };

    fetchStats();
  }, [isAgency, advertiserId]);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {/* Page Header */}
      <Box mb="20px" px="25px">
        <Text
          color={textColor}
          fontSize="2xl"
          fontWeight="700"
          lineHeight="100%"
          mb="10px"
        >
          API 토큰 관리
        </Text>
        <Text color="secondaryGray.600" fontSize="md" fontWeight="400">
          광고 플랫폼 API 토큰 및 계정 정보를 관리합니다.
        </Text>
      </Box>

      {/* Info Alert */}
      <Alert
        status="info"
        variant="subtle"
        borderRadius="15px"
        mb="20px"
        bg={useColorModeValue('blue.50', 'navy.700')}
      >
        <AlertIcon />
        <Box>
          <AlertTitle>{isAgency() ? '최고 관리자 전용 페이지' : '브랜드 API 토큰 관리'}</AlertTitle>
          <AlertDescription>
            {isAgency()
              ? '이 페이지는 최고 관리자만 접근할 수 있습니다. API 토큰은 암호화되어 Supabase에 저장되며, 코드 수정 없이 실시간으로 광고 데이터 수집에 반영됩니다. 매일 오전 10시를 기준으로 전일(D-1) 데이터 수집 상태를 자동으로 체크합니다.'
              : '본인 브랜드의 광고 플랫폼 API 토큰을 확인할 수 있습니다. API 토큰은 암호화되어 안전하게 저장되며, 광고 데이터 수집에 사용됩니다. 매일 오전 10시 기준으로 전일 데이터 수집 여부를 확인합니다.'}
          </AlertDescription>
        </Box>
      </Alert>

      {/* Statistics Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="20px" mb="20px">
        <Card bg={cardBg}>
          <Box p="20px">
            <Text color="secondaryGray.600" fontSize="sm" fontWeight="500" mb="8px">
              총 토큰 수
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="700">
              {stats.total}
            </Text>
          </Box>
        </Card>
        <Card bg={cardBg}>
          <Box p="20px">
            <Text color="secondaryGray.600" fontSize="sm" fontWeight="500" mb="8px">
              활성 토큰
            </Text>
            <Text color="green.500" fontSize="2xl" fontWeight="700">
              {stats.active}
            </Text>
          </Box>
        </Card>
        <Card bg={cardBg}>
          <Box p="20px">
            <Text color="secondaryGray.600" fontSize="sm" fontWeight="500" mb="8px">
              비활성 토큰
            </Text>
            <Text color="red.500" fontSize="2xl" fontWeight="700">
              {stats.inactive}
            </Text>
          </Box>
        </Card>
        <Card bg={cardBg}>
          <Box p="20px">
            <Text color="secondaryGray.600" fontSize="sm" fontWeight="500" mb="8px">
              오류 토큰
            </Text>
            <Text color="orange.500" fontSize="2xl" fontWeight="700">
              {stats.error}
            </Text>
          </Box>
        </Card>
      </SimpleGrid>

      {/* API Token Table */}
      <APITokenTable />

      {/* Collection Monitor */}
      <Box mt="20px">
        <CollectionMonitor />
      </Box>
    </Box>
  );
}
