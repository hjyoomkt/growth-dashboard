import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import {
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  getCurrentUser,
  getUserMetadata,
  getAvailableAdvertisers
} from '../services/supabaseService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [advertiserId, setAdvertiserId] = useState(null);
  const [role, setRole] = useState(null);
  const [organizationType, setOrganizationType] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // ✅ 사용자 메타데이터 조회 함수
  const fetchUserMetadata = async (userId) => {
    try {
      const userData = await getUserMetadata(userId);
      console.log('✅ 사용자 메타데이터:', userData);

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

      // 첫 번째 광고주를 기본값으로 설정
      if (advertisers && advertisers.length > 0) {
        setCurrentAdvertiserId(advertisers[0].id);
        console.log('✅ 현재 광고주 ID:', advertisers[0].id);
      }

      setLoading(false);
    } catch (error) {
      console.error('메타데이터 조회 실패:', error);
      setLoading(false);
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
    console.log('Switched to advertiser:', advertiserId || 'All');
    // TODO: Supabase 연동 시 사용자 설정 저장
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
  const markNotificationAsRead = (notificationId) => {
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
  };

  // 모든 알림 읽음 처리
  const markAllNotificationsAsRead = () => {
    setApiNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setBoardNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
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
    organizationId,
    advertiserId,
    role,
    organizationType,
    loading,
    signIn,
    signUp,
    signOut,
    // 권한 체크 헬퍼 함수
    isMaster,
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
