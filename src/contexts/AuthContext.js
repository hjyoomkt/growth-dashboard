import { createContext, useContext, useEffect, useState } from 'react';
// TODO: Supabase 연동 시 import { supabase } from 'lib/supabaseClient';

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

  useEffect(() => {
    // TODO: Supabase 연동 시 실제 인증 로직 구현
    // 현재는 Mock 데이터로 개발

    // 개발용 Mock 사용자 설정
    // 💡 테스트용: 아래 role을 변경해서 다른 권한 테스트 가능
    // 'master' - 마스터 (원작자)
    // 대행사 (organizationType: 'agency'):
    //   'org_admin' - 대행사 최고관리자
    //   'org_manager' - 대행사 관리자
    //   'org_staff' - 대행사 직원
    // 클라이언트 (organizationType: 'advertiser'):
    //   'advertiser_admin' - 클라이언트 최고관리자
    //   'manager' - 클라이언트 관리자
    //   'editor' - 클라이언트 편집자
    //   'viewer' - 클라이언트 뷰어

    const mockUser = {
      id: 'mock-user-id',
      email: 'dev@example.com',
      role: 'master', // ← 마스터 권한 (원작자)
    };

    setUser(mockUser);
    setRole(mockUser.role);
    setOrganizationId(null); // 마스터는 조직에 속하지 않음
    setAdvertiserId(null); // 마스터는 특정 브랜드에 속하지 않음
    setOrganizationType('master'); // 마스터 타입

    // Mock: 접근 가능한 브랜드 목록 설정
    const mockAdvertisers = [
      { id: 'adv-nike', name: '나이키', organizationId: 'org-nike' },
      { id: 'adv-adidas', name: '아디다스', organizationId: 'org-adidas' },
      { id: 'adv-peppertux', name: '페퍼툭스', organizationId: 'org-pepper' },
      { id: 'adv-onnuri', name: '온누리스토어', organizationId: 'org-pepper' }, // 같은 회사
    ];
    setAvailableAdvertisers(mockAdvertisers);
    setCurrentAdvertiserId(null); // 전체 보기로 시작

    setLoading(false);

    // 디버깅: 현재 권한 정보 출력
    console.log('=== Auth Context Debug ===');
    console.log('Role:', mockUser.role);
    console.log('Organization Type:', 'master');
    console.log('Organization ID:', null);

    /* Supabase 연동 시 아래 코드 사용
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
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    */
  }, []);

  /* Supabase 연동 시 사용할 함수
  const fetchUserMetadata = async (userId) => {
    const { data, error } = await supabase
      .from('users')
      .select(`
        organization_id,
        advertiser_id,
        role,
        organizations (
          type
        )
      `)
      .eq('id', userId)
      .single();

    if (data) {
      setOrganizationId(data.organization_id);
      setAdvertiserId(data.advertiser_id);
      setRole(data.role);
      setOrganizationType(data.organizations?.type);
    }
    setLoading(false);
  };
  */

  const signIn = async (email, password) => {
    // TODO: Supabase 인증 구현
    console.log('Sign in:', email);
    /* Supabase 연동 시
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
    */
    return { data: { user: { email } }, error: null };
  };

  const signUp = async (email, password, userData) => {
    // TODO: Supabase 인증 + users 테이블 생성
    console.log('Sign up:', email, userData);
    /* Supabase 연동 시
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) return { data: null, error: authError };

    // users 테이블에 추가 정보 저장
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        organization_id: userData.organizationId,
        advertiser_id: userData.advertiserId,
        email: email,
        name: userData.name,
        role: userData.role,
      });

    return { data: userData, error: userError };
    */
    return { data: { user: { email } }, error: null };
  };

  const signOut = async () => {
    // TODO: Supabase 로그아웃 구현
    console.log('Sign out');
    setUser(null);
    setOrganizationId(null);
    setAdvertiserId(null);
    setRole(null);
    setOrganizationType(null);
    /* Supabase 연동 시
    const { error } = await supabase.auth.signOut();
    return { error };
    */
    return { error: null };
  };

  const isMaster = () => role === 'master';
  const isOrgAdmin = () => ['org_admin', 'org_manager', 'org_staff', 'master'].includes(role);
  const isAdvertiserAdmin = () => ['advertiser_admin', 'org_admin', 'org_manager', 'org_staff', 'master'].includes(role);
  const canEdit = () => ['editor', 'manager', 'advertiser_admin', 'org_admin', 'org_manager', 'org_staff', 'master'].includes(role);
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
