import React from 'react';
import { Box } from '@chakra-ui/react';

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

export default function Landing() {
  return (
    <Box>
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
