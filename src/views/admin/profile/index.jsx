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
import { Box, Grid } from "@chakra-ui/react";

// Custom components
import Banner from "views/admin/profile/components/Banner";
import APIStatus from "views/admin/profile/components/APIStatus";
import Notifications from "views/admin/profile/components/Notifications";
import MiniCalendar from "components/calendar/MiniCalendar";
import Upload from "views/admin/profile/components/Upload";
import BrandsList from "views/admin/profile/components/BrandsList";

// Assets
import banner from "assets/img/auth/banner.png";
import avatar from "assets/img/avatars/avatar4.png";
import React from "react";
import { useAuth } from "contexts/AuthContext";

export default function Overview() {
  const { user, role, availableAdvertisers } = useAuth();

  // 권한 레이블 매핑
  const roleLabels = {
    master: '마스터',
    org_admin: '대행사 최고관리자',
    org_manager: '대행사 관리자',
    org_staff: '대행사 직원',
    advertiser_admin: '브랜드 대표운영자',
    manager: '브랜드 운영자',
    editor: '편집자',
    viewer: '뷰어',
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {/* Main Fields */}
      <Grid
        templateColumns={{
          base: "1fr",
          lg: "1.34fr 1fr 1.62fr",
        }}
        templateRows={{
          base: "repeat(3, 1fr)",
          lg: "1fr",
        }}
        gap={{ base: "20px", xl: "20px" }}>
        <Banner
          gridArea='1 / 1 / 2 / 2'
          banner={banner}
          avatar={avatar}
          name={user?.email?.split('@')[0] || 'User'}
          job={roleLabels[role] || role}
          roleLevel={roleLabels[role] || role}
          brandCount={availableAdvertisers?.length || 0}
          h={{ base: "auto", lg: "365px" }}
        />
        <MiniCalendar
          gridArea={{ base: "2 / 1 / 3 / 2", lg: "1 / 2 / 2 / 3" }}
          h={{ base: "auto", lg: "365px" }}
        />
        <Upload
          gridArea={{
            base: "3 / 1 / 4 / 2",
            lg: "1 / 3 / 2 / 4",
          }}
          h={{ base: "auto", lg: "365px" }}
          pe='20px'
          pb={{ base: "100px", lg: "20px" }}
        />
      </Grid>
      <Grid
        mb='20px'
        templateColumns={{
          base: "1fr",
          lg: "repeat(2, 1fr)",
          "2xl": "repeat(3, 1fr)",
        }}
        templateRows={{
          base: "repeat(3, 1fr)",
          lg: "repeat(2, 1fr)",
          "2xl": "1fr",
        }}
        gap={{ base: "20px", xl: "20px" }}
        alignItems="start">
        <BrandsList
          brands={availableAdvertisers}
          gridArea={{ base: "1 / 1 / 2 / 2", lg: "1 / 1 / 2 / 2", "2xl": "1 / 1 / 2 / 2" }}
          h={{ base: "auto", lg: "550px" }}
        />
        <APIStatus
          gridArea={{ base: "2 / 1 / 3 / 2", lg: "1 / 2 / 2 / 3", "2xl": "1 / 2 / 2 / 3" }}
          h={{ base: "auto", lg: "550px" }}
          pe='20px'
        />
        <Notifications
          used={25.6}
          total={50}
          gridArea={{
            base: "3 / 1 / 4 / 2",
            lg: "2 / 1 / 3 / 3",
            "2xl": "1 / 3 / 2 / 4",
          }}
          h={{ base: "auto", lg: "550px" }}
        />
      </Grid>
    </Box>
  );
}
