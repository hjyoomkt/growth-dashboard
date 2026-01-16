/*!
  _   _  ___  ____  ___ ________  _   _   _   _ ___   
 | | | |/ _ \|  _ \|_ _|__  / _ \| \ | | | | | |_ _| 
 | |_| | | | | |_) || |  / / | | |  \| | | | | || | 
 |  _  | |_| |  _ < | | / /| |_| | |\  | | |_| || |
 |_| |_|\___/|_| \_\___/____\___/|_| \_|  \___/|___|
                                                                                                                                                                                                                                                                                                                                       
=========================================================
* Horizon UI - v1.1.0
=========================================================

* Product Page: https://www.horizon-ui.com/
* Copyright 2023 Horizon UI (https://www.horizon-ui.com/)

* Designed and Coded by Simmmple

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

// Chakra imports
import {
  Box,
  Icon,
  SimpleGrid,
  useColorModeValue,
} from "@chakra-ui/react";
// Custom components
import MiniCalendar from "components/calendar/MiniCalendar";
import MiniStatistics from "components/card/MiniStatistics";
import IconBox from "components/icons/IconBox";
import React, { useState, useEffect } from "react";
import {
  MdBarChart,
  MdTrendingUp,
  MdVisibility,
  MdTouchApp,
  MdShoppingCart,
} from "react-icons/md";
import { FaWonSign } from "react-icons/fa";
import TotalSpent from "views/admin/default/components/TotalSpent";
import WeeklyRevenue from "views/admin/default/components/WeeklyRevenue";
import DailyAdCost from "views/admin/default/components/DailyAdCost";
import MediaAdCost from "views/admin/default/components/MediaAdCost";
import ROASAdCost from "views/admin/default/components/ROASAdCost";
import BestCreatives from "views/admin/default/components/BestCreatives";
import AllCreatives from "views/admin/default/components/AllCreatives";
import DateRangePicker from "components/fields/DateRangePicker";
import WeeklyConversions from "views/admin/default/components/WeeklyConversions";
import AgeGenderPurchase from "views/admin/default/components/AgeGenderPurchase";
import GenderPurchasePie from "views/admin/default/components/GenderPurchasePie";
import { useAuth } from "contexts/AuthContext";
import { useDateRange } from "contexts/DateRangeContext";
import { getKPIData } from "services/supabaseService";

export default function UserReports() {
  // Chakra Color Mode
  const brandColor = useColorModeValue("brand.500", "white");
  const boxBg = useColorModeValue("secondaryGray.300", "whiteAlpha.100");

  // ===== 2025-12-31: Supabase KPI 데이터 연동 =====
  const { currentAdvertiserId, availableAdvertisers } = useAuth();
  const { startDate, endDate } = useDateRange();
  const [kpiData, setKpiData] = useState({
    cost: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    cvr: 0,
    roas: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIData();
  }, [currentAdvertiserId, availableAdvertisers, startDate, endDate]);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      const availableAdvertiserIds = (availableAdvertisers || []).map(adv => adv.id);
      const data = await getKPIData({
        advertiserId: currentAdvertiserId,
        availableAdvertiserIds,
        startDate,
        endDate,
      });
      setKpiData(data);
    } catch (error) {
      console.error('KPI 데이터 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 숫자 포맷팅
  const formatNumber = (num) => num.toLocaleString('ko-KR');
  const formatCurrency = (num) => `₩${formatNumber(Math.round(num))}`;
  const formatPercent = (num) => `${num.toFixed(2)}%`;
  const formatROAS = (num) => `${(num * 100).toFixed(0)}%`; // 퍼센티지로 변환 (10.0 → 1000%)
  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {/* 날짜 선택 UI */}
      <DateRangePicker />

      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 3, "2xl": 6 }}
        gap='20px'
        mb='20px'>
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={FaWonSign} color={brandColor} />
              }
            />
          }
          name='총지출'
          value={loading ? '...' : formatCurrency(kpiData.cost)}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdVisibility} color={brandColor} />
              }
            />
          }
          name='노출수'
          value={loading ? '...' : formatNumber(kpiData.impressions)}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdTouchApp} color={brandColor} />
              }
            />
          }
          name='클릭수'
          value={loading ? '...' : formatNumber(kpiData.clicks)}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdShoppingCart} color={brandColor} />
              }
            />
          }
          name='전환수'
          value={loading ? '...' : formatNumber(kpiData.conversions)}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={<Icon w='32px' h='32px' as={MdBarChart} color={brandColor} />}
            />
          }
          name='CVR'
          value={loading ? '...' : formatPercent(kpiData.cvr)}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w='56px'
              h='56px'
              bg={boxBg}
              icon={
                <Icon w='32px' h='32px' as={MdTrendingUp} color={brandColor} />
              }
            />
          }
          name='ROAS'
          value={loading ? '...' : formatROAS(kpiData.roas)}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 2 }} gap='20px' mb='20px'>
        <TotalSpent />
        <WeeklyRevenue />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 1, lg: 3 }} gap='20px' mb='20px'>
        <DailyAdCost />
        <MediaAdCost />
        <ROASAdCost />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap='20px' mb='20px'>
        <WeeklyConversions />
        <GenderPurchasePie
          currentAdvertiserId={currentAdvertiserId}
          availableAdvertisers={availableAdvertisers}
          startDate={startDate}
          endDate={endDate}
        />
        <AgeGenderPurchase
          currentAdvertiserId={currentAdvertiserId}
          availableAdvertisers={availableAdvertisers}
          startDate={startDate}
          endDate={endDate}
        />
      </SimpleGrid>

      <Box mb='20px'>
        <BestCreatives />
      </Box>

      <Box mb='20px'>
        <AllCreatives />
      </Box>

    </Box>
  );
}
