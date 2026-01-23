import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * 페이지별 SEO 메타태그를 관리하는 컴포넌트
 *
 * 사용 예제:
 * <PageHelmet
 *   title="대시보드"
 *   description="광고 성과를 한눈에 확인하세요"
 * />
 */
export const PageHelmet = ({
  title = "마케팅 인텔리전스 · 광고 대시보드 | 제스트닷",
  description = "구글·메타·네이버 광고 데이터를 한 화면에서 확인하는 마케팅 성과 대시보드입니다. 광고 성과를 빠르고 직관적으로 분석하세요.",
  keywords = "마케팅 대시보드, 광고 성과 분석, 퍼포먼스 마케팅, 구글 광고, 메타 광고, 네이버 광고",
  ogTitle,
  ogDescription,
  ogImage = "https://www.zestdot.com/images/og-image.jpg",
  ogUrl = "https://www.zestdot.com"
}) => {
  return (
    <Helmet>
      {/* 기본 메타태그 */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph 메타태그 */}
      <meta property="og:title" content={ogTitle || title} />
      <meta property="og:description" content={ogDescription || description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={ogUrl} />

      {/* Twitter 메타태그 */}
      <meta name="twitter:title" content={ogTitle || title} />
      <meta name="twitter:description" content={ogDescription || description} />
    </Helmet>
  );
};
