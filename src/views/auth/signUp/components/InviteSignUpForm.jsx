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
  Radio,
  RadioGroup,
} from "@chakra-ui/react";
import { MdOutlineRemoveRedEye, MdCheckCircle } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { supabase } from "config/supabase";

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
    websiteUrl: "",
    contactEmail: "",
    contactPhone: "",
    selectedMainAdvertiserId: null, // 메인 브랜드 ID
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
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');
  const selectedBg = useColorModeValue('brand.50', 'whiteAlpha.100');
  const bgHover = useColorModeValue('gray.50', 'whiteAlpha.50');
  const inputBg = useColorModeValue('white', 'navy.700');

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

    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', code)
        .single();

      if (error || !data) {
        setCodeError('유효하지 않은 초대 코드입니다.');
        setInviteData(null);
        setValidatingCode(false);
        return;
      }

      if (data.used_by) {
        setCodeError('이미 사용된 초대 코드입니다.');
        setInviteData(null);
        setValidatingCode(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setCodeError('만료된 초대 코드입니다.');
        setInviteData(null);
        setValidatingCode(false);
        return;
      }

      // invite_type 필드로 초대 타입 구분
      const isNewAdvertiser = data.invite_type === 'new_organization';
      const isNewBrand = data.invite_type === 'new_brand';
      const isNewAgency = data.invite_type === 'new_agency';

      // 조직/광고주 정보 추가 조회 (필요 시)
      let organizationName = null;
      let advertiserName = null;

      if (data.organization_id && !isNewAdvertiser) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', data.organization_id)
          .single();
        organizationName = orgData?.name;
      }

      if (data.advertiser_id) {
        const { data: advData } = await supabase
          .from('advertisers')
          .select('name')
          .eq('id', data.advertiser_id)
          .single();
        advertiserName = advData?.name;
      }

      // 복수 브랜드 정보 (advertiser_ids와 advertiser_names 매핑)
      let advertiserBrands = [];
      if (data.advertiser_ids && data.advertiser_ids.length > 0) {
        // advertiser_names가 초대 코드에 저장되어 있으므로 직접 사용 (RLS 문제 해결)
        advertiserBrands = data.advertiser_ids.map((id, index) => ({
          id: id,
          name: data.advertiser_names?.[index] || '알 수 없는 브랜드'
        }));

        console.log('✅ 브랜드 목록:', advertiserBrands);
      }

      setInviteData({
        organizationName: organizationName,
        advertiserName: advertiserName,
        advertiserBrands: advertiserBrands, // 복수 브랜드 정보 (id, name)
        role: data.role,
        invitedBy: '관리자',
        invitedEmail: data.invited_email,
        isNewAdvertiser: isNewAdvertiser,
        isNewBrand: isNewBrand,
        isNewAgency: isNewAgency,
        existingOrganizationName: isNewBrand ? organizationName : null,
        invitationId: data.id,
        organizationId: data.organization_id,
        advertiserId: data.advertiser_id,
        advertiserIds: data.advertiser_ids, // 복수 브랜드 IDs
        parentAdvertiserId: data.parent_advertiser_id, // NEW: 부모 브랜드 ID
      });

      // 복수 브랜드일 경우 첫 번째 브랜드를 기본값으로 설정
      if (data.advertiser_ids && data.advertiser_ids.length > 1) {
        setFormData(prev => ({
          ...prev,
          selectedMainAdvertiserId: data.advertiser_ids[0]
        }));
      }

      setCodeError(null);
    } catch (err) {
      console.error('초대 코드 검증 오류:', err);
      setCodeError('초대 코드 확인 중 오류가 발생했습니다.');
      setInviteData(null);
    } finally {
      setValidatingCode(false);
    }
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
    if ((inviteData.isNewAdvertiser || inviteData.isNewBrand || inviteData.isNewAgency) && !formData.organizationName) {
      setError(inviteData.isNewAgency ? "대행사명을 입력해주세요." : inviteData.isNewBrand ? "브랜드명을 입력해주세요." : "광고주명을 입력해주세요.");
      return;
    }

    // 복수 브랜드일 때 메인 브랜드 선택 필수
    if (inviteData.advertiserBrands && inviteData.advertiserBrands.length > 1 &&
        ['viewer', 'editor', 'advertiser_staff'].includes(inviteData.role) &&
        !formData.selectedMainAdvertiserId) {
      setError("메인 소속 브랜드를 선택해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Auth 계정 생성 (초대받은 이메일로)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteData.invitedEmail,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: formData.name,
          }
        }
      });

      if (authError) throw authError;

      let finalOrganizationId = inviteData.organizationId;

      // 메인 브랜드 결정: selectedMainAdvertiserId > 첫 번째 브랜드 > advertiserId
      let finalAdvertiserId = inviteData.advertiserId;
      if (inviteData.advertiserIds && inviteData.advertiserIds.length > 0) {
        finalAdvertiserId = formData.selectedMainAdvertiserId || inviteData.advertiserIds[0];
      }

      // 2. 신규 광고주(조직) 생성
      if (inviteData.isNewAdvertiser) {
        // organizations 테이블에 신규 조직 생성
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: formData.organizationName,
            type: 'advertiser',
          })
          .select()
          .single();

        if (orgError) throw orgError;
        finalOrganizationId = newOrg.id;

        // advertisers 테이블에 신규 브랜드 생성
        const { data: newAdv, error: advError } = await supabase
          .from('advertisers')
          .insert({
            name: formData.organizationName,
            organization_id: newOrg.id,
            business_number: formData.businessNumber,
            website_url: formData.websiteUrl,
            contact_email: formData.contactEmail || formData.email,
            contact_phone: formData.contactPhone,
          })
          .select()
          .single();

        if (advError) throw advError;
        finalAdvertiserId = newAdv.id;
      }

      // 2-1. 신규 대행사 조직 생성
      if (inviteData.isNewAgency) {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: formData.organizationName,
            type: 'agency',
          })
          .select()
          .single();

        if (orgError) throw orgError;
        finalOrganizationId = newOrg.id;

        // 대행사는 advertiser_id 없음
        finalAdvertiserId = null;
      }

      // 3. 기존 조직에 신규 브랜드 추가
      if (inviteData.isNewBrand) {
        const { data: newAdv, error: advError } = await supabase
          .from('advertisers')
          .insert({
            name: formData.organizationName,
            organization_id: inviteData.organizationId,
            business_number: formData.businessNumber,
            website_url: formData.websiteUrl,
            contact_email: formData.contactEmail || formData.email,
            contact_phone: formData.contactPhone,
          })
          .select()
          .single();

        if (advError) throw advError;
        finalAdvertiserId = newAdv.id;

        // NEW: Edge Function 호출하여 advertiser_group_id 설정
        if (inviteData.parentAdvertiserId) {
          console.log('🔍 Edge Function 호출 시작:', {
            parentAdvertiserId: inviteData.parentAdvertiserId,
            newAdvertiserId: newAdv.id,
          });

          try {
            const { data: groupData, error: groupError } = await supabase.functions.invoke(
              'assign-advertiser-group',
              {
                body: {
                  parentAdvertiserId: inviteData.parentAdvertiserId,
                  newAdvertiserId: newAdv.id,
                },
              }
            );

            console.log('📦 Edge Function 응답:', { groupData, groupError });

            if (groupError) {
              console.error('❌ 브랜드 그룹 설정 실패:', groupError);
              // 실패해도 회원가입은 완료되었으므로 경고만 표시
              setError(`브랜드 그룹 설정 중 오류가 발생했습니다: ${groupError.message || JSON.stringify(groupError)}`);
            } else {
              console.log('✅ 브랜드 그룹 설정 완료:', groupData);
            }
          } catch (err) {
            console.error('❌ Edge Function 호출 실패:', err);
            setError(`브랜드 그룹 설정 중 오류가 발생했습니다: ${err.message}`);
          }
        } else {
          console.log('⚠️ parentAdvertiserId가 없어 Edge Function을 호출하지 않습니다');
        }
      }

      // 4. Users 테이블에 추가 정보 저장
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          organization_id: finalOrganizationId,
          advertiser_id: finalAdvertiserId,
          email: inviteData.invitedEmail,
          name: formData.name,
          role: inviteData.role,
          status: 'active',
        });

      if (userError) throw userError;

      // 5. user_advertisers 테이블에 매핑 추가 (복수 브랜드 지원)
      // advertiserIds가 있으면 복수 브랜드, 없으면 단수 브랜드(하위 호환)
      const advertiserIdsToMap = inviteData.advertiserIds && inviteData.advertiserIds.length > 0
        ? inviteData.advertiserIds
        : (finalAdvertiserId ? [finalAdvertiserId] : []);

      if (advertiserIdsToMap.length > 0) {
        const userAdvertiserMappings = advertiserIdsToMap.map(advId => ({
          user_id: authData.user.id,
          advertiser_id: advId,
        }));

        const { error: userAdvError } = await supabase
          .from('user_advertisers')
          .insert(userAdvertiserMappings);

        if (userAdvError) throw userAdvError;
      }

      // 6. 초대 코드 사용 처리
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
      console.error('회원가입 오류:', err);
      setError(err.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
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
              {inviteData.isNewAgency ? (
                <>
                  <Text><strong>신규 광고대행사 조직 등록</strong></Text>
                  <Text>새로운 광고대행사를 등록합니다</Text>
                  <Text><strong>권한:</strong> 대행사 최고관리자 (agency_admin)</Text>
                </>
              ) : inviteData.isNewAdvertiser ? (
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
                  {inviteData.advertiserBrands && inviteData.advertiserBrands.length > 0 ? (
                    <Text><strong>접근 가능한 브랜드:</strong> {inviteData.advertiserBrands.map(b => b.name).join(', ')}</Text>
                  ) : inviteData.advertiserName && (
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
      <FormControl mb="20px" isDisabled={true}>
        <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
          이메일 주소 *
        </FormLabel>
        <Input
          name="email"
          type="email"
          value={inviteData?.invitedEmail || formData.email}
          onChange={handleChange}
          isRequired
          variant="auth"
          fontSize="sm"
          placeholder="your.email@company.com"
          size="lg"
          borderRadius="10px"
          isReadOnly
          bg={useColorModeValue('gray.100', 'navy.800')}
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

      {/* 메인 소속 브랜드 선택 */}
      {inviteData && inviteData.advertiserBrands && inviteData.advertiserBrands.length > 1 &&
       ['viewer', 'editor', 'advertiser_staff'].includes(inviteData.role) && (
        <>
          <Divider my="24px" />

          <Heading size="sm" color={textColor} mb="16px">
            메인 소속 브랜드 선택
          </Heading>

          <FormControl mb="20px">
            <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
              메인 브랜드 *
            </FormLabel>
            <Text fontSize="xs" color="gray.500" mb="12px">
              여러 브랜드에 접근 가능하지만, 하나의 메인 브랜드를 지정해야 합니다.
            </Text>
            <RadioGroup
              value={formData.selectedMainAdvertiserId}
              onChange={(value) => setFormData({ ...formData, selectedMainAdvertiserId: value })}
            >
              <VStack align="stretch" spacing="8px">
                {inviteData.advertiserBrands && inviteData.advertiserBrands.map((brand) => {
                  return (
                    <Box
                      key={brand.id}
                      p="12px"
                      borderRadius="8px"
                      border="1px solid"
                      borderColor={formData.selectedMainAdvertiserId === brand.id ? brandColor : borderColor}
                      bg={formData.selectedMainAdvertiserId === brand.id ? selectedBg : inputBg}
                      cursor="pointer"
                      onClick={() => setFormData({ ...formData, selectedMainAdvertiserId: brand.id })}
                      _hover={{ borderColor: brandColor, bg: bgHover }}
                    >
                      <Radio value={brand.id} colorScheme="brand">
                        <Text fontSize="sm" fontWeight="500" color={textColor}>
                          {brand.name}
                        </Text>
                      </Radio>
                    </Box>
                  );
                })}
              </VStack>
            </RadioGroup>
          </FormControl>
        </>
      )}

      {/* 신규 조직/브랜드 정보 입력 섹션 */}
      {(inviteData?.isNewAdvertiser || inviteData?.isNewBrand || inviteData?.isNewAgency) && (
        <>
          <Divider my="24px" />

          <Heading size="sm" color={textColor} mb="16px">
            {inviteData?.isNewAgency ? '대행사 정보' : '브랜드 정보'}
          </Heading>

          <FormControl mb="20px">
            <FormLabel fontSize="sm" fontWeight="500" color={textColor}>
              {inviteData?.isNewAgency ? '대행사명 *' : '브랜드명 *'}
            </FormLabel>
            <Input
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              isRequired
              variant="auth"
              fontSize="sm"
              placeholder={inviteData?.isNewAgency ? "예: 부밍 대행사" : "예: 페퍼스"}
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
              홈페이지 주소
            </FormLabel>
            <Input
              name="websiteUrl"
              type="url"
              value={formData.websiteUrl}
              onChange={handleChange}
              variant="auth"
              fontSize="sm"
              placeholder="예: https://www.example.com"
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
              placeholder="contact@company.com (미입력 시 로그인 이메일 사용)"
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

      {/* OAuth 간편 로그인 (신규 조직/브랜드/대행사 추가가 아닐 때만 표시) */}
      {inviteData && !inviteData.isNewAdvertiser && !inviteData.isNewBrand && !inviteData.isNewAgency && (
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
