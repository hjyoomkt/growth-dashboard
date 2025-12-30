import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  useColorModeValue,
  Image,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import illustration from "assets/img/auth/auth.png";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";

function ResetPassword() {
  const navigate = useNavigate();
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorBrand = useColorModeValue("brand.500", "white");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 유효성 검사
    if (!password || !confirmPassword) {
      setError("모든 필드를 입력해주세요.");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 최소 8자 이상이어야 합니다.");
      return;
    }

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    // TODO: Supabase 비밀번호 업데이트
    // const { error } = await supabase.auth.updateUser({
    //   password: password
    // });

    // if (error) {
    //   setError(error.message);
    //   return;
    // }

    // Mock: 성공 처리
    setIsSuccess(true);

    // 3초 후 로그인 페이지로 이동
    setTimeout(() => {
      navigate("/auth/sign-in");
    }, 3000);
  };

  return (
    <Flex
      w="100vw"
      h="100vh"
      bg={useColorModeValue("white", "navy.900")}
      overflow="hidden"
    >
      {/* 왼쪽: 비밀번호 재설정 폼 */}
      <Flex
        w={{ base: "100%", lg: "50%" }}
        direction="column"
        justify="center"
        align="center"
        px={{ base: "20px", md: "50px", lg: "80px" }}
        py={{ base: "40px", md: "60px" }}
      >
        <Box w="100%" maxW="440px">
          {!isSuccess ? (
            <>
              {/* Title */}
              <Heading
                color={textColor}
                fontSize={{ base: "28px", md: "36px" }}
                mb="10px"
                fontWeight="700"
              >
                Reset Password
              </Heading>
              <Text
                mb="36px"
                color={textColorSecondary}
                fontWeight="400"
                fontSize={{ base: "sm", md: "md" }}
              >
                Enter your new password below.
              </Text>

              {error && (
                <Alert status="error" mb="20px" borderRadius="10px">
                  <AlertIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {/* 새 비밀번호 입력 */}
                <FormControl mb="20px">
                  <FormLabel
                    fontSize="sm"
                    fontWeight="500"
                    color={textColor}
                    mb="8px"
                  >
                    New Password
                  </FormLabel>
                  <InputGroup size="md">
                    <Input
                      isRequired={true}
                      fontSize="sm"
                      placeholder="At least 8 characters"
                      size="lg"
                      type={showPassword ? "text" : "password"}
                      variant="auth"
                      borderRadius="10px"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <InputRightElement display="flex" alignItems="center" mt="4px">
                      <Icon
                        color={textColorSecondary}
                        _hover={{ cursor: "pointer" }}
                        as={showPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {/* 비밀번호 확인 입력 */}
                <FormControl mb="24px">
                  <FormLabel
                    fontSize="sm"
                    fontWeight="500"
                    color={textColor}
                    mb="8px"
                  >
                    Confirm Password
                  </FormLabel>
                  <InputGroup size="md">
                    <Input
                      isRequired={true}
                      fontSize="sm"
                      placeholder="Re-enter your password"
                      size="lg"
                      type={showConfirmPassword ? "text" : "password"}
                      variant="auth"
                      borderRadius="10px"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <InputRightElement display="flex" alignItems="center" mt="4px">
                      <Icon
                        color={textColorSecondary}
                        _hover={{ cursor: "pointer" }}
                        as={showConfirmPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {/* Submit 버튼 */}
                <Button
                  fontSize="sm"
                  variant="brand"
                  fontWeight="500"
                  w="100%"
                  h="50px"
                  mb="20px"
                  borderRadius="10px"
                  type="submit"
                >
                  Reset Password
                </Button>
              </form>

              {/* Back to Sign in */}
              <Text
                color={textColorSecondary}
                fontWeight="400"
                fontSize="14px"
                textAlign="center"
              >
                Remember your password?{" "}
                <Text
                  color={textColorBrand}
                  as="span"
                  fontWeight="600"
                  cursor="pointer"
                  _hover={{ textDecoration: "underline" }}
                  onClick={() => navigate("/auth/sign-in")}
                >
                  Sign in
                </Text>
              </Text>
            </>
          ) : (
            <>
              {/* Success Message */}
              <Heading
                color={textColor}
                fontSize={{ base: "28px", md: "36px" }}
                mb="10px"
                fontWeight="700"
              >
                Password Reset Successful! 🎉
              </Heading>
              <Alert
                status="success"
                variant="subtle"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                textAlign="center"
                borderRadius="15px"
                p="40px"
                mb="24px"
              >
                <AlertIcon boxSize="40px" mr={0} mb="16px" />
                <AlertDescription maxW="sm" fontSize="md">
                  Your password has been successfully reset. You will be redirected to the sign-in page shortly.
                </AlertDescription>
              </Alert>

              <Button
                fontSize="sm"
                variant="brand"
                fontWeight="500"
                w="100%"
                h="50px"
                borderRadius="10px"
                onClick={() => navigate("/auth/sign-in")}
              >
                Sign In Now
              </Button>
            </>
          )}

          {/* Copyright */}
          <Text
            color="gray.400"
            fontSize="xs"
            textAlign="center"
            mt="40px"
          >
            © 2023 ALL RIGHTS RESERVED
          </Text>
        </Box>
      </Flex>

      {/* 우측: 이미지 영역 (데스크탑만) */}
      <Box
        w="50%"
        h="100%"
        display={{ base: "none", lg: "flex" }}
        alignItems="center"
        justifyContent="center"
        p="40px"
      >
        <Image
          src={illustration}
          alt="Auth Background"
          w="100%"
          h="100%"
          objectFit="cover"
          borderRadius="20px"
        />
      </Box>
    </Flex>
  );
}

export default ResetPassword;
