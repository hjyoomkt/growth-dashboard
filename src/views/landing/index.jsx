import React, { useState, useEffect } from 'react';
import { Box, useDisclosure } from '@chakra-ui/react';
import { PageHelmet } from '../../components/HelmetProvider';

// Import all landing sections
import Navbar from '../../components/landing/Navbar';
import HeroSection from '../../components/landing/HeroSection';
import LogoCarousel from '../../components/landing/LogoCarousel';
import ChallengeSection from '../../components/landing/ChallengeSection';
import SolutionSection from '../../components/landing/SolutionSection';
import FeaturesSection from '../../components/landing/FeaturesSection';
import HowItWorksSection from '../../components/landing/HowItWorksSection';
import TestimonialsSection from '../../components/landing/TestimonialsSection';
import PricingSection from '../../components/landing/PricingSection';
import StatsSection from '../../components/landing/StatsSection';
import FAQSection from '../../components/landing/FAQSection';
import CTASection from '../../components/landing/CTASection';
import Footer from '../../components/landing/Footer';

// Import announcement modal
import AnnouncementModal from '../../components/modal/AnnouncementModal';

// Import popup image
import popupImage from 'assets/img/pop_up01.png';

export default function Landing() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    // 페이지 로드 시 항상 1초 후에 팝업 표시
    const timer = setTimeout(() => {
      onOpen();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onOpen]);

  const handleModalClose = () => {
    // 팝업 닫기
    onClose();
  };

  const handleButtonClick = () => {
    // 더 알아보기 버튼 클릭 시 라이브러리 페이지로 이동
    window.open('https://library.zestdot.com/', '_blank');
  };

  return (
    <Box>
      {/* SEO Meta Tags */}
      <PageHelmet
        title="마케팅 인텔리전스 · 광고 대시보드 | 제스트닷"
        description="구글·메타·네이버 광고 데이터를 한 화면에서 확인하는 마케팅 성과 대시보드입니다. 광고 성과를 빠르고 직관적으로 분석하세요."
        keywords="마케팅 대시보드, 광고 성과 분석, 퍼포먼스 마케팅, 구글 광고, 메타 광고, 네이버 광고"
        ogTitle="제스트닷 | 마케팅 인텔리전스 통합 대시보드"
        ogDescription="다채널 데이터를 자동으로 통합 분석하세요"
      />

      {/* Announcement Modal */}
      <AnnouncementModal
        isOpen={isOpen}
        onClose={handleModalClose}
        title="경쟁사 광고 모니터링은 제스트닷에서"
        subtitle={
          <>
            보고 싶은 레퍼런스가 찾아지는 오늘,
            <br />
            마케터를 위한 새로운 레퍼런스 라이브러리
          </>
        }
        imageSrc={popupImage}
        buttonText="더 알아보기"
        onButtonClick={handleButtonClick}
      />

      {/* Fixed Navbar */}
      <Navbar />

      {/* Hero Section */}
      <HeroSection />

      {/* Logo Carousel */}
      <LogoCarousel />

      {/* Challenge Section */}
      <ChallengeSection />

      {/* Solution Section */}
      <SolutionSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* Pricing Section */}
      <PricingSection />

      {/* Stats Section */}
      <StatsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </Box>
  );
}
