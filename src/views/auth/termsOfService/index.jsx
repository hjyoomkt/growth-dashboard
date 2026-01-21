import React from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  Container,
  Divider,
  UnorderedList,
  ListItem,
  useColorModeValue,
} from '@chakra-ui/react';
import { NavLink } from 'react-router-dom';

function TermsOfService() {
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
              서비스 이용약관
            </Heading>
            <Text fontSize="14px" color={secondaryTextColor}>
              최종 수정일: 2026-01-21
            </Text>
          </Box>

          {/* Content */}
          <Box bg={bgColor} borderRadius="16px" p={{ base: '24px', md: '40px' }} boxShadow="sm">
            <VStack spacing="32px" align="stretch">
              {/* 1. 소개 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  1. 소개
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8">
                  본 약관은 앱 이름: <strong>Zestdot</strong> (이하 "제스트닷")의 이용 조건과 정책을 규정합니다.
                  서비스를 이용하는 모든 사용자는 본 약관에 동의한 것으로 간주됩니다.
                </Text>
              </Box>

              <Divider />

              {/* 2. 서비스 내용 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  2. 서비스 내용
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  서비스는 사용자가 자신의 광고 계정(Google Ads, Meta Ads 등) 데이터를 안전하게 연결하고 관리할 수 있도록 지원하는 SaaS 플랫폼입니다.
                </Text>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" fontWeight="600" mb="8px">
                  주요 기능:
                </Text>
                <UnorderedList pl="24px" spacing="8px">
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    OAuth 인증을 통한 광고 계정 연동
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    광고 데이터 수집 및 통합 관리
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    계정별 접근 권한 관리
                  </ListItem>
                </UnorderedList>
              </Box>

              <Divider />

              {/* 3. 사용자 계정 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  3. 사용자 계정
                </Heading>
                <UnorderedList pl="24px" spacing="12px">
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    사용자는 정확한 정보를 제공하고, 계정 정보를 안전하게 관리해야 합니다.
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    사용자는 본인의 계정 및 인증 정보 사용에 대한 책임이 있습니다.
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    계정이 무단으로 사용되거나 보안 위반이 발생한 경우 즉시 서비스 관리자에게 알려야 합니다.
                  </ListItem>
                </UnorderedList>
              </Box>

              <Divider />

              {/* 4. 데이터 접근 및 권한 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  4. 데이터 접근 및 권한
                </Heading>
                <UnorderedList pl="24px" spacing="12px">
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    서비스는 Google, Meta 등 외부 플랫폼 OAuth를 통해 필요한 범위(scope)의 권한을 요청합니다.
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    서비스는 수집된 데이터(access token, refresh token 등)를 안전하게 암호화 및 저장하며, 사용자의 동의 없이 제3자에게 제공하지 않습니다.
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    사용자는 OAuth 권한을 언제든지 취소할 수 있으며, 취소 시 일부 서비스 기능이 제한될 수 있습니다.
                  </ListItem>
                </UnorderedList>
              </Box>

              <Divider />

              {/* 5. 개인정보 보호 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  5. 개인정보 보호
                </Heading>
                <UnorderedList pl="24px" spacing="12px">
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    서비스는 개인정보 처리방침에 따라 사용자 데이터를 수집, 이용, 보관합니다.
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    민감 정보(이메일, 계정 ID, 광고 계정 데이터 등)는 안전하게 암호화하여 저장합니다.
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    개인정보 처리방침은{' '}
                    <Text
                      as={NavLink}
                      to="/auth/privacy-policy"
                      color="brand.500"
                      fontWeight="600"
                      textDecoration="underline"
                      _hover={{ color: 'brand.600' }}
                    >
                      개인정보 처리방침
                    </Text>
                    을 참조합니다.
                  </ListItem>
                </UnorderedList>
              </Box>

              <Divider />

              {/* 6. 금지 행위 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  6. 금지 행위
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  사용자는 다음 행위를 해서는 안 됩니다:
                </Text>
                <UnorderedList pl="24px" spacing="12px">
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    불법적이거나 무단으로 데이터를 수집 또는 이용하는 행위
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    타인의 계정 또는 정보를 무단으로 접근 또는 공유하는 행위
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    서비스의 정상적 운영을 방해하는 행위
                  </ListItem>
                </UnorderedList>
              </Box>

              <Divider />

              {/* 7. 책임 제한 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  7. 책임 제한
                </Heading>
                <UnorderedList pl="24px" spacing="12px">
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    서비스는 외부 광고 플랫폼 데이터의 정확성, 가용성, 지속성을 보장하지 않습니다.
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    사용자가 서비스 이용으로 발생한 손해에 대해 서비스는 법적 책임을 지지 않습니다.
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    서비스의 오류, 일시적 장애, 계정 연동 실패에 대해서도 책임을 지지 않습니다.
                  </ListItem>
                </UnorderedList>
              </Box>

              <Divider />

              {/* 8. 서비스 변경 및 종료 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  8. 서비스 변경 및 종료
                </Heading>
                <UnorderedList pl="24px" spacing="12px">
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    서비스는 예고 없이 기능을 추가, 변경, 중단할 수 있습니다.
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    사용자는 서비스 변경으로 발생한 불이익에 대해 서비스에 책임을 묻지 않습니다.
                  </ListItem>
                </UnorderedList>
              </Box>

              <Divider />

              {/* 9. 약관 변경 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  9. 약관 변경
                </Heading>
                <UnorderedList pl="24px" spacing="12px">
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    서비스는 필요시 본 약관을 변경할 수 있으며, 변경 내용은 웹사이트에 공지합니다.
                  </ListItem>
                  <ListItem fontSize="16px" color={textColor} lineHeight="1.8">
                    사용자가 변경된 약관을 계속 이용하면 변경된 약관에 동의한 것으로 간주됩니다.
                  </ListItem>
                </UnorderedList>
              </Box>

              <Divider />

              {/* 10. 문의 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  10. 문의
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  서비스 이용 관련 문의는 아래 연락처로 가능합니다.
                </Text>
                <VStack align="stretch" spacing="8px" pl="16px">
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>이메일:</strong> support@zestdot.com
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>홈페이지:</strong> https://www.zestdot.com
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

export default TermsOfService;
