import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Text,
  Box,
  Flex,
  Badge,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';

export default function ViewPostModal({ isOpen, onClose, post }) {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textColorSecondary = useColorModeValue('secondaryGray.600', 'secondaryGray.400');
  const bgColor = useColorModeValue('white', 'navy.800');

  if (!post) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalOverlay />
      <ModalContent bg={bgColor}>
        <ModalHeader>
          <Text color={textColor} fontSize="xl" fontWeight="700">
            {post.title}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb="30px">
          <Flex gap="12px" mb="20px" align="center" flexWrap="wrap">
            <Text color={textColorSecondary} fontSize="sm">
              작성자: <Text as="span" color={textColor} fontWeight="600">{post.author}</Text>
            </Text>
            <Text color={textColorSecondary} fontSize="sm">|</Text>
            <Text color={textColorSecondary} fontSize="sm">
              작성일: <Text as="span" color={textColor} fontWeight="600">{post.date}</Text>
            </Text>
          </Flex>

          <Box mb="20px">
            <Text color={textColorSecondary} fontSize="sm" mb="8px">
              대상:
            </Text>
            <Flex gap="6px" flexWrap="wrap">
              {post.targets.map((target, idx) => (
                <Badge key={idx} colorScheme="purple" fontSize="xs" px="10px" py="4px">
                  {target}
                </Badge>
              ))}
            </Flex>
          </Box>

          <Divider mb="20px" />

          <Box>
            <Text color={textColor} fontSize="sm" lineHeight="1.8" whiteSpace="pre-wrap">
              {post.content}
            </Text>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
