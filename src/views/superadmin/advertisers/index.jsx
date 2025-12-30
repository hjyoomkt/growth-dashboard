import React, { useState } from "react";
import {
  Box,
  Heading,
  Text,
  Button,
  useDisclosure,
  HStack,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import AdvertisersTree from "./components/AdvertisersTree";
import AddBrandModal from "./components/AddBrandModal";

export default function AdvertisersManagement() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedOrganization, setSelectedOrganization] = useState(null);

  const handleAddBrand = (organizationId) => {
    setSelectedOrganization(organizationId);
    onOpen();
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb="24px">
        <Box>
          <Heading size="lg" mb="8px">
            광고주 관리
          </Heading>
          <Text fontSize="md" color="gray.600">
            조직별 광고주(브랜드) 목록을 확인하고 관리할 수 있습니다.
          </Text>
        </Box>
        <HStack spacing="12px">
          <Button colorScheme="brand" onClick={() => handleAddBrand(null)}>
            + 브랜드 추가
          </Button>
        </HStack>
      </Box>

      <Card
        direction="column"
        w="100%"
        px="25px"
        py="25px"
        overflowX={{ sm: "scroll", lg: "hidden" }}
      >
        <AdvertisersTree onAddBrand={handleAddBrand} />
      </Card>

      <AddBrandModal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          setSelectedOrganization(null);
        }}
        organizationId={selectedOrganization}
      />
    </Box>
  );
}
