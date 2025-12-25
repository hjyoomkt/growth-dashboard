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

// Chakra imports
import {
  Box,
  SimpleGrid,
  Text,
  useColorModeValue,
  Icon,
} from "@chakra-ui/react";
import MiniStatistics from "components/card/MiniStatistics";
import IconBox from "components/icons/IconBox";
import React from "react";
import {
  MdPeople,
  MdSecurity,
  MdBarChart,
} from "react-icons/md";

export default function SuperAdminDashboard() {
  const brandColor = useColorModeValue("brand.500", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const textColor = useColorModeValue("secondaryGray.900", "white");

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Text
        color={textColor}
        fontSize="2xl"
        fontWeight="700"
        mb="20px"
      >
        관리자 대시보드
      </Text>

      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 3, "2xl": 3 }}
        gap='20px'
        mb='20px'>
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdPeople} color={brandColor} />
              }
            />
          }
          name='총 사용자'
          value='152'
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdSecurity} color={brandColor} />
              }
            />
          }
          name='관리자 계정'
          value='5'
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdBarChart} color={brandColor} />
              }
            />
          }
          name='활성 사용자'
          value='148'
        />
      </SimpleGrid>

      <Box
        bg={useColorModeValue("white", "navy.700")}
        p="20px"
        borderRadius="20px"
        mt="20px"
      >
        <Text color={textColor} fontSize="lg" fontWeight="700" mb="10px">
          관리자 기능
        </Text>
        <Text color={textColor} fontSize="sm">
          왼쪽 사이드바에서 회원 관리, 권한 관리 등의 메뉴를 이용할 수 있습니다.
        </Text>
        <Text color={textColor} fontSize="sm" mt="10px">
          Home 버튼을 클릭하면 메인 대시보드로 돌아갑니다.
        </Text>
      </Box>
    </Box>
  );
}
