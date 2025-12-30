import React, { useState } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  Collapse,
  useColorMode,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { landingDesignSystem } from '../../theme/landingTheme';
import { MdAdd, MdRemove } from 'react-icons/md';

const MotionBox = motion(Box);

const FAQItem = ({ question, answer, isOpen, onToggle }) => {
  const { colorMode } = useColorMode();

  return (
    <Box
      borderRadius={landingDesignSystem.borderRadius.medium}
      bg={colorMode === 'dark' ? landingDesignSystem.colors.cardBg : landingDesignSystem.colors.primary}
      border={`1px solid ${colorMode === 'dark' ? 'rgba(66, 42, 251, 0.3)' : 'rgba(0, 0, 0, 0.05)'}`}
      overflow="hidden"
      transition="all 0.3s ease"
      _hover={{
        borderColor: landingDesignSystem.colors.accent,
      }}
    >
      {/* Question */}
      <Flex
        p={{ base: '20px', md: '24px' }}
        justify="space-between"
        align="center"
        cursor="pointer"
        onClick={onToggle}
        _hover={{
          bg: colorMode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
        }}
        transition="background 0.2s ease"
      >
        <Text
          fontSize={landingDesignSystem.typography.fontSizes.body}
          fontWeight={landingDesignSystem.typography.fontWeights.semibold}
          color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
          pr="16px"
        >
          {question}
        </Text>
        <Box
          as={isOpen ? MdRemove : MdAdd}
          fontSize="24px"
          color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
          flexShrink={0}
          transition="transform 0.3s ease"
        />
      </Flex>

      {/* Answer */}
      <Collapse in={isOpen} animateOpacity>
        <Box
          px={{ base: '20px', md: '24px' }}
          pb={{ base: '20px', md: '24px' }}
          pt="0"
        >
          <Text
            fontSize={landingDesignSystem.typography.fontSizes.bodySmall}
            color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : landingDesignSystem.colors.textSecondary}
            lineHeight={landingDesignSystem.typography.lineHeights.relaxed}
          >
            {answer}
          </Text>
        </Box>
      </Collapse>
    </Box>
  );
};

export const FAQSection = () => {
  const { colorMode } = useColorMode();
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: '무료 체험은 어떻게 작동하나요?',
      answer:
        '모든 기능을 사용할 수 있는 Pro 플랜을 14일간 무료로 체험하세요. 시작 시 신용카드가 필요하지 않습니다.',
    },
    {
      question: '구독을 취소할 수 있나요?',
      answer:
        '네, 계정 설정에서 언제든지 취소할 수 있습니다. 계약이 없으며 필요한 경우 하위 요금제로 다운그레이드할 수 있습니다.',
    },
    {
      question: '어떤 마케팅 플랫폼과 통합되나요?',
      answer:
        'Google Ads, Meta Ads, LinkedIn, TikTok, Google Analytics 및 모든 주요 광고 네트워크를 포함하여 50개 이상의 플랫폼과 통합됩니다.',
    },
    {
      question: '내 마케팅 데이터는 안전한가요?',
      answer:
        '물론입니다. 은행급 AES-256 암호화를 사용하며 SOC 2 Type II 인증을 받았습니다. 데이터는 전송 중과 저장 시 모두 암호화됩니다.',
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <Box
      id="faq"
      py={{ base: '60px', md: '80px' }}
      bg={colorMode === 'dark' ? '#0B1437' : landingDesignSystem.colors.primary}
    >
      <Box maxW="800px" mx="auto" px={{ base: '24px', md: '48px' }}>
        {/* Header */}
        <VStack spacing="16px" mb="48px" textAlign="center">
          <Text
            fontSize={landingDesignSystem.typography.fontSizes.caption}
            fontWeight={landingDesignSystem.typography.fontWeights.semibold}
            color={colorMode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : landingDesignSystem.colors.textSecondary}
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            FAQ
          </Text>
          <Text
            fontSize={{ base: '36px', md: '48px' }}
            fontWeight={landingDesignSystem.typography.fontWeights.bold}
            color={colorMode === 'dark' ? landingDesignSystem.colors.white : landingDesignSystem.colors.textPrimary}
            lineHeight={landingDesignSystem.typography.lineHeights.tight}
            fontFamily={landingDesignSystem.typography.fontFamily.heading}
          >
            자주 묻는 질문
          </Text>
        </VStack>

        {/* FAQ List */}
        <VStack spacing="16px">
          {faqs.map((faq, index) => (
            <MotionBox
              key={index}
              w="100%"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <FAQItem
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === index}
                onToggle={() => toggleFAQ(index)}
              />
            </MotionBox>
          ))}
        </VStack>
      </Box>
    </Box>
  );
};

export default FAQSection;
