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
      <Card
        direction="column"
        w="100%"
        px="25px"
        py="25px"
        mt="30px"
        overflowX={{ sm: "scroll", lg: "hidden" }}
      >
        <OrganizationsTable />
      </Card>
    </Box>
  );
}
