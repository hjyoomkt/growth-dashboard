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

function PrivacyPolicy() {
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
              개인정보 처리방침
            </Heading>
            <Text fontSize="14px" color={secondaryTextColor}>
              시행일자: 2026.01.01
            </Text>
          </Box>

          {/* Content */}
          <Box bg={bgColor} borderRadius="16px" p={{ base: '24px', md: '40px' }} boxShadow="sm">
            <VStack spacing="32px" align="stretch">
              {/* 소개 */}
              <Box>
                <Text fontSize="16px" color={textColor} lineHeight="1.8">
                  '제스트닷'은 (이하 '회사'는) 고객님의 개인정보를 중요시하며, "정보통신망 이용촉진 및 정보보호"에 관한 법률을 준수하고 있습니다.
                  회사는 개인정보취급방침을 통하여 고객님께서 제공하시는 개인정보가 어떠한 용도와 방식으로 이용되고 있으며,
                  개인정보보호를 위해 어떠한 조치가 취해지고 있는지 알려드립니다.
                </Text>
              </Box>

              <Box>
                <Text fontSize="16px" color={textColor} lineHeight="1.8">
                  회사는 개인정보취급방침을 개정하는 경우 웹사이트 공지사항(또는 개별공지)을 통하여 공지할 것입니다.
                </Text>
              </Box>

              <Divider />

              {/* 수집하는 개인정보 항목 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 수집하는 개인정보 항목
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  회사는 회원가입, 상담, 서비스 신청 등등을 위해 아래와 같은 개인정보를 수집하고 있습니다.
                </Text>
                <VStack align="stretch" spacing="8px" pl="16px">
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>○ 수집항목:</strong> 이름, 생년월일, 휴대전화번호, 이메일
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>○ 개인정보 수집방법:</strong> 홈페이지(회원가입)
                  </Text>
                </VStack>
              </Box>

              <Divider />

              {/* 개인정보의 수집 및 이용목적 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 개인정보의 수집 및 이용목적
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.
                </Text>
                <VStack align="stretch" spacing="8px" pl="16px">
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>○ 서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산</strong>
                    <br />
                    구매 및 요금 결제, 물품배송 또는 청구서 등 발송
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>○ 회원 관리</strong>
                    <br />
                    개인 식별, 만14세 미만 아동 개인정보 수집 시 법정 대리인 동의여부 확인
                  </Text>
                </VStack>
              </Box>

              <Divider />

              {/* 개인정보의 보유 및 이용기간 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 개인정보의 보유 및 이용기간
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8">
                  회사는 개인정보 수집 및 이용목적이 달성된 후에는 예외 없이 해당 정보를 지체 없이 파기합니다.
                </Text>
              </Box>

              <Divider />

              {/* 개인정보의 파기절차 및 방법 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 개인정보의 파기절차 및 방법
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체없이 파기합니다. 파기절차 및 방법은 다음과 같습니다.
                </Text>
                <VStack align="stretch" spacing="12px" pl="16px">
                  <Box>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8" fontWeight="600" mb="8px">
                      ○ 파기절차
                    </Text>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8">
                      회원님이 회원가입 등을 위해 입력하신 정보는 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함)
                      내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라(보유 및 이용기간 참조) 일정 기간 저장된 후 파기되어집니다.
                      별도 DB로 옮겨진 개인정보는 법률에 의한 경우가 아니고서는 보유되어지는 이외의 다른 목적으로 이용되지 않습니다.
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8" fontWeight="600" mb="8px">
                      ○ 파기방법
                    </Text>
                    <Text fontSize="16px" color={textColor} lineHeight="1.8">
                      - 전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.
                    </Text>
                  </Box>
                </VStack>
              </Box>

              <Divider />

              {/* 개인정보 제공 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 개인정보 제공
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.
                </Text>
                <VStack align="stretch" spacing="8px" pl="16px">
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - 이용자들이 사전에 동의한 경우
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우
                  </Text>
                </VStack>
              </Box>

              <Divider />

              {/* 수집한 개인정보의 위탁 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 수집한 개인정보의 위탁
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8">
                  회사는 고객님의 동의없이 고객님의 정보를 외부 업체에 위탁하지 않습니다.
                  향후 그러한 필요가 생길 경우, 위탁 대상자와 위탁 업무 내용에 대해 고객님에게 통지하고 필요한 경우 사전 동의를 받도록 하겠습니다.
                </Text>
              </Box>

              <Divider />

              {/* 이용자 및 법정대리인의 권리와 그 행사방법 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 이용자 및 법정대리인의 권리와 그 행사방법
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8">
                  이용자 및 법정 대리인은 언제든지 등록되어 있는 자신 혹은 당해 만 14세 미만 아동의 개인정보를 조회하거나 수정할 수 있으며 가입해지를 요청할 수도 있습니다.
                  이용자 혹은 만 14세 미만 아동의 개인정보 조회·수정을 위해서는 '개인정보변경'(또는 '회원정보수정' 등)을 가입해지(동의철회)를 위해서는 "회원탈퇴"를 클릭하여
                  본인 확인 절차를 거치신 후 직접 열람, 정정 또는 탈퇴가 가능합니다. 혹은 개인정보관리책임자에게 서면, 전화 또는 이메일로 연락하시면 지체없이 조치하겠습니다.
                </Text>
              </Box>

              <Divider />

              {/* 개인정보 자동수집 장치의 설치 및 그 거부에 관한 사항 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 개인정보 자동수집 장치의 설치 및 그 거부에 관한 사항
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8">
                  회사는 개인정보 저장을 위한 쿠키(Cookie)를 사용하지 않습니다.
                </Text>
              </Box>

              <Divider />

              {/* 개인정보에 관한 민원서비스 */}
              <Box>
                <Heading as="h2" fontSize="22px" fontWeight="700" color={textColor} mb="16px">
                  ■ 개인정보에 관한 민원서비스
                </Heading>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  회사는 고객의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 관련 부서 및 개인정보관리책임자를 지정하고 있습니다.
                </Text>
                <VStack align="stretch" spacing="8px" pl="16px" mb="16px">
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>고객서비스담당 부서:</strong> 마케팅사업부
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>전화번호:</strong> 010-6425-2654
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>이메일:</strong> zestdot@zestdot.com
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8" mt="12px">
                    <strong>개인정보보호책임자 성명:</strong> 유현종
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>전화번호:</strong> 010-6425-2654
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    <strong>이메일:</strong> zestdot@zestdot.com
                  </Text>
                </VStack>
                <Text fontSize="16px" color={textColor} lineHeight="1.8" mb="12px">
                  귀하께서는 회사의 서비스를 이용하시며 발생하는 모든 개인정보보호 관련 민원을 개인정보관리책임자 혹은 담당부서로 신고하실 수 있습니다.
                  회사는 이용자들의 신고사항에 대해 신속하게 충분한 답변을 드릴 것입니다.
                </Text>
                <Text fontSize="16px" color={textColor} lineHeight="1.8">
                  기타 개인정보침해에 대한 신고나 상담이 필요하신 경우에는 아래 기관에 문의하시기 바랍니다.
                </Text>
                <VStack align="stretch" spacing="8px" pl="16px" mt="12px">
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - 개인분쟁조정위원회 (www.1336.or.kr / 1336)
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - 정보보호마크인증위원회 (www.eprivacy.or.kr / 02-580-0533~4)
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - 대검찰청 인터넷범죄수사센터 (http://icic.sppo.go.kr / 02-3480-3600)
                  </Text>
                  <Text fontSize="16px" color={textColor} lineHeight="1.8">
                    - 경찰청 사이버테러대응센터 (www.ctrc.go.kr / 02-392-0330)
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

export default PrivacyPolicy;
