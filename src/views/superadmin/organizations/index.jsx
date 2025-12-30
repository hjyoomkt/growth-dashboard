import {
  Box,
  Heading,
  Text,
  Button,
  useDisclosure,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import OrganizationsTable from "./components/OrganizationsTable";
import CreateOrganizationModal from "./components/CreateOrganizationModal";

export default function OrganizationManagement() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb="24px" px="25px">
        <Box>
          <Heading size="lg" mb="8px">
            조직 관리
          </Heading>
          <Text fontSize="md" color="gray.600">
            광고주 및 대행사 조직을 관리할 수 있습니다.
          </Text>
        </Box>
        <Button colorScheme="brand" onClick={onOpen}>
          + 조직 생성
        </Button>
      </Box>

      <Card
        direction="column"
        w="100%"
        px="25px"
        py="25px"
        overflowX={{ sm: "scroll", lg: "hidden" }}
      >
        <OrganizationsTable />
      </Card>

      <CreateOrganizationModal isOpen={isOpen} onClose={onClose} />
    </Box>
  );
}
