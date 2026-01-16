// Chakra imports
import {
  Box,
  Flex,
  Text,
  useColorModeValue,
  SimpleGrid,
  Icon,
  Spinner,
  Center,
} from "@chakra-ui/react";
import Card from "components/card/Card";
import React, { useState, useEffect } from "react";
import { MdBusiness } from "react-icons/md";
import BrandCard from "./components/BrandCard";
import { useAuth } from "contexts/AuthContext";
import { supabase } from "config/supabase";

export default function BrandManagement() {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const { user, advertiserId, role, organizationId, organizationType } = useAuth();
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        setIsLoading(true);
        console.log('[BrandsManagement] 브랜드 조회 시작:', {
          organizationType,
          organizationId,
          role,
          user: user?.id
        });

        let advertisers;

        // agency 계정: 조직이 소유한 모든 브랜드 조회
        if (organizationType === 'agency' && organizationId) {
          console.log('[BrandsManagement] Agency 모드: organization_id로 조회');
          const { data, error } = await supabase
            .from('advertisers')
            .select(`
              id,
              name,
              business_number,
              website_url,
              contact_email,
              contact_phone,
              created_at,
              organization_id,
              organizations (
                name
              )
            `)
            .eq('organization_id', organizationId);

          if (error) throw error;
          advertisers = data;
          console.log('[BrandsManagement] Agency 브랜드 조회 결과:', advertisers);
        } else {
          // advertiser 계정: 사용자가 속한 브랜드들 조회
          console.log('[BrandsManagement] Advertiser 모드: user_advertisers로 조회');
          const { data: userAdvertisers, error: userAdvError } = await supabase
            .from('user_advertisers')
            .select('advertiser_id')
            .eq('user_id', user.id);

          if (userAdvError) throw userAdvError;

          const advertiserIds = userAdvertisers.map(ua => ua.advertiser_id);

          if (advertiserIds.length === 0) {
            setBrands([]);
            return;
          }

          // 브랜드 상세 정보 조회
          const { data, error: advError } = await supabase
            .from('advertisers')
            .select(`
              id,
              name,
              business_number,
              website_url,
              contact_email,
              contact_phone,
              created_at,
              organization_id,
              organizations (
                name
              )
            `)
            .in('id', advertiserIds);

          if (advError) throw advError;
          advertisers = data;
          console.log('[BrandsManagement] Advertiser 브랜드 조회 결과:', advertisers);
        }

        if (!advertisers) {
          console.log('[BrandsManagement] 브랜드 없음');
          setBrands([]);
          return;
        }

        // BrandCard 형식으로 변환
        const formattedBrands = advertisers.map(adv => ({
          id: adv.id,
          name: adv.name,
          organizationName: adv.organizations?.name || "-",
          businessNumber: adv.business_number || "-",
          contactEmail: adv.contact_email || "-",
          contactPhone: adv.contact_phone || "-",
          websiteUrl: adv.website_url || "-",
          status: "active",
          createdAt: adv.created_at ? new Date(adv.created_at).toISOString().split('T')[0].replace(/-/g, '.') : "-",
          role: "advertiser_admin"
        }));

        console.log('[BrandsManagement] 최종 브랜드 데이터:', formattedBrands);
        setBrands(formattedBrands);
      } catch (error) {
        console.error('[BrandsManagement] 브랜드 조회 실패:', error);
        setBrands([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchBrands();
    }
  }, [user, advertiserId, role, organizationId, organizationType]);

  if (isLoading) {
    return (
      <Center h="400px">
        <Spinner size="xl" />
      </Center>
    );
  }

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
