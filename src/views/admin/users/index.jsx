// Chakra imports
import { Box, Button, Heading, Text, useDisclosure, Flex } from "@chakra-ui/react";
import UserTable from "views/admin/users/components/UserTable";
import InviteUserModal from "views/admin/users/components/InviteUserModal";
import React from "react";
import { useAuth } from "contexts/AuthContext";

export default function UserManagement() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isAdvertiserAdmin, isAgency, role, organizationType } = useAuth();

  // 디버깅
  console.log('=== UserManagement Debug ===');
  console.log('role:', role);
  console.log('organizationType:', organizationType);
  console.log('isAdvertiserAdmin():', isAdvertiserAdmin());
  console.log('isAgency():', isAgency());

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Flex justify="space-between" align="center" mb="20px" px="25px">
        <Box>
          <Heading size="lg" mb="8px">
            {isAgency() ? '직원 관리' : '팀원 관리'}
          </Heading>
          <Text fontSize="md" color="gray.600">
            {isAgency()
              ? '대행사 직원을 초대하고 관리할 수 있습니다.'
              : '팀원을 초대하고 관리할 수 있습니다.'}
          </Text>
        </Box>

        {isAdvertiserAdmin() && (
          <Button colorScheme="brand" onClick={onOpen}>
            + {isAgency() ? '직원 초대' : '팀원 초대'}
          </Button>
        )}
      </Flex>

      <UserTable />

      <InviteUserModal isOpen={isOpen} onClose={onClose} />
    </Box>
  );
}
