import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";

export default function OrganizationsTable() {
  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");

  // TODO: Supabase에서 실제 데이터 가져오기
  const mockOrganizations = [
    {
      id: 1,
      name: "나이키 코리아",
      type: "advertiser",
      usersCount: 12,
      advertisersCount: 1,
      isActive: true,
      approvalStatus: "approved",
      createdAt: "2025-01-15",
    },
    {
      id: 2,
      name: "ABC 광고대행사",
      type: "agency",
      usersCount: 45,
      advertisersCount: 23,
      isActive: true,
      approvalStatus: "approved",
      createdAt: "2025-01-10",
    },
  ];

  return (
    <>
      <Text fontSize="xl" fontWeight="700" mb="20px">
        조직 목록
      </Text>
      <Table variant="simple" color="gray.500" mb="24px">
        <Thead>
          <Tr>
            <Th borderColor={borderColor}>조직명</Th>
            <Th borderColor={borderColor}>유형</Th>
            <Th borderColor={borderColor}>사용자</Th>
            <Th borderColor={borderColor}>광고주/클라이언트</Th>
            <Th borderColor={borderColor}>상태</Th>
            <Th borderColor={borderColor}>승인 상태</Th>
            <Th borderColor={borderColor}>생성일</Th>
            <Th borderColor={borderColor}>액션</Th>
          </Tr>
        </Thead>
        <Tbody>
          {mockOrganizations.map((org) => (
            <Tr key={org.id}>
              <Td borderColor={borderColor}>
                <Text color={textColor} fontSize="sm" fontWeight="700">
                  {org.name}
                </Text>
              </Td>
              <Td borderColor={borderColor}>
                <Badge colorScheme={org.type === 'advertiser' ? 'blue' : 'purple'}>
                  {org.type === 'advertiser' ? '광고주' : '대행사'}
                </Badge>
              </Td>
              <Td borderColor={borderColor}>
                <Text fontSize="sm">{org.usersCount}</Text>
              </Td>
              <Td borderColor={borderColor}>
                <Text fontSize="sm">{org.advertisersCount}</Text>
              </Td>
              <Td borderColor={borderColor}>
                <Badge colorScheme={org.isActive ? 'green' : 'red'}>
                  {org.isActive ? '활성' : '비활성'}
                </Badge>
              </Td>
              <Td borderColor={borderColor}>
                <Badge
                  colorScheme={
                    org.approvalStatus === 'approved' ? 'green' :
                    org.approvalStatus === 'pending' ? 'yellow' : 'red'
                  }
                >
                  {org.approvalStatus === 'approved' ? '승인됨' :
                   org.approvalStatus === 'pending' ? '대기중' : '거부됨'}
                </Badge>
              </Td>
              <Td borderColor={borderColor}>
                <Text fontSize="sm">{org.createdAt}</Text>
              </Td>
              <Td borderColor={borderColor}>
                <Button size="sm" colorScheme="brand" mr="8px">
                  상세
                </Button>
                {org.approvalStatus === 'pending' && (
                  <Button size="sm" colorScheme="green">
                    승인
                  </Button>
                )}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
}
