import {
  Box,
  Text,
  Badge,
  Flex,
  Icon,
  useColorModeValue,
  SimpleGrid,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  useDisclosure,
} from "@chakra-ui/react";
import Card from "components/card/Card";
import React, { useState } from "react";
import {
  MdBusiness,
  MdEmail,
  MdPhone,
  MdCalendarToday,
  MdVerifiedUser,
} from "react-icons/md";

// 간단한 브랜드 카드 컴포넌트
function SimpleBrandCard({ brand, onClick }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const brandColor = useColorModeValue("brand.500", "brand.400");
  const bgHover = useColorModeValue("secondaryGray.100", "whiteAlpha.100");

  return (
    <Card
      p="15px"
      cursor="pointer"
      transition="all 0.2s"
      _hover={{
        transform: "translateY(-2px)",
        shadow: "md",
        bg: bgHover,
      }}
      onClick={() => onClick(brand)}
    >
      <Flex align="center" justify="space-between">
        <Flex align="center">
          <Icon as={MdBusiness} w="20px" h="20px" color={brandColor} mr="10px" />
          <Text color={textColor} fontSize="md" fontWeight="600">
            {brand.name}
          </Text>
        </Flex>
        <Badge colorScheme="green" fontSize="xs">
          활성
        </Badge>
      </Flex>
    </Card>
  );
}

// 브랜드 상세 정보 모달
function BrandDetailModal({ isOpen, onClose, brand }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const brandColor = useColorModeValue("brand.500", "brand.400");
  const borderColor = useColorModeValue("secondaryGray.300", "whiteAlpha.200");

  if (!brand) return null;

  // Mock 데이터 - 실제로는 Supabase에서 가져와야 함
  const brandDetails = {
    organizationName: "부밍 대행사",
    businessNumber: "123-45-67890",
    contactEmail: `contact@${brand.name.toLowerCase().replace(/\s/g, '')}.com`,
    contactPhone: "02-1234-5678",
    status: "active",
    createdAt: "2024.01.15",
    role: "advertiser_admin"
  };

  const getRoleBadge = (role) => {
    const roleMap = {
      advertiser_admin: { label: "관리자", color: "purple" },
      manager: { label: "매니저", color: "blue" },
      editor: { label: "에디터", color: "green" },
      viewer: { label: "뷰어", color: "gray" },
    };
    return roleMap[role] || { label: role, color: "gray" };
  };

  const roleBadge = getRoleBadge(brandDetails.role);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing="10px">
            <Icon as={MdBusiness} w="24px" h="24px" color={brandColor} />
            <Text>{brand.name}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing="20px">
            {/* 상태 및 권한 */}
            <Flex gap="10px">
              <Badge colorScheme={roleBadge.color} fontSize="sm" px="10px" py="5px">
                {roleBadge.label}
              </Badge>
              {brandDetails.status === "active" && (
                <Badge colorScheme="green" fontSize="sm" px="10px" py="5px">
                  활성
                </Badge>
              )}
            </Flex>

            {/* 조직 정보 */}
            <Box>
              <HStack spacing="8px" mb="8px">
                <Icon as={MdVerifiedUser} w="18px" h="18px" color={textColorSecondary} />
                <Text color={textColor} fontSize="sm" fontWeight="600">
                  소속
                </Text>
              </HStack>
              <Text color={textColorSecondary} fontSize="md" pl="26px">
                {brandDetails.organizationName}
              </Text>
            </Box>

            {/* 사업자 번호 */}
            {brandDetails.businessNumber && (
              <Box>
                <Text color={textColor} fontSize="sm" fontWeight="600" mb="8px">
                  사업자등록번호
                </Text>
                <Text color={textColorSecondary} fontSize="md">
                  {brandDetails.businessNumber}
                </Text>
              </Box>
            )}

            {/* 연락처 정보 */}
            <Box>
              <Text color={textColor} fontSize="sm" fontWeight="600" mb="12px">
                연락처 정보
              </Text>
              <VStack align="stretch" spacing="12px">
                {brandDetails.contactEmail && (
                  <HStack spacing="10px">
                    <Icon as={MdEmail} w="18px" h="18px" color={textColorSecondary} />
                    <Text color={textColorSecondary} fontSize="md">
                      {brandDetails.contactEmail}
                    </Text>
                  </HStack>
                )}
                {brandDetails.contactPhone && (
                  <HStack spacing="10px">
                    <Icon as={MdPhone} w="18px" h="18px" color={textColorSecondary} />
                    <Text color={textColorSecondary} fontSize="md">
                      {brandDetails.contactPhone}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </Box>

            {/* 생성일 */}
            <Box pt="10px" borderTop="1px solid" borderColor={borderColor}>
              <HStack spacing="10px">
                <Icon as={MdCalendarToday} w="16px" h="16px" color={textColorSecondary} />
                <Text color={textColorSecondary} fontSize="sm">
                  {brandDetails.createdAt} 추가됨
                </Text>
              </HStack>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default function BrandsList({ brands = [], ...rest }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = useColorModeValue("secondaryGray.600", "secondaryGray.400");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedBrand, setSelectedBrand] = useState(null);

  const handleBrandClick = (brand) => {
    setSelectedBrand(brand);
    onOpen();
  };

  return (
    <>
      <Card mb={{ base: "0px", "2xl": "20px" }} display="flex" flexDirection="column" {...rest}>
        <Box p="20px">
          <Text color={textColor} fontSize="lg" fontWeight="700" mb="5px">
            담당 브랜드
          </Text>
          <Text color={textColorSecondary} fontSize="sm" mb="20px">
            현재 관리 중인 브랜드 목록입니다
          </Text>
        </Box>

        <Box flex="1" overflowY="auto" px="20px" pb="20px">
          {brands.length === 0 ? (
            <Box textAlign="center" py="20px">
              <Icon
                as={MdBusiness}
                w="40px"
                h="40px"
                color="secondaryGray.400"
                mx="auto"
                mb="10px"
              />
              <Text color={textColorSecondary} fontSize="sm">
                담당 브랜드가 없습니다
              </Text>
            </Box>
          ) : (
            <SimpleGrid columns={{ base: 1 }} gap="10px">
              {brands.map((brand, index) => (
                <SimpleBrandCard key={index} brand={brand} onClick={handleBrandClick} />
              ))}
            </SimpleGrid>
          )}
        </Box>
      </Card>

      <BrandDetailModal isOpen={isOpen} onClose={onClose} brand={selectedBrand} />
    </>
  );
}
