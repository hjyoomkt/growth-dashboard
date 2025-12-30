import React, { useState } from "react";
import {
  Box,
  Text,
  Button,
  useColorModeValue,
  Flex,
  Icon,
  Badge,
  Collapse,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from "@chakra-ui/react";
import { MdChevronRight, MdExpandMore, MdMoreVert, MdBusiness, MdStorefront } from "react-icons/md";

export default function AdvertisersTree({ onAddBrand }) {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const hoverBg = useColorModeValue("secondaryGray.100", "whiteAlpha.100");
  const orgBg = useColorModeValue("gray.50", "navy.800");
  const brandBg = useColorModeValue("white", "navy.900");

  // 확장/축소 상태 관리
  const [expandedOrgs, setExpandedOrgs] = useState({});

  // Mock 데이터 - 조직별 광고주(브랜드)
  const mockData = [
    {
      id: "org-booming",
      name: "부밍 대행사",
      type: "agency",
      advertisers: [
        { id: "adv-nike", name: "나이키", businessNumber: "123-45-67890", contactEmail: "contact@nike.com", contactPhone: "02-1234-5678", createdAt: "2024.01.15", status: "active" },
        { id: "adv-adidas", name: "아디다스", businessNumber: "234-56-78901", contactEmail: "contact@adidas.com", contactPhone: "02-2345-6789", createdAt: "2024.02.20", status: "active" },
        { id: "adv-siw", name: "시원스쿨", businessNumber: "345-67-89012", contactEmail: "contact@siwonschool.com", contactPhone: "02-3456-7890", createdAt: "2024.03.10", status: "active" },
        { id: "adv-kmong", name: "크몽", businessNumber: "456-78-90123", contactEmail: "contact@kmong.com", contactPhone: "02-4567-8901", createdAt: "2024.04.05", status: "active" },
      ]
    },
    {
      id: "org-pepper",
      name: "페퍼스 주식회사",
      type: "advertiser",
      advertisers: [
        { id: "adv-peppertux", name: "페퍼툭스", businessNumber: "567-89-01234", contactEmail: "contact@peppertux.com", contactPhone: "02-5678-9012", createdAt: "2024.02.01", status: "active" },
        { id: "adv-onnuri", name: "온누리스토어", businessNumber: "678-90-12345", contactEmail: "contact@onnuristore.com", contactPhone: "02-6789-0123", createdAt: "2024.03.15", status: "active" },
      ]
    },
  ];

  const toggleOrg = (orgId) => {
    setExpandedOrgs(prev => ({
      ...prev,
      [orgId]: !prev[orgId]
    }));
  };

  const handleEditBrand = (brand) => {
    console.log("Edit brand:", brand);
    // TODO: 브랜드 수정 모달 열기
  };

  const handleDeactivateBrand = (brand) => {
    if (window.confirm(`${brand.name} 브랜드를 비활성화하시겠습니까?`)) {
      console.log("Deactivate brand:", brand.id);
      // TODO: Supabase 연동
    }
  };

  return (
    <Box>
      <Text fontSize="xl" fontWeight="700" mb="20px" color={textColor}>
        조직별 광고주(브랜드) 트리
      </Text>

      {mockData.map((org) => {
        const isExpanded = expandedOrgs[org.id];

        return (
          <Box
            key={org.id}
            mb="16px"
            border="1px solid"
            borderColor={borderColor}
            borderRadius="12px"
            overflow="hidden"
          >
            {/* 조직 헤더 */}
            <Flex
              align="center"
              justify="space-between"
              p="16px"
              bg={orgBg}
              cursor="pointer"
              onClick={() => toggleOrg(org.id)}
              _hover={{ bg: hoverBg }}
              transition="all 0.2s"
            >
              <Flex align="center" gap="12px">
                <Icon
                  as={isExpanded ? MdExpandMore : MdChevronRight}
                  w="24px"
                  h="24px"
                  color={textColor}
                />
                <Icon
                  as={MdBusiness}
                  w="20px"
                  h="20px"
                  color={org.type === 'agency' ? 'purple.500' : 'blue.500'}
                />
                <Box>
                  <HStack spacing="8px" mb="4px">
                    <Text fontSize="md" fontWeight="700" color={textColor}>
                      {org.name}
                    </Text>
                    <Badge colorScheme={org.type === 'agency' ? 'purple' : 'blue'} fontSize="xs">
                      {org.type === 'agency' ? '대행사' : '광고주'}
                    </Badge>
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    브랜드 {org.advertisers.length}개
                  </Text>
                </Box>
              </Flex>

              <Button
                size="sm"
                colorScheme="brand"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddBrand(org.id);
                }}
              >
                + 브랜드 추가
              </Button>
            </Flex>

            {/* 광고주(브랜드) 목록 */}
            <Collapse in={isExpanded} animateOpacity>
              <Box p="16px" bg={brandBg}>
                {org.advertisers.length === 0 ? (
                  <Text fontSize="sm" color="gray.500" textAlign="center" py="20px">
                    등록된 브랜드가 없습니다.
                  </Text>
                ) : (
                  <Box>
                    {org.advertisers.map((brand, idx) => (
                      <Flex
                        key={brand.id}
                        align="center"
                        justify="space-between"
                        p="12px 16px"
                        mb={idx < org.advertisers.length - 1 ? "8px" : "0"}
                        border="1px solid"
                        borderColor={borderColor}
                        borderRadius="8px"
                        _hover={{ bg: hoverBg }}
                        transition="all 0.2s"
                      >
                        <Flex align="center" gap="12px" flex="1">
                          <Icon as={MdStorefront} w="18px" h="18px" color="brand.500" />
                          <Box flex="1">
                            <HStack spacing="8px" mb="4px">
                              <Text fontSize="sm" fontWeight="600" color={textColor}>
                                {brand.name}
                              </Text>
                              <Badge
                                colorScheme={brand.status === 'active' ? 'green' : 'gray'}
                                fontSize="xs"
                              >
                                {brand.status === 'active' ? '활성' : '비활성'}
                              </Badge>
                            </HStack>
                            <HStack spacing="16px" fontSize="xs" color="gray.500">
                              <Text>사업자: {brand.businessNumber}</Text>
                              <Text>이메일: {brand.contactEmail}</Text>
                              <Text>연락처: {brand.contactPhone}</Text>
                              <Text>생성일: {brand.createdAt}</Text>
                            </HStack>
                          </Box>
                        </Flex>

                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<Icon as={MdMoreVert} />}
                            variant="ghost"
                            size="sm"
                          />
                          <MenuList>
                            <MenuItem onClick={() => handleEditBrand(brand)}>
                              정보 수정
                            </MenuItem>
                            <MenuItem color="red.500" onClick={() => handleDeactivateBrand(brand)}>
                              비활성화
                            </MenuItem>
                          </MenuList>
                        </Menu>
                      </Flex>
                    ))}
                  </Box>
                )}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
}
