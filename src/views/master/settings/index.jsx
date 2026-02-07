import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Button,
  useColorModeValue,
  useToast,
  Spinner,
  Flex,
  Badge,
} from "@chakra-ui/react";
import Card from "components/card/Card.js";
import { getPlatformConfigs, updatePlatformConfig } from "services/supabaseService";

const EDITABLE_FIELDS = [
  { key: "api_version", label: "API Version", type: "text" },
  { key: "chunk_size_days", label: "Chunk Size (days)", type: "number" },
  { key: "demographics_chunk_size_days", label: "Demographics Chunk (days)", type: "number" },
  { key: "rate_limit_delay_ms", label: "Rate Limit Delay (ms)", type: "number" },
  { key: "max_retry_attempts", label: "Max Retry", type: "number" },
];

export default function MasterSettings() {
  const [configs, setConfigs] = useState([]);
  const [editState, setEditState] = useState({});
  const [savingPlatform, setSavingPlatform] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const textColor = useColorModeValue("secondaryGray.900", "white");
  const borderColor = useColorModeValue("gray.200", "whiteAlpha.100");
  const inputBg = useColorModeValue("white", "navy.700");

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPlatformConfigs();
      setConfigs(data);
      const initial = {};
      data.forEach((cfg) => {
        initial[cfg.platform] = {};
        EDITABLE_FIELDS.forEach((f) => {
          initial[cfg.platform][f.key] = cfg[f.key] ?? "";
        });
      });
      setEditState(initial);
    } catch (error) {
      toast({
        title: "설정 조회 실패",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleChange = (platform, field, value) => {
    setEditState((prev) => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };

  const hasChanges = (platform) => {
    const original = configs.find((c) => c.platform === platform);
    if (!original || !editState[platform]) return false;
    return EDITABLE_FIELDS.some(
      (f) => String(editState[platform][f.key]) !== String(original[f.key] ?? "")
    );
  };

  const handleSave = async (platform) => {
    if (!hasChanges(platform)) return;
    setSavingPlatform(platform);
    try {
      const updates = {};
      EDITABLE_FIELDS.forEach((f) => {
        const val = editState[platform][f.key];
        updates[f.key] = f.type === "number" ? Number(val) : val;
      });

      await updatePlatformConfig(platform, updates);
      await fetchConfigs();

      toast({
        title: `${platform} 설정 저장 완료`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "저장 실패",
        description: error.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setSavingPlatform(null);
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      <Card px="25px" py="25px" mt="30px" overflowX={{ sm: "scroll", lg: "hidden" }}>
        {isLoading ? (
          <Flex justify="center" align="center" minH="200px">
            <Spinner size="lg" color="brand.500" />
          </Flex>
        ) : configs.length === 0 ? (
          <Text color="gray.500">설정 데이터가 없습니다.</Text>
        ) : (
          <Table variant="simple" color="gray.500">
            <Thead>
              <Tr>
                <Th borderColor={borderColor} textAlign="center">플랫폼</Th>
                {EDITABLE_FIELDS.map((f) => (
                  <Th key={f.key} borderColor={borderColor} textAlign="center">
                    {f.label}
                  </Th>
                ))}
                <Th borderColor={borderColor} textAlign="center">액션</Th>
              </Tr>
            </Thead>
            <Tbody>
              {configs.map((cfg) => (
                <Tr key={cfg.platform}>
                  <Td borderColor={borderColor} textAlign="center">
                    <Text color={textColor} fontSize="sm" fontWeight="700">
                      {cfg.platform}
                    </Text>
                  </Td>
                  {EDITABLE_FIELDS.map((f) => (
                    <Td key={f.key} borderColor={borderColor} textAlign="center">
                      <Input
                        size="sm"
                        type={f.type}
                        bg={inputBg}
                        value={editState[cfg.platform]?.[f.key] ?? ""}
                        onChange={(e) =>
                          handleChange(cfg.platform, f.key, e.target.value)
                        }
                        w="120px"
                        borderRadius="16px"
                        textAlign="center"
                      />
                    </Td>
                  ))}
                  <Td borderColor={borderColor} textAlign="center">
                    <Flex align="center" justify="center" gap="8px">
                      <Button
                        size="sm"
                        colorScheme="brand"
                        isDisabled={!hasChanges(cfg.platform)}
                        isLoading={savingPlatform === cfg.platform}
                        onClick={() => handleSave(cfg.platform)}
                      >
                        저장
                      </Button>
                      {hasChanges(cfg.platform) && (
                        <Badge colorScheme="orange" fontSize="xs">
                          변경됨
                        </Badge>
                      )}
                    </Flex>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>
    </Box>
  );
}
