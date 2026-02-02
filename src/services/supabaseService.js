import { supabase } from '../config/supabase';

// supabase 객체 export
export { supabase };

/**
 * Supabase API 서비스
 * 데이터베이스 CRUD 작업을 위한 함수들
 */

// ============================================
// 인증 (Authentication)
// ============================================

/**
 * 이메일로 회원가입
 */
export const signUp = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata, // 추가 사용자 정보 (이름, 프로필 등)
    },
  });

  if (error) throw error;
  return data;
};

/**
 * 이메일로 로그인
 */
export const signIn = async (email, password) => {
  // 1. Supabase Auth로 인증
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  // 2. users 테이블에서 사용자 상태 확인
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, name, role, status, deleted_at')
    .eq('id', data.user.id)
    .single();

  if (userError) {
    console.error('[signIn] 사용자 정보 조회 실패:', {
      error: userError,
      message: userError?.message,
      details: userError?.details,
      hint: userError?.hint,
      code: userError?.code
    });
    await supabase.auth.signOut();
    throw new Error(`사용자 정보를 찾을 수 없습니다: ${userError?.message || userError}`);
  }

  // 3. 삭제된 계정 체크
  if (userData.deleted_at !== null) {
    await supabase.auth.signOut();
    throw new Error('삭제된 계정입니다. 관리자에게 문의하세요.');
  }

  // 4. 비활성 상태 체크
  if (userData.status !== 'active') {
    await supabase.auth.signOut();
    throw new Error('비활성화된 계정입니다. 관리자에게 문의하세요.');
  }

  return { ...data, userData };
};

/**
 * 로그아웃
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * 현재 로그인된 사용자 가져오기
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

/**
 * 비밀번호 재설정 이메일 보내기
 */
export const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
};

/**
 * 사용자 메타데이터 조회 (organizations, advertisers 조인)
 * user_advertisers 테이블을 통한 다대다 관계 지원
 * @param {string} userId - Supabase Auth user ID
 */
export const getUserMetadata = async (userId) => {
  // 1. 기본 사용자 정보 조회
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select(`
      *,
      organizations(id, name, type),
      advertisers(id, name)
    `)
    .eq('id', userId)
    .single();

  if (userError) throw userError;

  // 2. user_advertisers에서 접근 가능한 모든 브랜드 조회
  const { data: userAdvertisers, error: uaError } = await supabase
    .from('user_advertisers')
    .select(`
      advertisers(id, name, advertiser_group_id)
    `)
    .eq('user_id', userId);

  if (uaError) throw uaError;

  // 3. 접근 가능한 브랜드 목록 추가
  userData.accessible_advertisers = (userAdvertisers || [])
    .map(ua => ua.advertisers)
    .filter(Boolean);

  return userData;
};

/**
 * 접근 가능한 광고주 목록 조회
 * user_advertisers 테이블을 통한 다대다 관계 지원
 * @param {object} userData - 사용자 메타데이터
 */
export const getAvailableAdvertisers = async (userData) => {
  const isAgency = ['agency_admin', 'agency_manager', 'agency_staff'].includes(userData.role);
  const isAdvertiser = ['advertiser_admin', 'advertiser_staff', 'viewer', 'editor'].includes(userData.role);

  if (userData.role === 'master' || userData.role === 'specialist') {
    // Master & Specialist: 모든 광고주
    const { data, error } = await supabase.from('advertisers').select('*');
    if (error) {
      console.error('[getAvailableAdvertisers] 조회 실패:', error);
      throw error;
    }
    console.log('[getAvailableAdvertisers] 조회 성공 (master/specialist):', { count: data?.length });
    return data || [];
  } else if (userData.role === 'agency_admin') {
    // Agency Admin(대표): 같은 organization의 모든 브랜드 접근
    if (!userData.organization_id) {
      console.error('[getAvailableAdvertisers] organization_id가 null입니다:', userData);
      return [];
    }
    const { data, error } = await supabase
      .from('advertisers')
      .select('*')
      .eq('organization_id', userData.organization_id);
    if (error) {
      console.error('[getAvailableAdvertisers] 조회 실패:', error);
      throw error;
    }
    console.log('[getAvailableAdvertisers] 조회 성공 (agency_admin):', { count: data?.length });
    return data || [];
  } else if (isAgency || isAdvertiser) {
    // Agency Staff/Manager & Advertiser: user_advertisers를 통해 접근 가능한 브랜드만
    const { data: userAdvertisers, error: uaError } = await supabase
      .from('user_advertisers')
      .select(`
        advertisers(*)
      `)
      .eq('user_id', userData.id);

    if (uaError) {
      console.error('[getAvailableAdvertisers] user_advertisers 조회 실패:', uaError);
      throw uaError;
    }

    let advertisers = (userAdvertisers || [])
      .map(ua => ua.advertisers)
      .filter(Boolean);

    // "담당 브랜드 전체" 처리: agency 역할만 적용 (advertiser 역할은 user_advertisers에 명시적으로 등록된 브랜드만 접근)
    if (advertisers.length === 0 && userData.organization_id && isAgency) {
      console.log('[getAvailableAdvertisers] 담당 브랜드 전체 감지 (agency만) - 조직의 모든 브랜드 반환:', {
        userId: userData.id,
        role: userData.role,
        organizationId: userData.organization_id
      });

      const { data: orgAdvertisers, error: orgError } = await supabase
        .from('advertisers')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .is('deleted_at', null);

      if (orgError) {
        console.error('[getAvailableAdvertisers] 조직 브랜드 조회 실패:', orgError);
        throw orgError;
      }

      console.log('[getAvailableAdvertisers] 조회 성공 (담당 브랜드 전체):', { count: orgAdvertisers?.length });
      return orgAdvertisers || [];
    }

    // 그룹 브랜드 확장: advertiser_group_id가 있으면 같은 그룹의 브랜드도 포함
    if (advertisers.length > 0) {
      const advertiserIds = advertisers.map(adv => adv.id);

      // advertiser_group_id 조회
      const { data: myAdvertisers } = await supabase
        .from('advertisers')
        .select('id, advertiser_group_id')
        .in('id', advertiserIds);

      const groupIds = [...new Set(
        myAdvertisers?.map(adv => adv.advertiser_group_id).filter(Boolean) || []
      )];

      if (groupIds.length > 0) {
        // 같은 그룹의 모든 브랜드 조회
        const { data: groupBrands } = await supabase
          .from('advertisers')
          .select('*')
          .in('advertiser_group_id', groupIds)
          .is('deleted_at', null);

        if (groupBrands && groupBrands.length > 0) {
          // 기존 브랜드 + 그룹 브랜드 합치기
          const allBrandIds = new Set(advertiserIds);
          const additionalBrands = groupBrands.filter(brand => !allBrandIds.has(brand.id));

          advertisers = [...advertisers, ...additionalBrands];

          console.log('[getAvailableAdvertisers] 그룹 브랜드 추가:', {
            original: advertiserIds.length,
            groupBrands: groupBrands.length,
            final: advertisers.length
          });
        }
      }
    }

    console.log('[getAvailableAdvertisers] 조회 성공:', { role: userData.role, count: advertisers.length });
    return advertisers;
  }

  return [];
};

// ============================================
// 사용자 관리 (Users)
// ============================================

/**
 * 모든 사용자 조회 (권한별 필터링)
 * user_advertisers 테이블을 통한 다대다 관계 지원
 * @param {object} currentUser - 현재 로그인한 사용자 정보
 */
