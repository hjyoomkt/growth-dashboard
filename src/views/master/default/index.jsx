import {
  Box,
  SimpleGrid,
  Heading,
  Text,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Icon,
} from "@chakra-ui/react";
import { MdBusiness, MdPeople, MdAttachMoney, MdTrendingUp } from "react-icons/md";
import MiniStatistics from "components/card/MiniStatistics";
import IconBox from "components/icons/IconBox";
import Card from "components/card/Card.js";

export default function MasterDashboard() {
  const brandColor = useColorModeValue("brand.500", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");

  // TODO: Supabase에서 실제 데이터 가져오기
  const stats = {
    totalOrganizations: 127,
    totalUsers: 543,
    activeOrganizations: 115,
    monthlyRevenue: "$24,580",
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 4 }}
        gap="20px"
        mb="20px"
        mt="30px"
      >
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg={boxBg}
              icon={
                <Icon w="32px" h="32px" as={MdBusiness} color={brandColor} />
              }
            />
          }
          name="Total Organizations"
          value={stats.totalOrganizations}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg={boxBg}
              icon={
                <Icon w="32px" h="32px" as={MdPeople} color={brandColor} />
              }
            />
          }
          name="Total Users"
          value={stats.totalUsers}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg={boxBg}
              icon={
                <Icon w="32px" h="32px" as={MdTrendingUp} color={brandColor} />
              }
            />
          }
          name="Active Organizations"
          value={stats.activeOrganizations}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg={boxBg}
              icon={
                <Icon w="32px" h="32px" as={MdAttachMoney} color={brandColor} />
              }
            />
          }
          name="Monthly Revenue"
          value={stats.monthlyRevenue}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap="20px">
        <Card p="30px">
          <Heading size="md" mb="20px">
            Recent Organizations
          </Heading>
          <Text color="gray.600">
            최근 생성된 조직 목록이 여기에 표시됩니다.
          </Text>
          <Text fontSize="sm" color="gray.500" mt="20px">
            TODO: Organizations 테이블에서 데이터 가져오기
          </Text>
        </Card>

        <Card p="30px">
          <Heading size="md" mb="20px">
            System Health
          </Heading>
          <Stat>
            <StatLabel>Database Status</StatLabel>
            <StatNumber>Operational</StatNumber>
            <StatHelpText>All systems running smoothly</StatHelpText>
          </Stat>
        </Card>
      </SimpleGrid>
    </Box>
  );
}
