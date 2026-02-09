import React from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  Container,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import { NavLink } from 'react-router-dom';

function DataDeletion() {
  const textColor = useColorModeValue('navy.700', 'white');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const bgColor = useColorModeValue('white', 'navy.800');

  return (
    <Box
      minH="100vh"
      bg={useColorModeValue('gray.50', 'navy.900')}
      py={{ base: '60px', md: '80px' }}
    >
      <Container maxW="800px">
        <VStack spacing="32px" align="stretch">
          {/* Header */}
          <Box>
            <Heading
              as="h1"
              fontSize={{ base: '28px', md: '36px' }}
              fontWeight="700"
              color={textColor}
              mb="16px"
            >
              데이터 삭제 요청 안내
            </Heading>
            <Text fontSize="14px" color={secondaryTextColor}>
              Data Deletion Instructions
            </Text>
          </Box>

          {/* Content */}
          <Box bg={bgColor} borderRadius="16px" p={{ base: '24px', md: '40px' }} boxShadow="sm">
            <VStack spacing="32px" align="stretch">
              {/* 소개 */}
              <Box>
                <Text fontSize="16px" color={textColor} lineHeight="1.8">
                  본 서비스는 Meta(Facebook) API를 통해 광고 성과 분석 및 마케팅 대시보드 제공을 목적으로 일부 데이터를 수집·처리합니다.
                </Text>
              </Box>

              <Divider />

              {/* 1. 수집되는 데이터 항목 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 1. 수집되는 데이터 항목
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  본 앱은 다음과 같은 데이터를 수집할 수 있습니다.
                </Text>
                <VStack align="stretch" spacing="8px" pl="16px">
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - Meta 광고 계정 ID
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - 캠페인 / 광고 세트 / 광고 단위 정보
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - 노출수, 클릭수, 전환수, 광고비 등 광고 성과 데이터
                  </Text>
                </VStack>
                <Text fontSize="16px" color={secondaryTextColor} lineHeight="1.8" mt="12px" fontStyle="italic">
                  ※ 본 서비스는 이름, 전화번호, 주민등록번호 등 개인을 직접 식별할 수 있는 정보는 수집하지 않습니다.
                </Text>
              </Box>

              <Divider />

              {/* 2. 데이터 사용 목적 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 2. 데이터 사용 목적
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  수집된 데이터는 다음 목적에 한해 사용됩니다.
                </Text>
                <VStack align="stretch" spacing="8px" pl="16px">
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - 광고 성과 분석 및 리포트 제공
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - 마케팅 대시보드 내 시각화 및 통계 분석
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - 광고 효율 개선을 위한 내부 분석
                  </Text>
                </VStack>
              </Box>

              <Divider />

              {/* 3. 데이터 삭제 요청 방법 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 3. 데이터 삭제 요청 방법
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="16px">
                  사용자는 아래 두 가지 방법을 통해 언제든지 데이터 삭제를 요청할 수 있습니다.
                </Text>

                {/* ① 대시보드 내 직접 삭제 */}
                <Box mb="24px">
                  <Text fontSize="18px" fontWeight="600" color={textColor} lineHeight="1.8" mb="8px">
                    ① 대시보드 내 직접 삭제 (회원 탈퇴 / 브랜드 삭제)
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                    사용자가 대시보드 내에서 회원 탈퇴 또는 브랜드 삭제를 진행하는 경우,
                    해당 계정 및 브랜드와 연동된 모든 데이터는 즉시 삭제 처리 대상이 됩니다.
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="8px">
                    삭제 대상 데이터에는 다음 항목이 포함됩니다.
                  </Text>
                  <VStack align="stretch" spacing="8px" pl="16px">
                    <Text fontSize="16px" color={textColor} lineHeight="1.8">
                      - 사용자 계정 정보
                    </Text>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8">
                      - 연결된 Meta 광고 계정 정보
                    </Text>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8">
                      - 해당 브랜드와 관련된 모든 광고 성과 데이터
                    </Text>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8">
                      - 대시보드 내 생성된 리포트 및 분석 데이터
                    </Text>
                  </VStack>
                  <Text fontSize="16px" color={secondaryTextColor} lineHeight="1.8" mt="12px" fontStyle="italic">
                    회원 탈퇴 또는 브랜드 삭제가 완료되면, 해당 데이터는 복구가 불가능하며 서비스 이용도 즉시 중단됩니다.
                  </Text>
                </Box>

                {/* ② 이메일을 통한 데이터 삭제 요청 */}
                <Box>
                  <Text fontSize="18px" fontWeight="600" color={textColor} lineHeight="1.8" mb="8px">
                    ② 이메일을 통한 데이터 삭제 요청
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                    대시보드 접근이 어려운 경우, 이메일을 통해서도 데이터 삭제를 요청할 수 있습니다.
                  </Text>
                  <VStack align="stretch" spacing="8px" pl="16px">
                    <Text fontSize="16px" color={textColor} lineHeight="1.8">
                      <strong>삭제 요청 메일 발송처</strong>
                    </Text>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8">
                      이메일 주소: support@zestdot.com
                    </Text>
                  </VStack>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8" mt="12px" mb="8px">
                    <strong>요청 시 포함 사항</strong>
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="8px">
                    원활한 처리를 위해 아래 정보를 함께 전달해 주세요.
                  </Text>
                  <VStack align="stretch" spacing="8px" pl="16px">
                    <Text fontSize="16px" color={textColor} lineHeight="1.8">
                      - Meta 광고 계정 ID
                    </Text>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8">
                      - 서비스 이용 시 사용한 이메일 주소
                    </Text>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8">
                      - 데이터 삭제 요청 내용
                    </Text>
                  </VStack>
                </Box>
              </Box>

              <Divider />

              {/* 4. 데이터 삭제 처리 기간 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 4. 데이터 삭제 처리 기간
                </Heading>
                <VStack align="stretch" spacing="12px" pl="16px">
                  <Box>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8" fontWeight="600" mb="4px">
                      ○ 대시보드 내 회원 탈퇴 또는 브랜드 삭제:
                    </Text>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8" pl="16px">
                      요청 즉시 삭제 처리
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8" fontWeight="600" mb="4px">
                      ○ 이메일을 통한 삭제 요청:
                    </Text>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8" pl="16px">
                      본인 확인 절차 후 영업일 기준 7일 이내 삭제 처리
                    </Text>
                  </Box>
                </VStack>
                <Text fontSize="16px" color={secondaryTextColor} lineHeight="1.8" mt="12px" fontStyle="italic">
                  단, 관계 법령에 따라 보관이 필요한 데이터가 있는 경우 해당 데이터는 법적 보관 기간 동안 안전하게 저장된 후 파기됩니다.
                </Text>
              </Box>

              <Divider />

              {/* 5. 문의 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 5. 문의
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  데이터 보호 및 삭제와 관련된 문의는 아래 이메일로 연락 주시기 바랍니다.
                </Text>
                <VStack align="stretch" spacing="8px" pl="16px">
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>이메일:</strong> support@zestdot.com
                  </Text>
                </VStack>
              </Box>
            </VStack>
          </Box>

          {/* Back to Home Link */}
          <Box textAlign="center">
            <Text
              as={NavLink}
              to="/"
              fontSize="14px"
              color="brand.500"
              fontWeight="600"
              _hover={{ textDecoration: 'underline' }}
            >
              ← 홈으로 돌아가기
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

export default DataDeletion;