export const getUsers = async (currentUser) => {
  const isAgency = ['agency_admin', 'agency_manager', 'agency_staff'].includes(currentUser.role);
  const isAdvertiser = ['advertiser_admin', 'advertiser_staff', 'viewer', 'editor'].includes(currentUser.role);

  if (currentUser.role === 'master') {
    // Master: 모든 사용자 조회 가능
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        organizations(id, name, type),
        advertisers(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getUsers] 조회 실패:', error);
      throw error;
    }

    // 각 사용자의 접근 가능한 브랜드 목록 추가
    const usersWithAdvertisers = await Promise.all(
      (data || []).map(async (user) => {
        const { data: userAdvertisers } = await supabase
          .from('user_advertisers')
          .select(`
            advertisers(id, name)
          `)
          .eq('user_id', user.id);

        let advertisers = (userAdvertisers || [])
          .map(ua => ua.advertisers)
          .filter(Boolean);

        // "담당 브랜드 전체" 처리: user_advertisers가 비어있고 organization_id가 있으면 조직의 모든 브랜드
        if (advertisers.length === 0 && user.organization_id) {
          const { data: orgAdvertisers } = await supabase
            .from('advertisers')
            .select('id, name')
            .eq('organization_id', user.organization_id)
            .is('deleted_at', null);

          advertisers = orgAdvertisers || [];
        }

        user.accessible_advertisers = advertisers;

        return user;
      })
    );

    console.log('[getUsers] 조회 성공 (master):', { count: usersWithAdvertisers.length });
    return usersWithAdvertisers;

  } else if (isAgency) {
    // Agency: 같은 organization 내 사용자 + 소유한 브랜드의 사용자
    const orgId = currentUser.organization_id || currentUser.organizationId;
    if (!orgId) {
      console.error('[getUsers] Agency user organization_id is null:', currentUser);
      return [];
    }

    // 1. 같은 organization 내 사용자 조회
    const { data: orgUsers, error: orgError } = await supabase
      .from('users')
      .select(`
        *,
        organizations(id, name, type),
        advertisers(id, name)
      `)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (orgError) {
      console.error('[getUsers] 조회 실패:', orgError);
      throw orgError;
    }

    // 2. 에이전시가 소유한 브랜드 ID 목록 조회
    const { data: ownedAdvertisers, error: advError } = await supabase
      .from('advertisers')
      .select('id')
      .eq('organization_id', orgId);

    if (advError) {
      console.error('[getUsers] advertisers 조회 실패:', advError);
      throw advError;
    }

    const advertiserIds = (ownedAdvertisers || []).map(adv => adv.id);

    // 3. 해당 브랜드에 접근 가능한 사용자 조회 (user_advertisers 기반)
    let brandUsers = [];
    if (advertiserIds.length > 0) {
      const { data: userAdvertisers, error: uaError } = await supabase
        .from('user_advertisers')
        .select(`
          user_id,
          users(
            *,
            organizations(id, name, type),
            advertisers(id, name)
          )
        `)
        .in('advertiser_id', advertiserIds);

      if (uaError) {
        console.error('[getUsers] user_advertisers 조회 실패:', uaError);
      } else {
        brandUsers = (userAdvertisers || [])
          .map(ua => ua.users)
          .filter(Boolean)
          .filter(user => user.organization_id !== orgId); // 중복 제거 (organization 소속은 이미 포함됨)
      }
    }

    // 4. 중복 제거 및 병합
    const userMap = new Map();
    [...(orgUsers || []), ...brandUsers].forEach(user => {
      if (!userMap.has(user.id)) {
        userMap.set(user.id, user);
      }
    });

    // 5. 각 사용자의 접근 가능한 브랜드 목록 추가
    const usersWithAdvertisers = await Promise.all(
      Array.from(userMap.values()).map(async (user) => {
        const { data: userAdvertisers } = await supabase
          .from('user_advertisers')
          .select(`
            advertisers(id, name)
          `)
          .eq('user_id', user.id);

        let advertisers = (userAdvertisers || [])
          .map(ua => ua.advertisers)
          .filter(Boolean);

        // "담당 브랜드 전체" 처리: user_advertisers가 비어있고 organization_id가 있으면 조직의 모든 브랜드
        if (advertisers.length === 0 && user.organization_id) {
          const { data: orgAdvertisers } = await supabase
            .from('advertisers')
            .select('id, name')
            .eq('organization_id', user.organization_id)
            .is('deleted_at', null);

          advertisers = orgAdvertisers || [];
        }

        user.accessible_advertisers = advertisers;

        return user;
      })
    );

    console.log('[getUsers] 조회 성공 (agency):', { count: usersWithAdvertisers.length });
    return usersWithAdvertisers;

  } else if (isAdvertiser) {
    // Advertiser: 같은 advertiser_group_id를 가진 브랜드의 모든 사용자

    // 1. 현재 사용자의 브랜드 ID 조회
    const { data: userAdvertisers, error: uaError } = await supabase
      .from('user_advertisers')
      .select('advertiser_id')
      .eq('user_id', currentUser.id);

    if (uaError || !userAdvertisers || userAdvertisers.length === 0) {
      console.error('[getUsers] user_advertisers 조회 실패 또는 접근 가능한 브랜드 없음:', currentUser);
      return [];
    }

    const myAdvertiserIds = userAdvertisers.map(ua => ua.advertiser_id);

    // 2. 내 브랜드들의 advertiser_group_id 조회
    const { data: myAdvertisers } = await supabase
      .from('advertisers')
      .select('id, advertiser_group_id')
      .in('id', myAdvertiserIds);

    const groupIds = [...new Set(
      myAdvertisers
        .map(adv => adv.advertiser_group_id)
        .filter(Boolean) // null 제외
    )];

    // 3. 같은 그룹의 모든 브랜드 ID 조회
    let allGroupAdvertiserIds = [...myAdvertiserIds]; // group이 없는 브랜드도 포함

    if (groupIds.length > 0) {
      const { data: groupAdvertisers } = await supabase
        .from('advertisers')
        .select('id')
        .in('advertiser_group_id', groupIds);

      allGroupAdvertiserIds = [
        ...allGroupAdvertiserIds,
        ...groupAdvertisers.map(adv => adv.id)
      ];
    }

    // 중복 제거
    allGroupAdvertiserIds = [...new Set(allGroupAdvertiserIds)];

    // 4. 그룹 내 모든 브랜드에 접근하는 사용자 조회
    const { data: sameAdvertiserUsers, error: userError } = await supabase
      .from('user_advertisers')
      .select(`
        user_id,
        users!user_advertisers_user_id_fkey (
          *,
          organizations(id, name, type),
          advertisers(id, name)
        )
      `)
      .in('advertiser_id', allGroupAdvertiserIds);

    if (userError) {
      console.error('[getUsers] 사용자 조회 실패:', userError);
      throw userError;
    }

    // 5. user_id로 그룹화하여 중복 제거
    const uniqueUserMap = new Map();

    for (const ua of sameAdvertiserUsers || []) {
      const user = ua.users;
      if (!user) continue;

      if (!uniqueUserMap.has(user.id)) {
        // accessible_advertisers 배열 생성
        const userAdvs = (sameAdvertiserUsers || [])
          .filter(item => item.user_id === user.id && item.advertisers)
          .map(item => ({
            id: item.advertisers.id,
            name: item.advertisers.name
          }));

        uniqueUserMap.set(user.id, {
          ...user,
          accessible_advertisers: userAdvs,
        });
      }
    }

    // Map을 배열로 변환
    const users = Array.from(uniqueUserMap.values());

    // 역할 필터링 (브랜드 관련 역할만)
    const BRAND_ROLES = ['viewer', 'editor', 'advertiser_admin', 'advertiser_staff'];
    const filteredUsers = users.filter(user =>
      BRAND_ROLES.includes(user.role)
    );

    console.log('[getUsers] 조회 성공 (advertiser):', {
      count: filteredUsers.length,
      myAdvertiserIds: myAdvertiserIds.length,
      groupIds: groupIds.length,
      allGroupAdvertiserIds: allGroupAdvertiserIds.length,
    });
    return filteredUsers;
  }

  return [];
};

/**
 * 대표운영자 중복 체크
 * @param {string} role - 체크할 역할 (advertiser_admin 또는 agency_admin)
 * @param {string} organizationId - 조직 ID
 * @param {string} advertiserId - 광고주 ID
 * @param {string} excludeUserId - 제외할 사용자 ID (현재 수정 중인 사용자)
 */
export const checkAdminRoleDuplicate = async (role, organizationId, advertiserId, excludeUserId = null) => {
  // 브랜드 대표운영자 체크
  if (role === 'advertiser_admin' && advertiserId) {
    let query = supabase
      .from('users')
      .select('id, email, name')
      .eq('role', 'advertiser_admin')
      .eq('advertiser_id', advertiserId)
      .eq('status', 'active');

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      return {
        isDuplicate: true,
        existingAdmin: data[0],
        message: `이미 브랜드 대표운영자가 존재합니다: ${data[0].name || data[0].email}`
      };
    }
  }

  // 에이전시 대표운영자 체크
  if (role === 'agency_admin' && organizationId) {
    let query = supabase
      .from('users')
      .select('id, email, name')
      .eq('role', 'agency_admin')
      .eq('organization_id', organizationId)
      .eq('status', 'active');

    if (excludeUserId) {
      query = query.neq('id', excludeUserId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      return {
        isDuplicate: true,
        existingAdmin: data[0],
        message: `이미 에이전시 대표운영자가 존재합니다: ${data[0].name || data[0].email}`
      };
    }
  }

  return { isDuplicate: false };
};

/**
 * 사용자 역할 변경
 * @param {string} userId - 변경할 사용자 ID
 * @param {string} newRole - 새로운 역할
 * @param {object} currentUser - 현재 로그인한 사용자 정보 (권한 검증용)
 */
