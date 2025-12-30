import {
  Box,
  Heading,
  Text,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";

export default function MasterSettings() {
  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Heading size="lg" mb="8px">
        System Settings
      </Heading>
      <Text fontSize="md" color="gray.600" mb="24px">
        시스템 전체 설정을 관리할 수 있습니다.
      </Text>

      <Card p="30px">
        <Text>TODO: 시스템 설정 구현</Text>
      </Card>
    </Box>
  );
}
