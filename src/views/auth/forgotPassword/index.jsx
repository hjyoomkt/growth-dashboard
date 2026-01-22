import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Text,
  useColorModeValue,
  Image,
  Alert,
  AlertIcon,
  AlertDescription,
} from "@chakra-ui/react";
import illustration from "assets/img/auth/auth.png";
import { supabase } from "config/supabase";

function ForgotPassword() {
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorBrand = useColorModeValue("brand.500", "white");
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 이메일 유효성 검사
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식이 아닙니다.");
      return;
    }

    try {
      // Supabase Edge Function을 통해 비밀번호 재설정 이메일 발송
      const { error } = await supabase.functions.invoke('send-password-reset-email', {
        body: {
          email: email,
          redirectTo: `${window.location.origin}/auth/reset-password`,
        },
      });

      if (error) {
        console.error('Password reset email error:', error);
        // Supabase 에러 메시지 한글화
        const errorMessages = {
          'User not found': '등록되지 않은 이메일입니다.',
          'Email not confirmed': '이메일 인증이 완료되지 않았습니다.',
          'Invalid email': '올바른 이메일 형식이 아닙니다.',
        };
        setError(errorMessages[error.message] || error.message || '이메일 발송에 실패했습니다.');
        return;
      }

      // 성공 처리
      setIsSubmitted(true);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('비밀번호 재설정 요청 중 오류가 발생했습니다.');
    }
  };

  return (
    <Flex
      w="100vw"
      h="100vh"
      bg={useColorModeValue("white", "navy.900")}
      overflow="hidden"
    >
      {/* 왼쪽: 비밀번호 찾기 폼 */}
      <Flex
        w={{ base: "100%", lg: "50%" }}
        direction="column"
        justify="center"
        align="center"
        px={{ base: "20px", md: "50px", lg: "80px" }}
        py={{ base: "40px", md: "60px" }}
      >
        <Box w="100%" maxW="440px">
          {!isSubmitted ? (
            <>
              {/* Title */}
              <Heading
                color={textColor}
                fontSize={{ base: "28px", md: "36px" }}
                mb="10px"
                fontWeight="700"
              >
                Forgot Password?
              </Heading>
              <Text
                mb="36px"
                color={textColorSecondary}
                fontWeight="400"
                fontSize={{ base: "sm", md: "md" }}
              >
                Enter your email address and we'll send you instructions to reset your password.
              </Text>

              {error && (
                <Alert status="error" mb="20px" borderRadius="10px">
                  <AlertIcon />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 이메일 입력 */}
              <form onSubmit={handleSubmit}>
                <FormControl mb="24px">
                  <FormLabel
                    fontSize="sm"
                    fontWeight="500"
                    color={textColor}
                    mb="8px"
                  >
                    Email
                  </FormLabel>
                  <Input
                    isRequired={true}
                    variant="auth"
                    fontSize="sm"
                    type="email"
                    placeholder="Example@email.com"
                    fontWeight="500"
                    size="lg"
                    borderRadius="10px"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
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
                  Send Reset Link
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
                <NavLink to="/auth/sign-in">
                  <Text
                    color={textColorBrand}
                    as="span"
                    fontWeight="600"
                    _hover={{ textDecoration: "underline" }}
                  >
                    Sign in
                  </Text>
                </NavLink>
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
                Check Your Email
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
                  We've sent a password reset link to{" "}
                  <Text as="span" fontWeight="600">
                    {email}
                  </Text>
                  . Please check your inbox and follow the instructions.
                </AlertDescription>
              </Alert>

              <Text
                color={textColorSecondary}
                fontWeight="400"
                fontSize="14px"
                textAlign="center"
                mb="20px"
              >
                Didn't receive the email? Check your spam folder or{" "}
                <Text
                  as="span"
                  color={textColorBrand}
                  fontWeight="600"
                  cursor="pointer"
                  _hover={{ textDecoration: "underline" }}
                  onClick={() => setIsSubmitted(false)}
                >
                  try again
                </Text>
              </Text>

              <NavLink to="/auth/sign-in">
                <Button
                  fontSize="sm"
                  variant="outline"
                  fontWeight="500"
                  w="100%"
                  h="50px"
                  borderRadius="10px"
                >
                  Back to Sign In
                </Button>
              </NavLink>
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

export default ForgotPassword;