export const updateUserRole = async (userId, newRole, currentUser = null) => {
  // 1. 대상 사용자 정보 조회
  const { data: targetUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;

  // 2. 권한 검증 (백엔드에서도 재검증)
  if (currentUser) {
    const roleHierarchy = {
      master: 100,
      specialist: 50,
      agency_admin: 7,
      agency_manager: 6,
      agency_staff: 5,
      advertiser_admin: 4,
      advertiser_staff: 3,
      editor: 2,
      viewer: 1,
    };

    const currentRoleLevel = roleHierarchy[currentUser.role] || 0;
    const targetRoleLevel = roleHierarchy[targetUser.role] || 0;
    const newRoleLevel = roleHierarchy[newRole] || 0;

    // Master가 아닌 경우, 자신보다 높거나 같은 권한을 가진 사용자는 수정 불가 (동급 차단)
    if (currentUser.role !== 'master' && targetRoleLevel >= currentRoleLevel) {
      throw new Error('자신과 동급이거나 상위 권한을 가진 사용자는 수정할 수 없습니다.');
    }

    // Master가 아닌 경우, 자신보다 높거나 같은 권한으로 변경 불가 (동급 차단)
    if (currentUser.role !== 'master' && newRoleLevel >= currentRoleLevel) {
      throw new Error('자신보다 높거나 동급의 권한으로 변경할 수 없습니다.');
    }
  }

  // 3. 대표운영자 중복 체크
  if (newRole === 'advertiser_admin' || newRole === 'agency_admin') {
    const duplicateCheck = await checkAdminRoleDuplicate(
      newRole,
      targetUser.organization_id,
      targetUser.advertiser_id,
      userId
    );

    if (duplicateCheck.isDuplicate) {
      throw new Error(duplicateCheck.message);
    }
  }

  // 4. 역할 업데이트
  const { data, error } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * 사용자 상태 변경 (액세스 토글)
 * @param {string} userId - 변경할 사용자 ID
 * @param {string} status - 새로운 상태 ('active' | 'inactive')
 * @param {object} currentUser - 현재 로그인한 사용자 정보 (권한 검증용)
 */
export const updateUserStatus = async (userId, status, currentUser = null) => {
  // 1. 대상 사용자 정보 조회
  const { data: targetUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;

  // 2. 권한 검증 (자신과 동급이거나 상위 권한 사용자의 액세스 변경 불가)
  if (currentUser) {
    const roleHierarchy = {
      master: 100,
      specialist: 50,
      agency_admin: 7,
      agency_manager: 6,
      agency_staff: 5,
      advertiser_admin: 4,
      advertiser_staff: 3,
      editor: 2,
      viewer: 1,
    };

    const currentRoleLevel = roleHierarchy[currentUser.role] || 0;
    const targetRoleLevel = roleHierarchy[targetUser.role] || 0;

    // Master가 아닌 경우, 자신보다 높거나 같은 권한을 가진 사용자는 수정 불가 (동급 차단)
    if (currentUser.role !== 'master' && targetRoleLevel >= currentRoleLevel) {
      throw new Error('자신과 동급이거나 상위 권한을 가진 사용자의 액세스는 변경할 수 없습니다.');
    }
  }

  // 3. 상태 업데이트
  const { data, error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * 사용자 역할 및 브랜드 접근 권한 변경
 * @param {string} userId - 변경할 사용자 ID
 * @param {string} newRole - 새로운 역할
 * @param {Array<string>} advertiserIds - 접근 가능한 브랜드 ID 목록
 * @param {object} currentUser - 현재 로그인한 사용자 정보 (권한 검증용)
 */
export const updateUserRoleAndAdvertisers = async (userId, newRole, advertiserIds = [], currentUser = null) => {
  // 1. 대상 사용자 정보 조회
  const { data: targetUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError) throw fetchError;

  // 2. 권한 검증 (updateUserRole과 동일)
  if (currentUser) {
    const roleHierarchy = {
      master: 100,
      specialist: 50,
      agency_admin: 7,
      agency_manager: 6,
      agency_staff: 5,
      advertiser_admin: 4,
      advertiser_staff: 3,
      editor: 2,
      viewer: 1,
    };

    const currentRoleLevel = roleHierarchy[currentUser.role] || 0;
    const targetRoleLevel = roleHierarchy[targetUser.role] || 0;
    const newRoleLevel = roleHierarchy[newRole] || 0;

    // 디버깅 로그
    console.log('[updateUserRoleAndAdvertisers] 권한 체크:', {
      currentUser: currentUser,
      currentUserRole: currentUser.role,
      currentRoleLevel: currentRoleLevel,
      targetUser: { role: targetUser.role, level: targetRoleLevel },
      newRole: { role: newRole, level: newRoleLevel },
      check1: targetRoleLevel >= currentRoleLevel,
      check2: newRoleLevel >= currentRoleLevel
    });

    // Master가 아닌 경우, 자신보다 높거나 같은 권한을 가진 사용자는 수정 불가 (동급 차단)
    if (currentUser.role !== 'master' && targetRoleLevel >= currentRoleLevel) {
      throw new Error('자신과 동급이거나 상위 권한을 가진 사용자는 수정할 수 없습니다.');
    }

    // Master가 아닌 경우, 자신보다 높거나 같은 권한으로 변경 불가 (동급 차단)
    if (currentUser.role !== 'master' && newRoleLevel >= currentRoleLevel) {
      throw new Error('자신보다 높거나 동급의 권한으로 변경할 수 없습니다.');
    }
  }

  // 3. 대표운영자 중복 체크
  if (newRole === 'advertiser_admin' || newRole === 'agency_admin') {
    const duplicateCheck = await checkAdminRoleDuplicate(
      newRole,
      targetUser.organization_id,
      targetUser.advertiser_id,
      userId
    );

    if (duplicateCheck.isDuplicate) {
      throw new Error(duplicateCheck.message);
    }
  }

  // 4. 역할 업데이트
  // specialist로 변경 시 organization_id와 advertiser_id를 null로 설정
  const updateData = { role: newRole };
  if (newRole === 'specialist') {
    updateData.organization_id = null;
    updateData.advertiser_id = null;
  }

  const { error: roleError } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId);

  if (roleError) throw roleError;

  // 5. user_advertisers 업데이트
  // 기존 관계 삭제
  const { error: deleteError } = await supabase
    .from('user_advertisers')
    .delete()
    .eq('user_id', userId);

  if (deleteError) throw deleteError;

  // 새 관계 추가
  if (advertiserIds && advertiserIds.length > 0) {
    const insertData = advertiserIds.map(advertiserId => ({
      user_id: userId,
      advertiser_id: advertiserId,
    }));

    const { error: insertError } = await supabase
      .from('user_advertisers')
      .insert(insertData);

    if (insertError) throw insertError;
  }

  // 6. 업데이트된 사용자 정보 반환
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      organizations(id, name, type),
      advertisers(id, name)
    `)
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * 초대 코드 생성
 * @param {object} inviteData - 초대 정보
 * @returns {object} 생성된 초대 코드 정보
 */
export const createInviteCode = async (inviteData) => {
  // Master 권한 검증 (new_agency 타입 전용)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('인증되지 않은 사용자입니다.');

  if (inviteData.inviteType === 'new_agency') {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'master') {
      throw new Error('대행사 초대는 Master 권한만 가능합니다.');
    }
  }

  const code = `INVITE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

  // 브랜드 이름 조회 (RLS 문제 해결: 초대 코드에 이름 저장)
  let advertiserNames = null;
  if (inviteData.advertiserIds && inviteData.advertiserIds.length > 0) {
    const { data: brandsData } = await supabase
      .from('advertisers')
      .select('id, name')
      .in('id', inviteData.advertiserIds);

    if (brandsData) {
      // advertiserIds 순서대로 이름 배열 생성
      const brandsMap = new Map(brandsData.map(b => [b.id, b.name]));
      advertiserNames = inviteData.advertiserIds.map(id => brandsMap.get(id) || '알 수 없는 브랜드');
    }
  } else if (inviteData.advertiserId) {
    // 단일 브랜드인 경우
    const { data: brandData } = await supabase
      .from('advertisers')
      .select('name')
      .eq('id', inviteData.advertiserId)
      .single();

    if (brandData) {
      advertiserNames = [brandData.name];
    }
  }

  const { data, error } = await supabase
    .from('invitation_codes')
    .insert({
      code: code,
      organization_id: inviteData.organizationId || null,
      advertiser_id: inviteData.advertiserId || null,
      advertiser_ids: inviteData.advertiserIds || null, // 복수 브랜드 지원
      advertiser_names: advertiserNames, // 브랜드 이름 배열 저장
      invited_email: inviteData.email,
      role: inviteData.role,
      created_by: inviteData.createdBy,
      expires_at: expiresAt.toISOString(),
      invite_type: inviteData.inviteType || 'existing_member',
      parent_advertiser_id: inviteData.parentAdvertiserId || null, // NEW: 부모 브랜드 ID
    })
    .select()
    .single();

  if (error) throw error;

  // Edge Function 호출하여 Supabase Auth로 초대 이메일 발송
  try {
    await sendInviteEmail({
      inviteCode: code,
      invitedEmail: inviteData.email,
      inviteType: inviteData.inviteType || 'existing_member',
    });
  } catch (emailError) {
    console.error('Failed to send invite email:', emailError);
    // 이메일 발송 실패해도 초대 코드는 생성됨
  }

  return { ...data, code };
};

/**
 * Edge Function을 통해 초대 이메일 발송
 * @param {object} emailData - 이메일 발송 정보
 */
export const sendInviteEmail = async (emailData) => {
  const { data, error } = await supabase.functions.invoke('send-invite-email', {
    body: emailData,
  });

  if (error) throw error;
  return data;
};

// ============================================
// 데이터베이스 작업 (Database Operations)
// ============================================

/**
 * 테이블에서 모든 데이터 가져오기
 * @param {string} tableName - 테이블 이름
 * @param {object} options - 정렬, 필터 옵션
 */
export const getAllData = async (tableName, options = {}) => {
  let query = supabase.from(tableName).select('*');

  // 정렬
  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? true });
  }

  // 필터
  if (options.filter) {
    Object.entries(options.filter).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  // 제한
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

/**
 * ID로 특정 데이터 가져오기
 */
export const getDataById = async (tableName, id) => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
};

/**
 * 새 데이터 추가
 */
export const insertData = async (tableName, newData) => {
  const { data, error } = await supabase
    .from(tableName)
    .insert([newData])
    .select();

  if (error) throw error;
  return data;
};

/**
 * 데이터 수정
 */
export const updateData = async (tableName, id, updates) => {
  const { data, error } = await supabase
    .from(tableName)
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data;
};

/**
 * 데이터 삭제
 */
export const deleteData = async (tableName, id) => {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('id', id);

  if (error) throw error;
};

/**
 * 요일별 전환수 조회 (일~토 집계)
 */
export const getWeeklyConversions = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  const { data, error } = await supabase.rpc('get_weekday_aggregated', {
    p_advertiser_id: (advertiserId && advertiserId !== 'all') ? advertiserId : null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (error) throw error;

  // 요일별 집계 (0=일요일 ~ 6=토요일)
  const dayConversions = [0, 0, 0, 0, 0, 0, 0];

  (data || []).forEach(row => {
    const dayOfWeek = row.day_of_week;
    dayConversions[dayOfWeek] = Number(row.conversions) || 0;
  });

  // 월~일 순서로 재배열
  return [
    dayConversions[1], // 월
    dayConversions[2], // 화
    dayConversions[3], // 수
    dayConversions[4], // 목
    dayConversions[5], // 금
    dayConversions[6], // 토
    dayConversions[0], // 일
  ];
};

/**
 * 조건에 맞는 데이터 검색
 */
export const searchData = async (tableName, column, searchTerm) => {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .ilike(column, `%${searchTerm}%`);

  if (error) throw error;
  return data;
};

// ============================================
// 스토리지 (Storage)
// ============================================

/**
 * 파일 업로드
 */
export const uploadFile = async (bucketName, filePath, file) => {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file);

  if (error) throw error;
  return data;
};

/**
 * 파일 다운로드 URL 가져오기
 */
export const getFileUrl = (bucketName, filePath) => {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return data.publicUrl;
};

/**
 * 파일 삭제
 */
export const deleteFile = async (bucketName, filePath) => {
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) throw error;
};

// ============================================
// 실시간 구독 (Realtime Subscriptions)
// ============================================

/**
 * 테이블 변경사항 실시간 구독
 */
export const subscribeToTable = (tableName, callback) => {
  const subscription = supabase
    .channel(`${tableName}_changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tableName },
      callback
    )
    .subscribe();

  return subscription;
};

/**
 * 구독 취소
 */
export const unsubscribe = (subscription) => {
  supabase.removeChannel(subscription);
};

// ============================================
// 성과 데이터 조회 (Ad Performance)
// ============================================

/**
 * KPI 집계 데이터 조회
 * @param {object} params - 필터 파라미터
 * @param {string} params.advertiserId - 광고주 ID (선택)
 * @param {string} params.startDate - 시작일 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료일 (YYYY-MM-DD)
 */
export const getKPIData = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  const rpcParams = {
    p_advertiser_id: advertiserId || null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  };

  console.log('[getKPIData] RPC 호출 파라미터:', rpcParams);

  // 서버측 집계 RPC 호출
  const { data, error } = await supabase.rpc('get_kpi_aggregated', rpcParams);

  if (error) throw error;

  console.log('[getKPIData] RPC 응답 데이터:', data);

  // 서버에서 이미 집계됨 - 첫 행 추출
  const totals = data?.[0] || {
    cost: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    conversion_value: 0
  };

  // CVR, ROAS 계산
  totals.cvr = totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0;
  totals.roas = totals.cost > 0 ? totals.conversion_value / totals.cost : 0;

  return totals;
};

/**
 * 일별 광고비 데이터 조회
 * @param {object} params - 필터 파라미터
 */
export const getDailyAdCost = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 서버측 집계 RPC 호출
  const { data, error } = await supabase.rpc('get_daily_aggregated', {
    p_advertiser_id: advertiserId || null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: 'purchase'
  });

  if (error) throw error;

  // [{date, cost}] 형식으로 변환
  return (data || []).map(row => ({
    date: row.date,
    cost: Number(row.cost) || 0,
  }));
};

/**
 * 매체별 광고비 데이터 조회
 * @param {object} params - 필터 파라미터
 */
export const getMediaAdCost = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 서버측 집계 RPC 호출
  const { data, error } = await supabase.rpc('get_media_aggregated', {
    p_advertiser_id: advertiserId || null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: 'purchase'
  });

  if (error) throw error;

  // [{name, value}] 형식으로 변환
  return (data || []).map(row => ({
    name: row.source,
    value: Number(row.cost) || 0,
  }));
};

/**
 * 일별 매출(conversion_value) 데이터 조회
 * @param {object} params - 필터 파라미터
 */
export const getDailyRevenue = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 서버측 집계 RPC 호출
  const { data, error } = await supabase.rpc('get_daily_aggregated', {
    p_advertiser_id: advertiserId || null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: 'purchase'
  });

  if (error) throw error;

  // [{date, revenue}] 형식으로 변환
  return (data || []).map(row => ({
    date: row.date,
    revenue: Number(row.conversion_value) || 0,
  }));
};

/**
 * 매체별 매출(conversion_value) 데이터 조회
 * @param {object} params - 필터 파라미터
 */
export const getMediaRevenue = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 서버측 집계 RPC 호출
  const { data, error } = await supabase.rpc('get_media_aggregated', {
    p_advertiser_id: advertiserId || null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: 'purchase'
  });

  if (error) throw error;

  // [{name, value}] 형식으로 변환
  return (data || []).map(row => ({
    name: row.source,
    value: Number(row.conversion_value) || 0,
  }));
};

/**
 * 매체별 광고 요약 데이터 조회 (테이블용)
 * @param {object} params - 필터 파라미터
 * @param {string} params.advertiserId - 광고주 ID (선택)
 * @param {string} params.startDate - 시작일 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료일 (YYYY-MM-DD)
 */
export const getMediaAdSummary = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  // 서버측 집계 RPC 호출
  const { data, error } = await supabase.rpc('get_media_aggregated', {
    p_advertiser_id: advertiserId || null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (error) throw error;

  // 형식 변환
  return (data || []).map(row => ({
    media: row.source,
    cost: Number(row.cost) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    conversions: Number(row.conversions) || 0,
    conversionValue: Number(row.conversion_value) || 0,
  }));
};

/**
 * 캠페인별 광고 요약 데이터 조회
 * @param {object} params - 필터 파라미터
 * @param {string} params.advertiserId - 광고주 ID (선택)
 * @param {string} params.startDate - 시작일 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료일 (YYYY-MM-DD)
 */
export const getCampaignAdSummary = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  const { data, error } = await supabase.rpc('get_campaign_aggregated', {
    p_advertiser_id: (advertiserId && advertiserId !== 'all') ? advertiserId : null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (error) throw error;

  // 결과를 프론트엔드 형식으로 변환
  return (data || []).map(row => ({
    media: row.source,
    key: row.campaign_name,
    cost: Number(row.cost) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    conversions: Number(row.conversions) || 0,
    conversionValue: Number(row.conversion_value) || 0,
  }));
};

/**
 * 광고그룹별 광고 요약 데이터 조회
 * @param {object} params - 필터 파라미터
 * @param {string} params.advertiserId - 광고주 ID (선택)
 * @param {array} params.availableAdvertiserIds - 접근 가능한 광고주 ID 목록
 * @param {string} params.startDate - 시작일 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료일 (YYYY-MM-DD)
 */
export const getAdGroupAdSummary = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  const { data, error } = await supabase.rpc('get_ad_group_aggregated', {
    p_advertiser_id: (advertiserId && advertiserId !== 'all') ? advertiserId : null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (error) throw error;

  // 결과를 프론트엔드 형식으로 변환
  return (data || []).map(row => ({
    media: row.source,
    key: row.ad_group_name,
    campaignName: row.campaign_name,
    cost: Number(row.cost) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    conversions: Number(row.conversions) || 0,
    conversionValue: Number(row.conversion_value) || 0,
  }));
};

/**
 * 광고별 광고 요약 데이터 조회 (ad_name NULL 처리 포함)
 * @param {object} params - 필터 파라미터
 * @param {string} params.advertiserId - 광고주 ID (선택)
 * @param {array} params.availableAdvertiserIds - 접근 가능한 광고주 ID 목록
 * @param {string} params.startDate - 시작일 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료일 (YYYY-MM-DD)
 */
export const getAdAdSummary = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  const { data, error } = await supabase.rpc('get_ad_aggregated', {
    p_advertiser_id: (advertiserId && advertiserId !== 'all') ? advertiserId : null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (error) throw error;

  // 결과를 프론트엔드 형식으로 변환
  return (data || []).map(row => ({
    media: row.source,
    key: row.ad_name,
    campaignName: row.campaign_name,
    adGroupName: row.ad_group_name,
    hasAdData: row.ad_name !== 'N/A',
    cost: Number(row.cost) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    conversions: Number(row.conversions) || 0,
    conversionValue: Number(row.conversion_value) || 0,
  }));
};

/**
 * 일별 광고 요약 데이터 조회
 * @param {object} params - 필터 파라미터
 * @param {string} params.advertiserId - 광고주 ID (선택)
 * @param {string} params.startDate - 시작일 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료일 (YYYY-MM-DD)
 */
export const getDailyAdSummary = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  // 서버측 집계 RPC 호출
  const { data, error } = await supabase.rpc('get_daily_aggregated', {
    p_advertiser_id: advertiserId || null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (error) throw error;

  // 형식 변환
  return (data || []).map(row => ({
    key: row.date,
    cost: Number(row.cost) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    conversions: Number(row.conversions) || 0,
    conversionValue: Number(row.conversion_value) || 0,
  }));
};

/**
 * 주별 광고 요약 데이터 조회
 * @param {object} params - 필터 파라미터
 * @param {string} params.advertiserId - 광고주 ID (선택)
 * @param {string} params.startDate - 시작일 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료일 (YYYY-MM-DD)
 */
export const getWeeklyAdSummary = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  // 서버측 집계 RPC 호출
  const { data, error } = await supabase.rpc('get_weekly_aggregated', {
    p_advertiser_id: advertiserId || null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (error) throw error;

  // 형식 변환
  return (data || []).map(row => ({
    key: row.week_label,
    cost: Number(row.cost) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    conversions: Number(row.conversions) || 0,
    conversionValue: Number(row.conversion_value) || 0,
  }));
};

/**
 * 월별 광고 요약 데이터 조회
 * @param {object} params - 필터 파라미터
 * @param {string} params.advertiserId - 광고주 ID (선택)
 * @param {string} params.startDate - 시작일 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료일 (YYYY-MM-DD)
 */
export const getMonthlyAdSummary = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  // 서버측 집계 RPC 호출
  const { data, error } = await supabase.rpc('get_monthly_aggregated', {
    p_advertiser_id: advertiserId || null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (error) throw error;

  // 형식 변환
  return (data || []).map(row => ({
    key: row.month_label,
    cost: Number(row.cost) || 0,
    impressions: Number(row.impressions) || 0,
    clicks: Number(row.clicks) || 0,
    conversions: Number(row.conversions) || 0,
    conversionValue: Number(row.conversion_value) || 0,
  }));
};

/**
 * 매체별 ROAS 분석 데이터 조회
 * @param {object} params - 필터 파라미터
 * @param {string} params.advertiserId - 광고주 ID (선택)
 * @param {array} params.availableAdvertiserIds - 접근 가능한 광고주 ID 목록
 * @param {string} params.startDate - 시작일 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료일 (YYYY-MM-DD)
 */
export const getMediaROASAnalysis = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  const { data, error } = await supabase.rpc('get_media_aggregated', {
    p_advertiser_id: (advertiserId && advertiserId !== 'all') ? advertiserId : null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (error) throw error;

  // ROAS 계산 및 배열로 변환
  const mediaArray = (data || []).map(media => ({
    name: media.source,
    roas: media.cost > 0 ? Math.round((Number(media.conversion_value) / Number(media.cost)) * 100) : 0,
  }));

  // ROAS 높은 순으로 정렬
  mediaArray.sort((a, b) => b.roas - a.roas);

  // 최대 ROAS 찾기
  const maxRoas = Math.max(...mediaArray.map(m => m.roas), 1);

  // progress 계산 (최대 ROAS 대비 백분율)
  return mediaArray.map(media => ({
    name: media.name,
    roas: media.roas,
    progress: Math.round((media.roas / maxRoas) * 100),
  }));
};

/**
 * 일별 ROAS 및 광고비 데이터 조회
 * @param {object} params - 필터 파라미터
 */
export const getDailyROASAndCost = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  const { data, error } = await supabase.rpc('get_daily_aggregated', {
    p_advertiser_id: (advertiserId && advertiserId !== 'all') ? advertiserId : null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (error) throw error;

  // [{date, cost, roas}] 형식으로 변환
  return (data || []).map(row => ({
    date: row.date,
    cost: Number(row.cost) || 0,
    roas: row.cost > 0 ? Number(row.conversion_value) / Number(row.cost) : 0,
  }));
};

/**
 * BEST 크리에이티브 조회 (광고비 순 정렬)
 * @param {object} params - 필터 파라미터
 * @param {string} params.advertiserId - 광고주 ID (선택)
 * @param {string} params.startDate - 시작일 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료일 (YYYY-MM-DD)
 * @param {number} params.limit - 조회 개수 (기본값: 6)
 */
export const getBestCreatives = async ({ advertiserId, availableAdvertiserIds, startDate, endDate, limit = 6 }) => {
  // ===== 2025-12-31: Supabase 크리에이티브 데이터 조회 =====

  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  // 1. RPC로 ad_id별 성과 집계
  const { data: performanceData, error: performanceError } = await supabase.rpc('get_creative_aggregated', {
    p_advertiser_id: (advertiserId && advertiserId !== 'all') ? advertiserId : null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (performanceError) throw performanceError;

  // 2. ad_id별 성과 데이터를 객체로 변환
  const aggregatedPerformance = (performanceData || []).reduce((acc, row) => {
    acc[row.ad_id] = {
      ad_id: row.ad_id,
      source: row.source,
      cost: Number(row.cost) || 0,
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      conversions: Number(row.conversions) || 0,
      conversion_value: Number(row.conversion_value) || 0,
    };
    return acc;
  }, {});

  // 3. ad_creatives 데이터 조회 (크리에이티브 정보)
  const adIds = Object.keys(aggregatedPerformance);
  if (adIds.length === 0) {
    return [];
  }

  const { data: creativesData, error: creativesError } = await supabase
    .from('ad_creatives')
    .select('ad_id, ad_name, url, creative_type')
    .in('ad_id', adIds)
    .is('deleted_at', null);

  if (creativesError) throw creativesError;

  // 4. ad_id 기준 중복 제거 (동일 광고에 여러 크리에이티브가 있을 수 있음)
  const uniqueCreatives = Object.values(
    (creativesData || []).reduce((acc, creative) => {
      if (!acc[creative.ad_id]) {
        acc[creative.ad_id] = creative;
      }
      return acc;
    }, {})
  );

  // 5. 성과 + 크리에이티브 JOIN 및 계산
  const joinedData = uniqueCreatives.map(creative => {
    const performance = aggregatedPerformance[creative.ad_id] || {};
    const cost = performance.cost || 0;
    const impressions = performance.impressions || 0;
    const clicks = performance.clicks || 0;
    const conversions = performance.conversions || 0;
    const conversion_value = performance.conversion_value || 0;

    // CTR, ROAS 계산
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const roas = cost > 0 ? (conversion_value / cost) * 100 : 0;

    // creative_type에 따라 이미지/영상 구분
    const isVideo = creative.creative_type === 'video' || creative.creative_type === 'VIDEO';

    // url 컬럼 사용 (이미지/비디오 모두 url에 저장됨)
    const mediaUrl = creative.url || '';

    return {
      ad_id: creative.ad_id,
      adName: creative.ad_name || '광고명 없음',
      media: performance.source || '알 수 없음',
      author: performance.source ? `${performance.source} 광고팀` : '알 수 없음',
      imageUrl: isVideo ? '' : mediaUrl,
      videoUrl: isVideo ? mediaUrl : '',
      isVideo,
      cost,
      conversions,
      ctr: ctr.toFixed(1),
      roas: Math.round(roas),
      currentBid: `₩${Math.round(cost).toLocaleString()}`,
      bidders: [],
      dateRange: `${startDate} ~ ${endDate}`,
    };
  });

  // 6. 전환수 순으로 정렬 (내림차순) 및 상위 N개 선택
  const sorted = joinedData.sort((a, b) => b.conversions - a.conversions);
  return sorted.slice(0, limit);
};

/**
 * 모든 크리에이티브 조회 (페이지네이션용)
 * @param {object} params - 필터 파라미터
 * @param {string} params.advertiserId - 광고주 ID (선택)
 * @param {string} params.startDate - 시작일 (YYYY-MM-DD)
 * @param {string} params.endDate - 종료일 (YYYY-MM-DD)
 */
export const getAllCreatives = async ({ advertiserId, availableAdvertiserIds, startDate, endDate }) => {
  // ===== 2025-12-31: Supabase 크리에이티브 데이터 조회 =====

  // 메타 전환 타입 조회 (단일 광고주인 경우)
  let metaConversionType = 'purchase';
  if (advertiserId && advertiserId !== 'all') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  // 1. RPC로 ad_id별 성과 집계
  const { data: performanceData, error: performanceError } = await supabase.rpc('get_creative_aggregated', {
    p_advertiser_id: (advertiserId && advertiserId !== 'all') ? advertiserId : null,
    p_advertiser_ids: (availableAdvertiserIds && availableAdvertiserIds.length > 0) ? availableAdvertiserIds : null,
    p_start_date: startDate || null,
    p_end_date: endDate || null,
    p_meta_conversion_type: metaConversionType
  });

  if (performanceError) throw performanceError;

  // 2. ad_id별 성과 데이터를 객체로 변환
  const aggregatedPerformance = (performanceData || []).reduce((acc, row) => {
    acc[row.ad_id] = {
      ad_id: row.ad_id,
      source: row.source,
      campaign_name: row.campaign_name,
      cost: Number(row.cost) || 0,
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      conversions: Number(row.conversions) || 0,
      conversion_value: Number(row.conversion_value) || 0,
    };
    return acc;
  }, {});

  // 3. ad_creatives 데이터 조회 (크리에이티브 정보)
  const adIds = Object.keys(aggregatedPerformance);
  if (adIds.length === 0) {
    return [];
  }

  const { data: creativesData, error: creativesError } = await supabase
    .from('ad_creatives')
    .select('ad_id, ad_name, url, creative_type')
    .in('ad_id', adIds)
    .is('deleted_at', null);

  if (creativesError) throw creativesError;

  // 4. ad_id 기준 중복 제거 (동일 광고에 여러 크리에이티브가 있을 수 있음)
  const uniqueCreatives = Object.values(
    (creativesData || []).reduce((acc, creative) => {
      if (!acc[creative.ad_id]) {
        acc[creative.ad_id] = creative;
      }
      return acc;
    }, {})
  );

  // 5. 성과 + 크리에이티브 JOIN 및 계산
  const joinedData = uniqueCreatives.map(creative => {
    const performance = aggregatedPerformance[creative.ad_id] || {};
    const cost = performance.cost || 0;
    const impressions = performance.impressions || 0;
    const clicks = performance.clicks || 0;
    const conversions = performance.conversions || 0;
    const conversion_value = performance.conversion_value || 0;

    // CTR, ROAS 계산
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const roas = cost > 0 ? (conversion_value / cost) * 100 : 0;

    // creative_type에 따라 이미지/영상 구분
    const isVideo = creative.creative_type === 'video' || creative.creative_type === 'VIDEO';

    // url 컬럼 사용 (이미지/비디오 모두 url에 저장됨)
    const mediaUrl = creative.url || '';

    return {
      ad_id: creative.ad_id,
      adName: creative.ad_name || '광고명 없음',
      media: performance.source || '알 수 없음',
      campaign: performance.campaign_name || '캠페인 없음',
      author: performance.source ? `${performance.source} 광고팀` : '알 수 없음',
      imageUrl: isVideo ? '' : mediaUrl,
      videoUrl: isVideo ? mediaUrl : '',
      isVideo,
      cost,
      impressions,
      clicks,
      conversions,
      ctr: ctr.toFixed(1),
      roas: Math.round(roas),
      currentBid: `₩${Math.round(cost).toLocaleString()}`,
      bidders: [],
      dateRange: `${startDate} ~ ${endDate}`,
    };
  });

  // 6. 광고비 순으로 정렬 (내림차순)
  return joinedData.sort((a, b) => b.cost - a.cost);
};

/**
 * 광고별 일자별 성과 데이터 조회 (크리에이티브 상세 모달용)
 * @param {string} adId - 광고 ID
 * @param {string} startDate - 시작일 (YYYY-MM-DD)
 * @param {string} endDate - 종료일 (YYYY-MM-DD)
 * @returns {Array} [{date, cost, impressions, clicks, conversions, conversion_value, ctr, roas}]
 */
export const getAdDailyPerformance = async (adId, startDate, endDate) => {
  // 1. ad_performance에서 advertiser_id, source, campaign_name, ad_group_name 및 데이터 조회
  const { data, error } = await supabase
    .from('ad_performance')
    .select('date, cost, impressions, clicks, conversions, conversion_value, complete_registrations, complete_registrations_value, advertiser_id, source, campaign_name, ad_group_name, ad_name')
    .eq('ad_id', adId)
    .gte('date', startDate)
    .lte('date', endDate)
    .is('deleted_at', null)
    .order('date', { ascending: true });

  if (error) throw error;
  if (!data || data.length === 0) return { dailyData: [], adInfo: null };

  // 2. 광고 기본 정보 추출 (첫 번째 row에서)
  const advertiserId = data[0].advertiser_id;
  const source = data[0].source;
  const adInfo = {
    campaignName: data[0].campaign_name || '',
    adGroupName: data[0].ad_group_name || '',
    adName: data[0].ad_name || '',
    source: source || '',
  };

  // 3. 광고주의 meta_conversion_type 조회
  let metaConversionType = 'purchase';

  if (advertiserId && source === 'Meta') {
    const { data: advertiserData } = await supabase
      .from('advertisers')
      .select('meta_conversion_type')
      .eq('id', advertiserId)
      .single();
    metaConversionType = advertiserData?.meta_conversion_type || 'purchase';
  }

  // 4. 메타 광고이고 complete_registration이면 해당 컬럼 사용
  const useRegistration = source === 'Meta' && metaConversionType === 'complete_registration';

  // 5. 날짜별 집계 (동일 날짜 여러 행 가능)
  const aggregatedByDate = (data || []).reduce((acc, row) => {
    const dateKey = row.date;
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        cost: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversion_value: 0,
      };
    }
    acc[dateKey].cost += Number(row.cost) || 0;
    acc[dateKey].impressions += Number(row.impressions) || 0;
    acc[dateKey].clicks += Number(row.clicks) || 0;
    // 메타 회원가입 전환 설정 적용
    acc[dateKey].conversions += useRegistration
      ? (Number(row.complete_registrations) || 0)
      : (Number(row.conversions) || 0);
    acc[dateKey].conversion_value += useRegistration
      ? (Number(row.complete_registrations_value) || 0)
      : (Number(row.conversion_value) || 0);
    return acc;
  }, {});

  // 6. CTR, ROAS 계산
  const dailyData = Object.values(aggregatedByDate).map(row => ({
    date: row.date,
    cost: row.cost,
    impressions: row.impressions,
    clicks: row.clicks,
    conversions: row.conversions,
    conversion_value: row.conversion_value,
    ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
    roas: row.cost > 0 ? (row.conversion_value / row.cost) * 100 : 0,
  }));

  return { dailyData, adInfo };
};

// ============================================
// API 토큰 관리 (API Tokens)
// ============================================

/**
 * API 토큰 목록 조회 (integrations 테이블)
 * @param {string} advertiserId - 광고주 ID (선택, 클라이언트용)
 * @returns {Array} API 토큰 목록 (camelCase 변환됨, 토큰 값 노출 안 함)
 */
export const getApiTokens = async (advertiserId = null) => {
  let query = supabase
    .from('integrations')
    .select(`
      *,
      advertisers(name)
    `)
    .eq('integration_type', 'token')
    .is('deleted_at', null);

  // 클라이언트는 자신의 토큰만 조회
  if (advertiserId) {
    query = query.eq('advertiser_id', advertiserId);
  }

  const { data, error } = await query;
  if (error) throw error;

  // snake_case → camelCase 변환
  return (data || []).map(token => ({
    id: token.id,
    advertiserId: token.advertiser_id,
    advertiser: token.advertisers?.name || '',
    platform: token.platform,
    customerId: token.legacy_customer_id,
    managerAccountId: token.legacy_manager_account_id,
    targetConversionActionId: token.legacy_target_conversion_action_id || [],
    clientId: token.legacy_client_id,
    accountId: token.legacy_account_id,
    status: token.status,
    dataCollectionStatus: token.data_collection_status,
    lastUpdated: token.last_checked ? new Date(token.last_checked).toISOString().split('T')[0].replace(/-/g, '.') : '',
    createdAt: token.created_at,
    updatedAt: token.updated_at,
    hasAccessToken: !!token.oauth_access_token_encrypted,
    hasRefreshToken: !!token.oauth_refresh_token_encrypted,
    hasDeveloperToken: false,
    hasClientSecret: false,
    hasSecretKey: false,
  }));
};

/**
 * API 토큰 생성 (Vault 연동)
 * @param {object} tokenData - 토큰 데이터 (camelCase)
 * @returns {object} 생성된 토큰
 */
export const createApiToken = async (tokenData) => {
  // 1. integrations 레코드 먼저 생성 (평문 토큰 없이)
  const dbData = {
    advertiser_id: tokenData.advertiserId,
    platform: tokenData.platform,
    integration_type: 'token', // Token 타입
    status: tokenData.status || 'active',
    account_description: tokenData.accountDescription || null, // 계정 설명 추가
    legacy_customer_id: tokenData.customerId,
    legacy_manager_account_id: tokenData.managerAccountId,
    legacy_target_conversion_action_id: tokenData.targetConversionActionId || null,
    legacy_client_id: tokenData.clientId,
    legacy_account_id: tokenData.accountId,
  };

  const { data: insertedToken, error: insertError } = await supabase
    .from('integrations')
    .insert([dbData])
    .select()
    .single();

  if (insertError) throw insertError;

  // 2. Vault에 민감 정보 저장 (직접 fetch 호출)
  try {
    const credentials = {};
    if (tokenData.apiToken) credentials.access_token = tokenData.apiToken;
    if (tokenData.refreshToken) credentials.refresh_token = tokenData.refreshToken;
    if (tokenData.developerToken) credentials.developer_token = tokenData.developerToken;
    if (tokenData.clientSecret) credentials.client_secret = tokenData.clientSecret;
    if (tokenData.secretKey) credentials.secret_key = tokenData.secretKey;

    // Edge Function 호출 (Authorization 헤더에 anon key 사용)
    const response = await fetch(
      `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/vault-store-secrets`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': process.env.REACT_APP_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          integration_id: insertedToken.id,
          platform: tokenData.platform,
          credentials,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Vault 저장 실패:', errorData);
      await supabase.from('integrations').delete().eq('id', insertedToken.id);
      throw new Error(`Vault 저장 실패: ${errorData.error || response.statusText}`);
    }

    const vaultResult = await response.json();
    console.log('Vault 저장 성공:', vaultResult);
  } catch (vaultErr) {
    // 롤백: 생성된 레코드 삭제
    await supabase.from('integrations').delete().eq('id', insertedToken.id);
    throw vaultErr;
  }

  return insertedToken;
};

/**
 * API 토큰 수정 (integrations 테이블)
 * @param {string} tokenId - 토큰 ID
 * @param {object} tokenData - 수정할 데이터 (camelCase)
 * @returns {object} 수정된 토큰
 */
export const updateApiToken = async (tokenId, tokenData) => {
  // camelCase → snake_case 변환 (integrations 테이블 컬럼명)
  const dbData = {
    advertiser_id: tokenData.advertiserId,
    platform: tokenData.platform,
    account_description: tokenData.accountDescription || null, // 계정 설명 추가
    legacy_customer_id: tokenData.customerId,
    legacy_manager_account_id: tokenData.managerAccountId,
    legacy_target_conversion_action_id: tokenData.targetConversionActionId || null,
    legacy_client_id: tokenData.clientId,
    legacy_account_id: tokenData.accountId,
    status: tokenData.status,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('integrations')
    .update(dbData)
    .eq('id', tokenId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

/**
 * API 토큰 삭제 (Hard delete, integrations 테이블)
 * @param {string} tokenId - 토큰 ID
 */
export const deleteApiToken = async (tokenId) => {
  const { error } = await supabase
    .from('integrations')
    .delete()
    .eq('id', tokenId);

  if (error) throw error;
};

// ============================================
// 사용자 통계 (User Statistics)
// ============================================

/**
 * 사용자 통계 조회
 * @returns {object} 총 사용자, 관리자 계정, 활성 사용자 수
 */
export const getUserStats = async () => {
  // 총 사용자 수 (master 제외)
  const { count: totalUsers, error: totalError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .neq('role', 'master')
    .is('deleted_at', null);

  if (totalError) throw totalError;

  // 관리자 계정 수 (agency_admin, agency_manager, advertiser_admin, advertiser_staff) - master 제외
  const { count: adminUsers, error: adminError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .in('role', ['agency_admin', 'agency_manager', 'advertiser_admin', 'advertiser_staff'])
    .is('deleted_at', null);

  if (adminError) throw adminError;

  // 활성 사용자 수 (status = 'active', master 제외)
  const { count: activeUsers, error: activeError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .neq('role', 'master')
    .is('deleted_at', null);

  if (activeError) throw activeError;

  return {
    totalUsers: totalUsers || 0,
    adminUsers: adminUsers || 0,
    activeUsers: activeUsers || 0,
  };
};

// ============================================
// 게시판 (Board)
// ============================================

/**
 * 게시글 목록 조회
 * @param {string} boardType - 게시판 타입 ('admin' | 'brand')
 * @param {string} userId - 현재 사용자 ID
 * @param {string} advertiserId - 광고주 ID (brand 게시판용)
 * @returns {Array} 게시글 목록
 */
export const getBoardPosts = async (
  boardType,
  userId,
  advertiserId = null,
  userRole = null,
  availableAdvertisers = []
) => {
  // 시스템 정의 대상 (브랜드명이 아님)
  const SYSTEM_TARGETS = ['모든 사용자', '대행사 소속', '모든 브랜드', '내 브랜드'];

  // 슈퍼어드민 역할
  const SUPER_ADMIN_ROLES = ['master', 'agency_admin', 'agency_manager'];

  // target_roles 필터링 함수
  const filterTargetRoles = (targetRoles, userRole, availableAdvertisers) => {
    if (!targetRoles || targetRoles.length === 0) {
      return ['모든 사용자'];
    }

    // 슈퍼어드민은 필터링 없이 모든 대상 반환
    if (SUPER_ADMIN_ROLES.includes(userRole)) {
      return targetRoles;
    }

    // 일반 사용자: 시스템 대상 + 자신의 브랜드만 필터링
    const availableAdvertiserNames = (availableAdvertisers || []).map(adv => adv.name);

    return targetRoles.filter(target => {
      // 시스템 대상은 항상 포함
      if (SYSTEM_TARGETS.includes(target)) {
        return true;
      }
      // 사용자가 접근 가능한 브랜드만 포함
      return availableAdvertiserNames.includes(target);
    });
  };

  let data = [];

  if (boardType === 'brand' && advertiserId) {
    // 브랜드 게시판: advertiser_group_id를 고려한 그룹 공유

    // 1. 현재 브랜드의 advertiser_group_id 조회
    const { data: currentAdvertiser } = await supabase
      .from('advertisers')
      .select('advertiser_group_id')
      .eq('id', advertiserId)
      .single();

    const groupId = currentAdvertiser?.advertiser_group_id;
    let allGroupBrandIds = [advertiserId];

    // 2. 같은 그룹의 모든 브랜드 ID 조회
    if (groupId) {
      const { data: groupBrands } = await supabase
        .from('advertisers')
        .select('id')
        .eq('advertiser_group_id', groupId);

      allGroupBrandIds = [...allGroupBrandIds, ...(groupBrands || []).map(adv => adv.id)];
      allGroupBrandIds = [...new Set(allGroupBrandIds)];
    }

    // 3. 브랜드 게시글 조회 (그룹 내 모든 브랜드의 게시글)
    const { data: brandPosts, error: brandError } = await supabase
      .from('board_posts')
      .select(`
        *,
        users!board_posts_created_by_fkey(name, email, role)
      `)
      .eq('board_type', 'brand')
      .in('advertiser_id', allGroupBrandIds)
      .is('deleted_at', null);

    if (brandError) throw brandError;

    // 4. admin 게시글 조회
    const { data: adminPosts, error: adminError } = await supabase
      .from('board_posts')
      .select(`
        *,
        users!board_posts_created_by_fkey(name, email, role)
      `)
      .eq('board_type', 'admin')
      .is('deleted_at', null);

    if (adminError) throw adminError;

    // admin 게시글 중 그룹 내 브랜드 대상인 것만 필터링
    const filteredAdminPosts = (adminPosts || []).filter(post => {
      // target_advertiser_ids가 null이면 모든 사용자 대상 (표시)
      if (!post.target_advertiser_ids || post.target_advertiser_ids.length === 0) {
        return true;
      }
      // target_advertiser_ids에 그룹 내 브랜드 ID가 포함되어 있는지 확인
      return post.target_advertiser_ids.some(id => allGroupBrandIds.includes(id));
    });

    // 두 목록을 합치고 날짜순 정렬
    data = [...(brandPosts || []), ...filteredAdminPosts].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );
  } else {
    // admin 게시판: 기존 로직
    const query = supabase
      .from('board_posts')
      .select(`
        *,
        users!board_posts_created_by_fkey(name, email, role)
      `)
      .eq('board_type', boardType)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    const { data: posts, error } = await query;
    if (error) throw error;
    data = posts || [];
  }

  // admin 게시판에서 advertiserId가 있으면 필터링
  let filteredData = data;
  if (boardType === 'admin') {
    if (advertiserId) {
      // 특정 브랜드 선택 시
      filteredData = data.filter(post => {
        // target_advertiser_ids가 null이면 모든 사용자 대상 (표시)
        if (!post.target_advertiser_ids || post.target_advertiser_ids.length === 0) {
          return true;
        }
        // target_advertiser_ids에 현재 브랜드 ID가 포함되어 있는지 확인
        return post.target_advertiser_ids.includes(advertiserId);
      });
    } else if (availableAdvertisers && availableAdvertisers.length > 0) {
      // 전체 브랜드 선택 시 (접근 가능한 브랜드 있음)
      const availableIds = availableAdvertisers.map(adv => adv.id);
      filteredData = data.filter(post => {
        // target_advertiser_ids가 null이면 모든 사용자 대상 (표시)
        if (!post.target_advertiser_ids || post.target_advertiser_ids.length === 0) {
          return true;
        }
        // target_advertiser_ids에 접근 가능한 브랜드가 하나라도 포함되어 있는지 확인
        return post.target_advertiser_ids.some(id => availableIds.includes(id));
      });
    } else {
      // 접근 가능한 브랜드가 없는 경우 (빈 배열)
      filteredData = data.filter(post => {
        // target_advertiser_ids가 null인 것만 표시 (모든 사용자 대상)
        return !post.target_advertiser_ids || post.target_advertiser_ids.length === 0;
      });
    }
  }

  // 읽음 상태 조회
  const postIds = filteredData.map(post => post.id);
  let readStatus = {};

  if (postIds.length > 0 && userId) {
    const { data: readData, error: readError } = await supabase
      .from('board_read_status')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds);

    if (!readError && readData) {
      readStatus = readData.reduce((acc, item) => {
        acc[item.post_id] = true;
        return acc;
      }, {});
    }
  }

  // 게시글 데이터 변환
  return filteredData.map(post => ({
    id: post.id,
    title: post.title,
    content: post.content,
    author: post.users?.name || post.users?.email || '관리자',
    authorEmail: post.users?.email || '',
    authorRole: post.users?.role || null,
    date: new Date(post.created_at).toISOString().split('T')[0],
    targets: filterTargetRoles(
      post.target_roles,
      userRole,
      availableAdvertisers
    ),  // 서버 사이드 필터링 적용
    isRead: readStatus[post.id] || false,
    createdBy: post.created_by,
  }));
};

/**
 * 게시글 생성
 * @param {object} postData - 게시글 데이터
 * @returns {object} 생성된 게시글
 */
export const createBoardPost = async (postData) => {
  console.log('[createBoardPost] 호출됨:', postData);

  // advertiser_group_id 조회
  let groupId = null;

  if (postData.advertiserId) {
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('advertiser_group_id')
      .eq('id', postData.advertiserId)
      .single();

    groupId = advertiser?.advertiser_group_id;
  }

  const insertData = {
    title: postData.title,
    content: postData.content,
    board_type: postData.boardType,
    advertiser_id: postData.advertiserId || null,
    target_roles: postData.targets,
    target_advertiser_ids: postData.targetAdvertiserIds || null,
    advertiser_group_id: groupId, // NEW: 그룹 ID 설정
    created_by: postData.createdBy,
  };

  console.log('[createBoardPost] INSERT 데이터:', insertData);

  const { data, error} = await supabase
    .from('board_posts')
    .insert([insertData])
    .select()
    .single();

  if (error) {
    console.error('[createBoardPost] 에러 발생:', error);
    console.error('[createBoardPost] 에러 상세:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    throw error;
  }

  console.log('[createBoardPost] 성공:', data);
  return data;
};

/**
 * 게시글 읽음 처리
 * @param {string} postId - 게시글 ID
 * @param {string} userId - 사용자 ID
 */
export const markPostAsRead = async (postId, userId) => {
  // 이미 읽음 상태인지 확인
  const { data: existing } = await supabase
    .from('board_read_status')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();

  if (existing) return; // 이미 읽음 처리됨

  const { error } = await supabase
    .from('board_read_status')
    .insert([{
      post_id: postId,
      user_id: userId,
      read_at: new Date().toISOString(),
    }]);

  if (error) throw error;
};

/**
 * 게시글 삭제 (hard delete)
 * @param {string} postId - 게시글 ID
 */
export const deleteBoardPost = async (postId) => {
  console.log('[deleteBoardPost] 삭제 요청:', postId);

  const { data, error } = await supabase
    .from('board_posts')
    .delete()
    .eq('id', postId)
    .select();

  console.log('[deleteBoardPost] 응답:', { data, error });

  if (error) throw error;

  return data;
};

/**
 * 직급 체계 확인 함수
 * @param {string} userRole - 현재 사용자 역할
 * @param {string} authorRole - 작성자 역할
 * @param {string} userId - 현재 사용자 ID
 * @param {string} authorId - 작성자 ID
 * @returns {boolean} - 현재 사용자가 삭제 권한이 있는지
 */
export const canDeletePost = (userRole, authorRole, userId, authorId) => {
  // 본인이 작성한 글은 삭제 가능
  if (userId === authorId) return true;

  const roleHierarchy = {
    master: 8,
    agency_admin: 7,
    org_admin: 7,
    agency_manager: 6,
    org_manager: 6,
    agency_staff: 5,
    org_staff: 5,
    advertiser_admin: 4,
    manager: 3,
    editor: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const authorLevel = roleHierarchy[authorRole] || 0;

  // master는 모든 글 삭제 가능
  if (userRole === 'master') return true;

  // 자기보다 높거나 같은 레벨은 삭제 불가
  return userLevel > authorLevel;
};

/**
 * 접근 가능한 브랜드(advertiser) 목록 조회 (브랜드 추가용)
 * @param {Object} currentUser - 현재 사용자 정보
 * @returns {Array} - 브랜드 목록
 */
export const getAdvertiserOrganizations = async (currentUser) => {
  console.log('[getAdvertiserOrganizations] 조회 시작:', currentUser);

  // master, agency_admin, agency_manager만 접근 가능
  if (!['master', 'agency_admin', 'agency_manager'].includes(currentUser.role)) {
    throw new Error('브랜드 목록 조회 권한이 없습니다.');
  }

  let query = supabase
    .from('advertisers')
    .select(`
      id,
      name,
      organization_id,
      users!inner(
        id,
        email,
        name,
        role
      )
    `)
    .eq('users.role', 'advertiser_admin');

  // agency_admin, agency_manager는 자신의 조직이 관리하는 브랜드만 조회
  if (currentUser.role !== 'master' && currentUser.organization_id) {
    query = query.eq('organization_id', currentUser.organization_id);
  }

  query = query.order('name', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('[getAdvertiserOrganizations] 에러:', error);
    throw error;
  }

  // 데이터 변환: 각 브랜드의 관리자 정보 추출
  const brands = (data || []).map(adv => {
    const admin = adv.users && adv.users.length > 0 ? adv.users[0] : null;
    return {
      id: adv.id,
      name: adv.name,
      organizationId: adv.organization_id,
      adminEmail: admin?.email || null,
      adminName: admin?.name || null,
    };
  });

  console.log('[getAdvertiserOrganizations] 조회 완료:', brands);
  return brands;
};

// ============================================
// 회원 탈퇴 (Account Deletion)
// ============================================

/**
 * 브랜드의 다른 사용자 목록 조회 (소유권 이전용)
 * @param {string} advertiserId - 브랜드 ID
 * @param {string} excludeUserId - 제외할 사용자 ID (현재 사용자)
 * @returns {Promise<Array>} - 사용자 목록
 */
export const getBrandUsersForTransfer = async (advertiserId, excludeUserId) => {
  console.log('[getBrandUsersForTransfer] 조회 시작:', { advertiserId, excludeUserId });

  try {
    const { data, error } = await supabase.functions.invoke('get-brand-users', {
      body: {
        advertiser_id: advertiserId,
        exclude_user_id: excludeUserId
      }
    });

    if (error) {
      console.error('[getBrandUsersForTransfer] 에러:', error);
      throw error;
    }

    console.log('[getBrandUsersForTransfer] 조회 완료:', data);
    return data.users || [];
  } catch (error) {
    console.error('[getBrandUsersForTransfer] 예외 발생:', error);
    throw error;
  }
};

/**
 * 사용자 계정 삭제
 * @param {string} userId - 삭제할 사용자 ID
 * @param {string|null} newOwnerId - 새 소유자 ID (advertiser_admin인 경우 필수)
 * @returns {Promise<Object>} - 삭제 결과
 */
export const deleteUserAccount = async (userId, newOwnerId = null) => {
  console.log('[deleteUserAccount] 삭제 시작:', { userId, newOwnerId });

  try {
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: {
        user_id: userId,
        new_owner_id: newOwnerId
      }
    });

    if (error) {
      console.error('[deleteUserAccount] 에러:', error);
      throw error;
    }

    console.log('[deleteUserAccount] 삭제 완료:', data);
    return data;
  } catch (error) {
    console.error('[deleteUserAccount] 예외 발생:', error);
    throw error;
  }
};

/**
 * 사용자 삭제 가능 여부 확인
 * @param {Object} user - 사용자 객체
 * @returns {Object} - { canDelete: boolean, reason?: string }
 */
export const canDeleteUser = (user) => {
  // Master 계정은 삭제 불가
  if (user.role === 'master') {
    return {
      canDelete: false,
      reason: 'Master 계정은 삭제할 수 없습니다.'
    };
  }

  return { canDelete: true };
};

/**
 * 브랜드 삭제
 * @param {string} brandId - 삭제할 브랜드 ID
 * @param {string} brandName - 브랜드명 (로그 기록용)
 * @returns {Promise<Object>} - 삭제 결과
 */
export const deleteBrand = async (brandId, brandName) => {
  try {
    console.log('[deleteBrand] 삭제 시작:', { brandId, brandName });

    // 1. 브랜드 전용 사용자 목록 조회 (에이전시 직원 제외)
    const { data: usersToDelete, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('advertiser_id', brandId)
      .not('role', 'in', '(master,agency_staff,agency_admin,agency_manager)');

    if (usersError) {
      console.error('[deleteBrand] 사용자 조회 실패:', usersError);
      throw usersError;
    }

    console.log('[deleteBrand] 삭제할 사용자:', usersToDelete?.length || 0, usersToDelete);

    // 2. api_tokens에 deleted_advertiser_name 저장
    const { error: updateError } = await supabase
      .from('api_tokens')
      .update({ deleted_advertiser_name: brandName })
      .eq('advertiser_id', brandId);

    if (updateError) {
      console.warn('[deleteBrand] api_tokens 업데이트 실패 (비치명적):', updateError);
    }

    // 3. 브랜드 삭제 (RLS 정책 통과를 위해 사용자 삭제 전에!)
    // RLS 정책: DELETE 시 auth.uid()에 해당하는 users 레코드 필요
    const { data: deleteData, error: deleteError } = await supabase
      .from('advertisers')
      .delete()
      .eq('id', brandId);

    if (deleteError) {
      console.error('[deleteBrand] ✗ 브랜드 삭제 실패:', deleteError);
      throw new Error(`브랜드 삭제 실패: ${deleteError.message}`);
    }

    console.log('[deleteBrand] ✓ 브랜드 삭제 완료');

    // 4. 사용자들 삭제 (delete-user Edge Function 사용)
    const { data: { session } } = await supabase.auth.getSession();

    let deletedUsers = [];
    let failedUsers = [];

    if (!session) {
      console.warn('[deleteBrand] ⚠️ 세션 없음 - 사용자 삭제 건너뜀');
    } else if (usersToDelete && usersToDelete.length > 0) {
      const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
      const functionUrl = `${SUPABASE_URL}/functions/v1/delete-user`;

      // 현재 로그인한 사용자를 마지막에 삭제하기 위해 순서 조정
      // (현재 사용자 삭제 시 JWT 토큰이 무효화되어 다음 요청 실패)
      const currentUserId = session.user.id;
      const otherUsers = usersToDelete.filter(u => u.id !== currentUserId);
      const currentUser = usersToDelete.find(u => u.id === currentUserId);
      const orderedUsers = currentUser ? [...otherUsers, currentUser] : usersToDelete;

      console.log('[deleteBrand] 삭제 순서:', orderedUsers.map(u => `${u.email} ${u.id === currentUserId ? '(현재 사용자)' : ''}`));

      for (const user of orderedUsers) {
        try {
          console.log(`[deleteBrand] 사용자 삭제 중: ${user.email}`);

          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              is_brand_deletion: true
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            console.error(`[deleteBrand] ✗ ${user.email} 삭제 실패:`, result);
            failedUsers.push(user.email);
          } else {
            console.log(`[deleteBrand] ✓ ${user.email} 삭제 완료`);
            deletedUsers.push(user.email);
          }
        } catch (fetchError) {
          console.error(`[deleteBrand] ✗ ${user.email} 삭제 실패:`, fetchError);
          failedUsers.push(user.email);
        }
      }
    }

    console.log('[deleteBrand] 삭제 완료:', {
      brand: brandName,
      deletedUsers: deletedUsers.length,
      users: deletedUsers,
      failedUsers: failedUsers.length
    });

    return {
      success: true,
      data: deleteData,
      deletedUsers: deletedUsers,
      failedUsers: failedUsers
    };

  } catch (error) {
    console.error('[deleteBrand] 예외 발생:', error);
    throw error;
  }
};

/**
 * 브랜드 삭제 가능 여부 확인
 * @param {string} userId - 사용자 ID
 * @param {string} brandId - 브랜드 ID
 * @returns {Promise<Object>} - { canDelete: boolean, reason?: string }
 */
export const canDeleteBrand = async (userId, brandId) => {
  try {
    // 사용자 정보 조회
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, advertiser_id, organization_id')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // master는 무조건 삭제 가능
    if (userData.role === 'master') {
      return { canDelete: true };
    }

    // agency_admin: 자신의 조직에 속한 브랜드만
    if (userData.role === 'agency_admin') {
      const { data: brandData, error: brandError } = await supabase
        .from('advertisers')
        .select('organization_id')
        .eq('id', brandId)
        .single();

      if (brandError) throw brandError;

      if (brandData.organization_id === userData.organization_id) {
        return { canDelete: true };
      } else {
        return {
          canDelete: false,
          reason: '다른 조직의 브랜드는 삭제할 수 없습니다.'
        };
      }
    }

    // advertiser_admin: 자신의 브랜드만
    if (userData.role === 'advertiser_admin') {
      if (userData.advertiser_id === brandId) {
        return { canDelete: true };
      } else {
        return {
          canDelete: false,
          reason: '다른 브랜드는 삭제할 수 없습니다.'
        };
      }
    }

    return {
      canDelete: false,
      reason: '브랜드를 삭제할 권한이 없습니다.'
    };
  } catch (error) {
    console.error('[canDeleteBrand] 권한 확인 실패:', error);
    throw error;
  }
};

// ============================================================================
// Changelog 관련 함수
// ============================================================================

/**
 * 변경 로그 기록
 * @param {Object} logData - 로그 데이터
 * @param {string} logData.targetType - 'user', 'token', 'brand', 'access', 'role'
 * @param {string} logData.targetId - 대상 엔티티 ID
 * @param {string} logData.targetName - 대상 이름
 * @param {string} logData.actionType - 'create', 'delete', 'update', 'invite'
 * @param {string} logData.actionDetail - 구체적인 변경 내용
 * @param {string} logData.advertiserId - 브랜드 ID (선택)
 * @param {string} logData.advertiserName - 브랜드 이름 (선택)
 * @param {string} logData.organizationId - 조직 ID (선택)
 * @param {string} logData.organizationName - 조직 이름 (선택)
 * @param {Object} logData.oldValue - 변경 전 값 (선택)
 * @param {Object} logData.newValue - 변경 후 값 (선택)
 */
export async function logChangelog(logData) {
  try {
    const { data, error } = await supabase.rpc('log_changelog', {
      p_target_type: logData.targetType,
      p_target_id: logData.targetId || null,
      p_target_name: logData.targetName,
      p_action_type: logData.actionType,
      p_action_detail: logData.actionDetail,
      p_advertiser_id: logData.advertiserId || null,
      p_advertiser_name: logData.advertiserName || null,
      p_organization_id: logData.organizationId || null,
      p_organization_name: logData.organizationName || null,
      p_old_value: logData.oldValue || null,
      p_new_value: logData.newValue || null,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[logChangelog] Error:', error);
    // 로그 기록 실패는 메인 작업을 중단시키지 않음
    return null;
  }
}

/**
 * 변경 로그 조회 (권한별 자동 필터링)
 * @param {Object} filters - 필터 옵션
 * @param {number} filters.limit - 조회 개수 (기본: 100)
 * @param {number} filters.offset - 오프셋 (기본: 0)
 * @param {string} filters.targetType - 대상 타입 필터 (선택)
 * @param {string} filters.actionType - 작업 타입 필터 (선택)
 * @param {string} filters.startDate - 시작일 (선택)
 * @param {string} filters.endDate - 종료일 (선택)
 */
export async function getChangelogs(filters = {}) {
  try {
    let query = supabase
      .from('changelog')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // 필터 적용
    if (filters.targetType) {
      query = query.eq('target_type', filters.targetType);
    }

    if (filters.actionType) {
      query = query.eq('action_type', filters.actionType);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // 페이지네이션
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      changelogs: data || [],
      totalCount: count || 0,
    };
  } catch (error) {
    console.error('[getChangelogs] Error:', error);
    throw error;
  }
}

// ============================================================================
// 에이전시 삭제 관련 함수
// ============================================================================

/**
 * 에이전시 삭제 확인 이메일 발송
 * @param {string} organizationId - 조직 ID
 * @param {string} organizationName - 조직명
 * @returns {Promise<Object>} - { success: boolean, expires_at: string }
 */
export const sendAgencyDeletionEmail = async (organizationId, organizationName) => {
  try {
    console.log('[sendAgencyDeletionEmail] 이메일 발송 시작:', { organizationId, organizationName });

    const { data, error } = await supabase.functions.invoke('send-agency-deletion-email', {
      body: {
        organization_id: organizationId,
        organization_name: organizationName
      }
    });

    if (error) {
      console.error('[sendAgencyDeletionEmail] 에러:', error);
      throw error;
    }

    console.log('[sendAgencyDeletionEmail] 발송 완료:', data);
    return data;
  } catch (error) {
    console.error('[sendAgencyDeletionEmail] 예외 발생:', error);
    throw error;
  }
};

/**
 * 에이전시 삭제 확인 코드 검증
 * @param {string} code - 확인 코드 (VERIFY-XXXXXX)
 * @param {string} organizationId - 조직 ID
 * @returns {Promise<Object>} - { valid: boolean, reason?: string }
 */
export const verifyAgencyDeletionCode = async (code, organizationId) => {
  try {
    console.log('[verifyAgencyDeletionCode] 코드 검증 시작:', { code, organizationId });

    const { data, error } = await supabase
      .from('agency_deletion_codes')
      .select('*')
      .eq('code', code)
      .eq('organization_id', organizationId)
      .is('used_at', null)
      .single();

    if (error) {
      console.error('[verifyAgencyDeletionCode] 조회 에러:', error);
      return { valid: false, reason: '유효하지 않은 코드입니다.' };
    }

    if (!data) {
      return { valid: false, reason: '코드를 찾을 수 없습니다.' };
    }

    // 만료 확인
    const expiresAt = new Date(data.expires_at);
    const now = new Date();

    if (now > expiresAt) {
      return { valid: false, reason: '코드가 만료되었습니다. 새 코드를 발급받으세요.' };
    }

    // 사용 처리
    const { error: updateError } = await supabase
      .from('agency_deletion_codes')
      .update({ used_at: now.toISOString() })
      .eq('id', data.id);

    if (updateError) {
      console.error('[verifyAgencyDeletionCode] 사용 처리 실패:', updateError);
      return { valid: false, reason: '코드 처리 중 오류가 발생했습니다.' };
    }

    console.log('[verifyAgencyDeletionCode] 검증 완료');
    return { valid: true };
  } catch (error) {
    console.error('[verifyAgencyDeletionCode] 예외 발생:', error);
    return { valid: false, reason: '코드 검증 중 오류가 발생했습니다.' };
  }
};

/**
 * 에이전시 삭제
 * @param {string} organizationId - 조직 ID
 * @param {string} organizationName - 조직명 (로그용)
 * @returns {Promise<Object>} - 삭제 결과
 */
export const deleteAgency = async (organizationId, organizationName) => {
  try {
    console.log('[deleteAgency] 삭제 시작:', { organizationId, organizationName });

    // 1. 조직 정보 조회
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        advertisers (
          id,
          name
        )
      `)
      .eq('id', organizationId)
      .single();

    if (orgError) {
      console.error('[deleteAgency] 조직 조회 실패:', orgError);
      throw orgError;
    }

    console.log('[deleteAgency] 조직 정보:', orgData);
    console.log('[deleteAgency] 소속 브랜드 수:', orgData.advertisers?.length || 0);

    // 2. 소속 브랜드 모두 삭제
    let deletedBrands = [];
    let failedBrands = [];

    if (orgData.advertisers && orgData.advertisers.length > 0) {
      for (const brand of orgData.advertisers) {
        try {
          console.log(`[deleteAgency] 브랜드 삭제 중: ${brand.name}`);

          // deleteBrand 함수 재사용 (브랜드 전용 사용자 삭제 + 에이전시 직원 보호)
          await deleteBrand(brand.id, brand.name);

          deletedBrands.push(brand.name);
          console.log(`[deleteAgency] ✓ 브랜드 삭제 완료: ${brand.name}`);
        } catch (error) {
          console.error(`[deleteAgency] ✗ 브랜드 삭제 실패: ${brand.name}`, error);
          failedBrands.push(brand.name);
        }
      }
    }

    console.log('[deleteAgency] 브랜드 삭제 완료:', {
      total: orgData.advertisers?.length || 0,
      success: deletedBrands.length,
      failed: failedBrands.length
    });

    // 3. 에이전시 직원 목록 조회
    const { data: usersToDelete, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('organization_id', organizationId);

    if (usersError) {
      console.error('[deleteAgency] 직원 조회 실패:', usersError);
      throw usersError;
    }

    console.log('[deleteAgency] 삭제할 직원:', usersToDelete?.length || 0, usersToDelete);

    // 4. 에이전시 직원 삭제 (현재 사용자 제외)
    // 이유: 현재 사용자를 먼저 삭제하면 RLS 정책 검증 실패로 조직 삭제 불가
    // 조직 삭제 시 CASCADE DELETE로 현재 사용자도 자동 삭제됨
    const { data: { session } } = await supabase.auth.getSession();

    let deletedUsers = [];
    let failedUsers = [];

    if (!session) {
      console.warn('[deleteAgency] ⚠️ 세션 없음 - 직원 삭제 건너뜀');
    } else if (usersToDelete && usersToDelete.length > 0) {
      const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
      const functionUrl = `${SUPABASE_URL}/functions/v1/delete-user`;

      // 현재 로그인한 사용자 제외 (조직 삭제 시 CASCADE로 자동 삭제됨)
      const currentUserId = session.user.id;
      const otherUsers = usersToDelete.filter(u => u.id !== currentUserId);

      console.log('[deleteAgency] 삭제할 직원 (현재 사용자 제외):', otherUsers.map(u => u.email));
      console.log('[deleteAgency] 현재 사용자는 조직 삭제 시 CASCADE로 자동 삭제됨:', session.user.email);

      for (const user of otherUsers) {
        try {
          console.log(`[deleteAgency] 직원 삭제 중: ${user.email}`);

          const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              is_agency_deletion: false  // 조직 아직 존재하므로 false
            }),
          });

          const result = await response.json();

          if (!response.ok) {
            console.error(`[deleteAgency] ✗ ${user.email} 삭제 실패:`, result);
            failedUsers.push(user.email);
          } else {
            console.log(`[deleteAgency] ✓ ${user.email} 삭제 완료`);
            deletedUsers.push(user.email);
          }
        } catch (fetchError) {
          console.error(`[deleteAgency] ✗ ${user.email} 삭제 실패:`, fetchError);
          failedUsers.push(user.email);
        }
      }
    }

    console.log('[deleteAgency] 직원 삭제 완료 (현재 사용자 제외):', {
      total: usersToDelete?.length || 0,
      otherUsersDeleted: deletedUsers.length,
      failed: failedUsers.length
    });

    // 5. 조직 삭제 (현재 사용자가 아직 존재하므로 권한 유지)
    // CASCADE DELETE로 현재 사용자도 자동 삭제됨
    console.log('[deleteAgency] 조직 삭제 시작 (CASCADE로 현재 사용자도 자동 삭제됨)');
    const { error: deleteOrgError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId);

    if (deleteOrgError) {
      console.error('[deleteAgency] ✗ 조직 삭제 실패:', deleteOrgError);
      throw new Error(`조직 삭제 실패: ${deleteOrgError.message}`);
    }

    console.log('[deleteAgency] ✓ 조직 삭제 완료 (현재 사용자도 CASCADE로 삭제됨)');

    console.log('[deleteAgency] 삭제 완료:', {
      organization: organizationName,
      deletedBrands: deletedBrands.length,
      failedBrands: failedBrands.length,
      deletedUsers: deletedUsers.length,
      failedUsers: failedUsers.length
    });

    return {
      success: true,
      deletedBrands,
      failedBrands,
      deletedUsers,
      failedUsers
    };

  } catch (error) {
    console.error('[deleteAgency] 예외 발생:', error);
    throw error;
  }
};

/**
 * 에이전시 삭제 권한 확인
 * @param {string} userId - 사용자 ID
 * @param {string} organizationId - 조직 ID
 * @returns {Promise<Object>} - { canDelete: boolean, reason?: string }
 */
export const canDeleteAgency = async (userId, organizationId) => {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, organization_id')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // master는 모든 에이전시 삭제 가능
    if (userData.role === 'master') {
      return { canDelete: true };
    }

    // agency_admin: 자신의 조직만 삭제 가능
    if (userData.role === 'agency_admin') {
      if (userData.organization_id === organizationId) {
        return { canDelete: true };
      } else {
        return {
          canDelete: false,
          reason: '다른 조직은 삭제할 수 없습니다.'
        };
      }
    }

    // 그 외 권한은 삭제 불가
    return {
      canDelete: false,
      reason: '에이전시 삭제 권한이 없습니다.'
    };
  } catch (error) {
    console.error('[canDeleteAgency] 권한 확인 실패:', error);
    return { canDelete: false, reason: '권한 확인 중 오류가 발생했습니다.' };
  }
};
