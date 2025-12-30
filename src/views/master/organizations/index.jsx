import {
  Box,
  Heading,
  Text,
  Button,
  useColorModeValue,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import OrganizationsTable from "./components/OrganizationsTable";

export default function MasterOrganizations() {
  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Heading size="lg" mb="8px">
        Organizations Management
      </Heading>
      <Text fontSize="md" color="gray.600" mb="24px">
        모든 조직(광고주/대행사)를 관리할 수 있습니다.
      </Text>

      <Card
        direction="column"
        w="100%"
        px="25px"
        py="25px"
        overflowX={{ sm: "scroll", lg: "hidden" }}
      >
        <OrganizationsTable />
      </Card>
    </Box>
  );
}
