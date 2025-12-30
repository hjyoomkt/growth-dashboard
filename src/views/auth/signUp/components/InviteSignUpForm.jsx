import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Icon,
  Text,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  useColorModeValue,
  VStack,
  HStack,
  Divider,
  Heading,
  Flex,
} from "@chakra-ui/react";
import { MdOutlineRemoveRedEye, MdCheckCircle } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";

function InviteSignUpForm({ initialCode, onSuccess }) {
  const [inviteCode, setInviteCode] = useState(initialCode || "");
  const [inviteData, setInviteData] = useState(null);
  const [validatingCode, setValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    // 신규 광고주 등록 시 추가 정보
    organizationName: "",
    businessNumber: "",
    contactEmail: "",
    contactPhone: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const textColor = useColorModeValue("navy.700", "white");
  const brandColor = useColorModeValue("brand.500", "white");
  const socialBtnBg = useColorModeValue("white", "navy.800");
  const socialBtnBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const socialBtnHover = useColorModeValue(
    { bg: "gray.50" },
    { bg: "whiteAlpha.100" }
  );

  // 초대 코드 자동 검증 (initialCode가 있을 때)
  useEffect(() => {
    if (initialCode) {
      validateInviteCode(initialCode);
    }
  }, [initialCode]);

  const validateInviteCode = async (code) => {
    if (!code) return;

    setValidatingCode(true);
    setCodeError(null);

    // TODO: Supabase 연동 시 실제 검증 로직
    // Mock 데이터로 시뮬레이션 (즉시 검증)
    setTimeout(() => {
      if (code === "DEMO-1234" || code.startsWith("NIKE-") || code.startsWith("ABC-") || code.startsWith("INVITE-")) {
        // 초대 타입 판별
        const isNewAdvertiser = code.startsWith("INVITE-NEW-ORG-"); // 신규 조직 생성
        const isNewBrand = code.startsWith("INVITE-NEW-BRAND-"); // 기존 조직에 브랜드 추가

        setInviteData({
          organizationName: isNewAdvertiser || isNewBrand ? null : "나이키 코리아",
          advertiserName: isNewAdvertiser || isNewBrand ? null : "나이키 브랜드 A",
          role: isNewAdvertiser || isNewBrand ? "advertiser_admin" : code.includes("ORG") ? "org_manager" : "editor",
          invitedBy: "김철수 (Admin)",
          invitedEmail: "john@nike.com",
          isNewAdvertiser: isNewAdvertiser, // 신규 조직 플래그
          isNewBrand: isNewBrand, // 신규 브랜드 플래그
          existingOrganizationName: isNewBrand ? "페퍼스 주식회사" : null, // 기존 조직명 (브랜드 추가 시)
        });
        setCodeError(null);
      } else {
        setCodeError("유효하지 않거나 만료된 초대 코드입니다.");
        setInviteData(null);
      }
      setValidatingCode(false);
    }, 100);

    /* Supabase 연동 시
    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select(`
          *,
          organizations (name, type),
          advertisers (name),
          users!created_by (name)
        `)
        .eq('code', code)
        .single();

      if (error || !data) {
        setCodeError('유효하지 않은 초대 코드입니다.');
        return;
      }

      if (data.used) {
        setCodeError('이미 사용된 초대 코드입니다.');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setCodeError('만료된 초대 코드입니다.');
        return;
      }

      setInviteData({
        organizationName: data.organizations.name,
        advertiserName: data.advertisers?.name,
        role: data.role,
        invitedBy: data.users.name,
        invitedEmail: data.invited_email,
      });
      setCodeError(null);
    } catch (err) {
      setCodeError('초대 코드 확인 중 오류가 발생했습니다.');
    } finally {
      setValidatingCode(false);
    }
    */
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!inviteData) {
      setError("먼저 초대 코드를 확인해주세요.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (formData.password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    // 신규 조직/브랜드 등록 시 광고주명 필수
    if ((inviteData.isNewAdvertiser || inviteData.isNewBrand) && !formData.organizationName) {
      setError(inviteData.isNewBrand ? "브랜드명을 입력해주세요." : "광고주명을 입력해주세요.");
      return;
    }

    setIsLoading(true);

    // TODO: Supabase 회원가입 로직
    setTimeout(() => {
      console.log("Invite signup:", formData, inviteCode);
      setIsLoading(false);
      if (onSuccess) onSuccess();
    }, 1000);

    /* Supabase 연동 시
    try {
      // 1. Auth 계정 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // 2. Users 테이블에 추가 정보 저장
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          organization_id: inviteData.organizationId,
          advertiser_id: inviteData.advertiserId,
          email: formData.email,
          name: formData.name,
          role: inviteData.role,
        });

      if (userError) throw userError;

      // 3. 초대 코드 사용 처리
      await supabase
        .from('invitation_codes')
        .update({
          used: true,
          used_at: new Date().toISOString(),
          used_by: authData.user.id,
        })
        .eq('code', inviteCode);

      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
    */
  };

  // TODO: Supabase OAuth 로그인 핸들러
  const handleSocialLogin = async (provider) => {
    if (!inviteData) {
      setError("먼저 초대 코드를 확인해주세요.");
      return;
    }

    // TODO: Supabase OAuth 로그인 구현
    // 초대 코드를 URL state로 전달하여 OAuth 콜백에서 사용
    /*
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider, // 'google' or 'facebook'
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          invite_code: inviteCode,
        },
      },
    });

    if (error) {
      setError(`${provider} 로그인 중 오류가 발생했습니다.`);
    }
    */

    console.log(`${provider} login with invite code:`, inviteCode);
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      {/* 초대 코드 입력 (initialCode 없을 때만) */}
      {!initialCode && (
        <FormControl mb="20px">
          <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
            초대 코드 *
          </FormLabel>
          <HStack>
            <Input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              variant="auth"
              fontSize="sm"
              placeholder="예: NIKE-A1B2C3D4"
              size="lg"
              borderRadius="10px"
            />
            <Button
              onClick={() => validateInviteCode(inviteCode)}
              isLoading={validatingCode}
              colorScheme="brand"
              size="lg"
            >
              확인
            </Button>
          </HStack>
          {codeError && (
            <Text color="red.500" fontSize="sm" mt="8px">
              {codeError}
            </Text>
          )}
        </FormControl>
      )}

      {/* 검증 중 로딩 */}
      {validatingCode && initialCode && (
        <Alert
          status="info"
          mb="20px"
          borderRadius="10px"
          flexDirection="row"
          alignItems="center"
        >
          <Spinner size="sm" mr="12px" />
          <Text fontSize="sm">초대 코드 확인 중...</Text>
        </Alert>
      )}

      {/* 초대 정보 표시 */}
      {inviteData && !validatingCode && (
        <Alert
          status="success"
          mb="20px"
          borderRadius="10px"
          flexDirection="column"
          alignItems="flex-start"
        >
          <HStack mb="8px">
            <AlertIcon as={MdCheckCircle} />
            <AlertTitle fontSize="sm">초대 코드 확인 완료</AlertTitle>
          </HStack>
          <AlertDescription fontSize="xs" w="100%">
            <VStack align="flex-start" spacing="4px">
              {inviteData.isNewAdvertiser ? (
                <>
                  <Text><strong>신규 클라이언트 조직 등록</strong></Text>
                  <Text>대행사에서 새로운 클라이언트로 초대되었습니다</Text>
                  <Text><strong>권한:</strong> 클라이언트 최고관리자</Text>
                </>
              ) : inviteData.isNewBrand ? (
                <>
                  <Text><strong>신규 브랜드 추가</strong></Text>
                  <Text><strong>조직:</strong> {inviteData.existingOrganizationName}</Text>
                  <Text>기존 조직에 새로운 브랜드를 추가합니다</Text>
                  <Text><strong>권한:</strong> 클라이언트 최고관리자</Text>
                </>
              ) : (
                <>
                  <Text><strong>조직:</strong> {inviteData.organizationName}</Text>
                  {inviteData.advertiserName && (
                    <Text><strong>광고주:</strong> {inviteData.advertiserName}</Text>
                  )}
                  <Text><strong>권한:</strong> {
                    inviteData.role === 'org_admin' ? '대행사 최고관리자' :
                    inviteData.role === 'org_manager' ? '대행사 관리자' :
                    inviteData.role === 'org_staff' ? '대행사 직원' :
                    inviteData.role === 'advertiser_admin' ? '클라이언트 최고관리자' :
                    inviteData.role === 'manager' ? '클라이언트 관리자' :
                    inviteData.role === 'editor' ? '편집자' :
                    inviteData.role === 'viewer' ? '뷰어' :
                    inviteData.role
                  }</Text>
                </>
              )}
              <Text><strong>초대자:</strong> {inviteData.invitedBy}</Text>
            </VStack>
          </AlertDescription>
        </Alert>
      )}

      {/* 이름 입력 */}
      <FormControl mb="20px" isDisabled={!inviteData}>
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          이름 *
        </FormLabel>
        <Input
          name="name"
          value={formData.name}
          onChange={handleChange}
          isRequired
          variant="auth"
          fontSize="sm"
          placeholder="홍길동"
          size="lg"
          borderRadius="10px"
        />
      </FormControl>

      {/* 이메일 입력 */}
      <FormControl mb="20px" isDisabled={!inviteData}>
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          이메일 주소 *
        </FormLabel>
        <Input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          isRequired
          variant="auth"
          fontSize="sm"
          placeholder={inviteData?.invitedEmail || "email@example.com"}
          size="lg"
          borderRadius="10px"
        />
      </FormControl>

      {/* 비밀번호 입력 */}
      <FormControl mb="20px" isDisabled={!inviteData}>
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          비밀번호 *
        </FormLabel>
        <InputGroup size="lg">
          <Input
            name="password"
            value={formData.password}
            onChange={handleChange}
            isRequired
            fontSize="sm"
            placeholder="최소 6자 이상"
            size="lg"
            type={showPassword ? "text" : "password"}
            variant="auth"
            borderRadius="10px"
          />
          <InputRightElement display="flex" alignItems="center" mt="4px">
            <Icon
              color="gray.400"
              _hover={{ cursor: "pointer" }}
              as={showPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
              onClick={() => setShowPassword(!showPassword)}
            />
          </InputRightElement>
        </InputGroup>
      </FormControl>

      {/* 비밀번호 확인 */}
      <FormControl mb="20px" isDisabled={!inviteData}>
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          비밀번호 확인 *
        </FormLabel>
        <InputGroup size="lg">
          <Input
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            isRequired
            fontSize="sm"
            placeholder="비밀번호를 다시 입력하세요"
            size="lg"
            type={showConfirmPassword ? "text" : "password"}
            variant="auth"
            borderRadius="10px"
          />
          <InputRightElement display="flex" alignItems="center" mt="4px">
            <Icon
              color="gray.400"
              _hover={{ cursor: "pointer" }}
              as={showConfirmPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          </InputRightElement>
        </InputGroup>
      </FormControl>

      {/* 신규 조직/브랜드 정보 입력 섹션 */}
      {(inviteData?.isNewAdvertiser || inviteData?.isNewBrand) && (
        <>
          <Divider my="24px" />

          <Heading size="sm" color={textColor} mb="16px">
            {inviteData?.isNewBrand ? '브랜드 정보' : '광고주 정보'}
          </Heading>

          <FormControl mb="20px">
            <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
              {inviteData?.isNewBrand ? '브랜드명' : '광고주명'} *
            </FormLabel>
            <Input
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              isRequired
              variant="auth"
              fontSize="sm"
              placeholder={inviteData?.isNewBrand ? "예: 페퍼툭스" : "예: 나이키 코리아"}
              size="lg"
              borderRadius="10px"
            />
          </FormControl>

          <FormControl mb="20px">
            <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
              사업자등록번호
            </FormLabel>
            <Input
              name="businessNumber"
              value={formData.businessNumber}
              onChange={handleChange}
              variant="auth"
              fontSize="sm"
              placeholder="예: 123-45-67890"
              size="lg"
              borderRadius="10px"
            />
          </FormControl>

          <FormControl mb="20px">
            <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
              담당자 이메일
            </FormLabel>
            <Input
              name="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={handleChange}
              variant="auth"
              fontSize="sm"
              placeholder="미입력 시 로그인 이메일 사용"
              size="lg"
              borderRadius="10px"
            />
          </FormControl>

          <FormControl mb="24px">
            <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
              담당자 연락처
            </FormLabel>
            <Input
              name="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={handleChange}
              variant="auth"
              fontSize="sm"
              placeholder="예: 02-1234-5678"
              size="lg"
              borderRadius="10px"
            />
          </FormControl>
        </>
      )}

      {/* 에러 메시지 */}
      {error && (
        <Alert status="error" mb="20px" borderRadius="10px">
          <AlertIcon />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      )}

      {/* 회원가입 버튼 */}
      <Button
        type="submit"
        fontSize="sm"
        variant="brand"
        fontWeight="500"
        w="100%"
        h="50px"
        borderRadius="10px"
        isLoading={isLoading}
        isDisabled={!inviteData}
      >
        회원가입
      </Button>

      {/* OAuth 간편 로그인 (신규 조직/브랜드 추가가 아닐 때만 표시) */}
      {inviteData && !inviteData.isNewAdvertiser && !inviteData.isNewBrand && (
        <>
          {/* 구분선 */}
          <Flex align="center" my="20px">
            <Box flex="1" h="1px" bg="gray.200" />
            <Text color="gray.400" mx="14px" fontSize="sm">
              또는 간편 로그인
            </Text>
            <Box flex="1" h="1px" bg="gray.200" />
          </Flex>

          {/* Social 로그인 버튼 */}
          <Flex gap="12px" mb="0px">
            <Button
              flex="1"
              fontSize="sm"
              fontWeight="500"
              h="50px"
              borderRadius="10px"
              bg={socialBtnBg}
              border="1px solid"
              borderColor={socialBtnBorder}
              _hover={socialBtnHover}
              leftIcon={<Icon as={FcGoogle} w="20px" h="20px" />}
              onClick={() => handleSocialLogin('google')}
              isDisabled={!inviteData}
            >
              Google
            </Button>
            <Button
              flex="1"
              fontSize="sm"
              fontWeight="500"
              h="50px"
              borderRadius="10px"
              bg={socialBtnBg}
              border="1px solid"
              borderColor={socialBtnBorder}
              _hover={socialBtnHover}
              leftIcon={<Icon as={FaFacebook} w="20px" h="20px" color="#1877F2" />}
              onClick={() => handleSocialLogin('facebook')}
              isDisabled={!inviteData}
            >
              Facebook
            </Button>
          </Flex>
        </>
      )}
    </Box>
  );
}

export default InviteSignUpForm;
