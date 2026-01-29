import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import {
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  getCurrentUser,
  getUserMetadata,
  getAvailableAdvertisers,
  getBoardPosts,
  markPostAsRead
} from '../services/supabaseService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [advertiserId, setAdvertiserId] = useState(null);
  const [role, setRole] = useState(null);
  const [organizationType, setOrganizationType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accountError, setAccountError] = useState(null); // 계정 상태 에러

  // 브랜드 전환 기능
  const [availableAdvertisers, setAvailableAdvertisers] = useState([]); // 접근 가능한 브랜드 목록
  const [currentAdvertiserId, setCurrentAdvertiserId] = useState(null); // 현재 선택된 브랜드 (null = 전체 보기)

  // 알림 관리 (API 오류 + 게시판 알림)
  const [apiNotifications, setApiNotifications] = useState([]); // API 오류 알림 목록
  const [boardNotifications, setBoardNotifications] = useState([]); // 게시판 알림 목록

  // 모든 알림 통합 (API + Board)
  const allNotifications = [...apiNotifications, ...boardNotifications].sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  // ===== 2025-12-31: Supabase 연동 활성화 =====
  useEffect(() => {
    /* ❌ Mock 데이터 (원복용 보존)
    const mockUser = {
      id: 'mock-user-id',
      email: 'dev@example.com',
      role: 'master',
    };
    setUser(mockUser);
    setRole(mockUser.role);
    setOrganizationId(null);
    setAdvertiserId(null);
    setOrganizationType('master');
    const mockAdvertisers = [
      { id: 'adv-nike', name: '나이키', organizationId: 'org-nike' },
      { id: 'adv-adidas', name: '아디다스', organizationId: 'org-adidas' },
    ];
    setAvailableAdvertisers(mockAdvertisers);
    setCurrentAdvertiserId(null);
    setLoading(false);
    */

    // ✅ Supabase 실제 연동
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserMetadata(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserMetadata(session.user.id);
      } else {
        setUserName(null);
        setOrganizationId(null);
        setAdvertiserId(null);
        setRole(null);
        setOrganizationType(null);
        setAvailableAdvertisers([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // URL 변경 감지 (뒤로가기/앞으로가기 대응)
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const brandFromUrl = urlParams.get('brand');

      if (brandFromUrl) {
        const hasAccess = availableAdvertisers.some(adv => adv.id === brandFromUrl);
        if (hasAccess && brandFromUrl !== currentAdvertiserId) {
          setCurrentAdvertiserId(brandFromUrl);
          localStorage.setItem('selectedBrandId', brandFromUrl);
          console.log('[AuthContext] 브라우저 히스토리 탐색:', brandFromUrl);
        }
      } else if (currentAdvertiserId !== null) {
        setCurrentAdvertiserId(null);
        localStorage.removeItem('selectedBrandId');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [availableAdvertisers, currentAdvertiserId]);

  // 게시판 알림 자동 로드
  useEffect(() => {
    const fetchBoardNotifications = async () => {
      // Specialist는 알림을 표시하지 않음
      if (!user || !role || !availableAdvertisers || role === 'specialist') return;

      try {
        // 브랜드 사용자 여부 확인
        const isBrandUser = ['advertiser_admin', 'advertiser_staff', 'viewer', 'editor'].includes(role);

        // 브랜드 사용자는 'brand' 타입, 나머지는 'admin' 타입
        const boardType = isBrandUser ? 'brand' : 'admin';

        // 브랜드 사용자인 경우에만 currentAdvertiserId로 필터링
        const filterAdvertiserId = isBrandUser ? currentAdvertiserId : null;

        // 게시글 조회 (서버 사이드 필터링 적용)
        const posts = await getBoardPosts(
          boardType,
          user.id,
          filterAdvertiserId,
          role,
          availableAdvertisers
        );

        // 읽지 않은 게시글만 알림으로 변환
        const unreadNotifications = posts
          .filter(post => !post.isRead)
          .map(post => ({
            id: `board-${post.id}`,
            type: 'board',
            title: '새 게시글',
            message: post.title,
            postId: post.id,
            postTitle: post.title,
            postContent: post.content,
            timestamp: post.date,
            read: false,
          }));

        setBoardNotifications(unreadNotifications);
      } catch (error) {
        console.error('[AuthContext] 게시판 알림 조회 실패:', error);
      }
    };

    fetchBoardNotifications();

    // 30초마다 알림 새로고침
    const interval = setInterval(fetchBoardNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, role, availableAdvertisers, currentAdvertiserId]);

  // ✅ 사용자 메타데이터 조회 함수
  const fetchUserMetadata = async (userId) => {
    try {
      const userData = await getUserMetadata(userId);
      console.log('✅ 사용자 메타데이터:', userData);

      // ⚠️ 추가: 사용자 상태 검증
      if (userData.deleted_at !== null) {
        setAccountError('삭제된 계정입니다.');
        await signOut();
        setLoading(false);
        return;
      }

      if (userData.status !== 'active') {
        setAccountError('비활성화된 계정입니다. 관리자에게 문의하세요.');
        await signOut();
        setLoading(false);
        return;
      }

      setUserName(userData.name);
      setOrganizationId(userData.organization_id);
      setAdvertiserId(userData.advertiser_id);
      setRole(userData.role);

      // organizationType 결정 로직
      // 1. organizations 테이블에 연결된 경우 (agency)
      // 2. advertiser_id가 있는 경우 'advertiser'로 설정
      // 3. organization_type 필드 사용 (레거시)
      let orgType = userData.organizations?.type || userData.organization_type;
      if (!orgType && userData.advertiser_id) {
        orgType = 'advertiser';
      }
      setOrganizationType(orgType);

      console.log('✅ 설정된 role:', userData.role);
      console.log('✅ 설정된 organization_type:', orgType);
      console.log('✅ 설정된 advertiser_id:', userData.advertiser_id);

      // 접근 가능한 광고주 목록 조회
      const advertisers = await getAvailableAdvertisers(userData);
      setAvailableAdvertisers(advertisers);
      console.log('✅ 접근 가능한 광고주:', advertisers);

      // 브랜드 선택 우선순위: URL > localStorage > 첫 번째 광고주
      const urlParams = new URLSearchParams(window.location.search);
      const brandFromUrl = urlParams.get('brand');
      const savedBrandId = localStorage.getItem('selectedBrandId');

      let initialAdvertiserId = null;

      // 1순위: URL 파라미터
      if (brandFromUrl) {
        const hasAccess = advertisers.some(adv => adv.id === brandFromUrl);
        if (hasAccess) {
          initialAdvertiserId = brandFromUrl;
          localStorage.setItem('selectedBrandId', brandFromUrl);
          console.log('✅ URL에서 브랜드 복원:', brandFromUrl);
        } else {
          console.warn('[AuthContext] URL의 브랜드 접근 권한 없음:', brandFromUrl);
        }
      }

      // 2순위: localStorage
      if (!initialAdvertiserId && savedBrandId) {
        const hasAccess = advertisers.some(adv => adv.id === savedBrandId);
        if (hasAccess) {
          initialAdvertiserId = savedBrandId;
          console.log('✅ localStorage에서 브랜드 복원:', savedBrandId);
        } else {
          localStorage.removeItem('selectedBrandId');
          console.warn('[AuthContext] localStorage의 브랜드 접근 권한 없음:', savedBrandId);
        }
      }

      // 3순위: 첫 번째 광고주
      if (!initialAdvertiserId && advertisers && advertisers.length > 0) {
        initialAdvertiserId = advertisers[0].id;
        localStorage.setItem('selectedBrandId', initialAdvertiserId);
        console.log('✅ 기본 브랜드로 설정:', initialAdvertiserId);
      }

      setCurrentAdvertiserId(initialAdvertiserId);
      console.log('✅ 현재 광고주 ID:', initialAdvertiserId);

      setLoading(false);
    } catch (error) {
      // 에러를 조용히 처리 (콘솔 에러 제거)
      setLoading(false);

      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('비활성') || errorMessage.includes('삭제')) {
        setAccountError(errorMessage);
        await signOut();
      }
    }
  };

  const signIn = async (email, password) => {
    try {
      const data = await supabaseSignIn(email, password);
      console.log('Sign in successful:', email);
      return { data, error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      const data = await supabaseSignUp(email, password, metadata);
      console.log('Sign up successful:', email);
      return { data, error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await supabaseSignOut();
      console.log('Sign out successful');
      setUser(null);
      setUserName(null);
      setOrganizationId(null);
      setAdvertiserId(null);
      setRole(null);
      setOrganizationType(null);
      return { error: null };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  };

  // ✅ 권한 체크 함수 (2026-01-03 수정)
  const isMaster = () => role === 'master';
  const isSpecialist = () => role === 'specialist';

  // 슈퍼어드민 접근 권한 (조직관리 제외)
  const canAccessSuperAdmin = () => ['master', 'agency_admin', 'agency_manager'].includes(role);

  // 브랜드 어드민 접근 권한
  const canAccessBrandAdmin = () => ['advertiser_admin', 'advertiser_staff', 'agency_admin', 'agency_manager', 'master'].includes(role);

  // 조직관리 접근 권한 (마스터 전용)
  const canAccessOrganization = () => role === 'master';

  // 편집 권한
  const canEdit = () => ['advertiser_admin', 'advertiser_staff', 'agency_admin', 'agency_manager', 'master'].includes(role);

  // 레거시 호환성 유지
  const isOrgAdmin = () => ['agency_admin', 'agency_manager', 'master'].includes(role);
  const isAdvertiserAdmin = () => ['advertiser_admin', 'advertiser_staff', 'agency_admin', 'agency_manager', 'master'].includes(role);
  const isAgency = () => organizationType === 'agency';

  // 브랜드 전환 함수
  const switchAdvertiser = (advertiserId) => {
    setCurrentAdvertiserId(advertiserId);

    // localStorage에 저장
    if (advertiserId) {
      localStorage.setItem('selectedBrandId', advertiserId);
    } else {
      localStorage.removeItem('selectedBrandId');
    }

    console.log('Switched to advertiser:', advertiserId || 'All');
  };

  // 계정 에러 초기화 함수
  const clearAccountError = () => {
    setAccountError(null);
  };

  // API 알림 추가 함수
  const addApiNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };
    setApiNotifications(prev => [newNotification, ...prev]);
  };

  // 게시판 알림 추가 함수
  const addBoardNotification = (notification) => {
    const newNotification = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      read: false,
      type: 'board',
      ...notification,
    };
    setBoardNotifications(prev => [newNotification, ...prev]);
  };

  // API 알림 읽음 처리
  const markNotificationAsRead = async (notificationId) => {
    // 로컬 상태 업데이트
    setApiNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setBoardNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );

    // 게시판 알림인 경우 DB에 읽음 상태 저장
    const boardNotif = boardNotifications.find(n => n.id === notificationId);
    if (boardNotif && boardNotif.postId && user) {
      try {
        await markPostAsRead(boardNotif.postId, user.id);
      } catch (error) {
        console.error('[AuthContext] 게시글 읽음 처리 실패:', error);
      }
    }
  };

  // 모든 알림 읽음 처리
  const markAllNotificationsAsRead = async () => {
    // 로컬 상태 업데이트
    setApiNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setBoardNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );

    // 모든 게시판 알림을 DB에 읽음 상태로 저장
    if (user && boardNotifications.length > 0) {
      const savePromises = boardNotifications
        .filter(notif => !notif.read && notif.postId)
        .map(notif => markPostAsRead(notif.postId, user.id).catch(err => {
          console.error('[AuthContext] 게시글 읽음 처리 실패:', notif.postId, err);
        }));

      await Promise.all(savePromises);
    }
  };

  // 알림 삭제
  const removeNotification = (notificationId) => {
    setApiNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    );
    setBoardNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const value = {
    user,
    userName,
    organizationId,
    advertiserId,
    role,
    organizationType,
    loading,
    accountError,
    clearAccountError,
    signIn,
    signUp,
    signOut,
    // 권한 체크 헬퍼 함수
    isMaster,
    isSpecialist,
    isOrgAdmin,
    isAdvertiserAdmin,
    canEdit,
    isAgency,
    canAccessSuperAdmin,
    canAccessBrandAdmin,
    canAccessOrganization,
    // 브랜드 전환 기능
    availableAdvertisers,
    currentAdvertiserId,
    switchAdvertiser,
    // 알림 기능
    apiNotifications,
    boardNotifications,
    allNotifications,
    addApiNotification,
    addBoardNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    removeNotification,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
