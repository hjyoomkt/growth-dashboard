// Chakra imports
import { Text, useColorModeValue } from "@chakra-ui/react";
// Assets
import Project1 from "assets/img/profile/Project1.png";
import Project2 from "assets/img/profile/Project2.png";
import Project3 from "assets/img/profile/Project3.png";
// Custom components
import Card from "components/card/Card.js";
import React, { useMemo } from "react";
import Project from "views/admin/profile/components/Project";
import { useAuth } from "contexts/AuthContext";

export default function Projects(props) {
  // Chakra Color Mode
  const textColorPrimary = useColorModeValue("secondaryGray.900", "white");
  const textColorSecondary = "gray.400";
  const cardShadow = useColorModeValue(
    "0px 18px 40px rgba(112, 144, 176, 0.12)",
    "unset"
  );

  const { availableAdvertisers, role, organizationType } = useAuth();

  // 사용자가 담당하고 있는 브랜드 목록
  const myBrands = useMemo(() => {
    // Master나 대행사 최고관리자/관리자는 모든 브랜드 접근 가능
    if (['master', 'org_admin', 'org_manager'].includes(role)) {
      return availableAdvertisers || [];
    }

    // 대행사 직원이나 브랜드 직원은 할당된 브랜드만
    // TODO: 실제로는 사용자별 할당된 브랜드 정보를 가져와야 함
    // 현재는 availableAdvertisers를 그대로 사용
    return availableAdvertisers || [];
  }, [availableAdvertisers, role]);

  // 브랜드별 이미지 (순환)
  const brandImages = [Project1, Project2, Project3];

  return (
    <Card mb={{ base: "0px", "2xl": "20px" }}>
      <Text
        color={textColorPrimary}
        fontWeight='bold'
        fontSize='2xl'
        mt='10px'
        mb='4px'>
        담당 브랜드
      </Text>
      <Text color={textColorSecondary} fontSize='md' me='26px' mb='40px'>
        {organizationType === 'agency'
          ? '현재 관리하고 있는 브랜드 목록입니다.'
          : '접근 가능한 브랜드 목록입니다.'}
      </Text>

      {myBrands.length > 0 ? (
        myBrands.map((brand, index) => (
          <Project
            key={brand.id}
            boxShadow={cardShadow}
            mb={index < myBrands.length - 1 ? '20px' : '0px'}
            image={brandImages[index % brandImages.length]}
            ranking={index + 1}
            link={`/admin/default?brand=${brand.id}`}
            title={brand.name}
          />
        ))
      ) : (
        <Text color={textColorSecondary} fontSize='sm'>
          할당된 브랜드가 없습니다.
        </Text>
      )}
    </Card>
  );
}
