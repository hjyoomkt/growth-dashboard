// Chakra imports
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
  SimpleGrid,
  Icon,
} from "@chakra-ui/react";
import Card from "components/card/Card";
import React, { useState } from "react";
import { MdBusiness } from "react-icons/md";
import BrandCard from "./components/BrandCard";

export default function BrandManagement() {
  const textColor = useColorModeValue("secondaryGray.900", "white");

  // Mock 데이터 - TODO: Supabase에서 실제 데이터 가져오기
  // TODO: AuthContext의 availableAdvertisers를 사용하도록 변경
  const [brands] = useState([
    {
      id: "brand-1",
      name: "나이키 코리아",
      organizationName: "부밍 대행사",
      businessNumber: "123-45-67890",
      contactEmail: "contact@nike.kr",
      contactPhone: "02-1234-5678",
      status: "active",
      createdAt: "2024.01.15",
      role: "advertiser_admin"
    },
    {
      id: "brand-2",
      name: "아디다스 코리아",
      organizationName: "부밍 대행사",
      businessNumber: "987-65-43210",
      contactEmail: "info@adidas.kr",
      contactPhone: "02-8765-4321",
      status: "active",
      createdAt: "2024.02.20",
      role: "manager"
    }
  ]);

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex
        justify="space-between"
        align="center"
        mb="20px"
        px="25px"
      >
        <Box>
          <Text
            color={textColor}
            fontSize="2xl"
            fontWeight="700"
          >
            브랜드 관리
          </Text>
          <Text
            color="secondaryGray.600"
            fontSize="sm"
            mt="5px"
          >
            내가 속한 브랜드 목록입니다. 새 브랜드 추가는 대행사로부터 초대 코드를 받아 회원가입 시 진행할 수 있습니다.
          </Text>
        </Box>
      </Flex>

      {brands.length === 0 ? (
        <Card p="40px" textAlign="center">
          <Icon
            as={MdBusiness}
            w="80px"
            h="80px"
            color="secondaryGray.400"
            mx="auto"
            mb="20px"
          />
          <Text color={textColor} fontSize="xl" fontWeight="700" mb="10px">
            브랜드가 없습니다
          </Text>
          <Text color="secondaryGray.600" fontSize="sm" mb="20px">
            대행사로부터 초대 코드를 받아 회원가입을 진행하면 브랜드가 추가됩니다.
          </Text>
        </Card>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="20px" px="25px">
          {brands.map((brand) => (
            <BrandCard key={brand.id} brand={brand} />
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
}
