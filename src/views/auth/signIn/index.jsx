/* eslint-disable */
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

import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
// Chakra imports
import {
  Box,
  Button,
  Checkbox,
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
  useToast,
} from "@chakra-ui/react";
// Assets
import illustration from "assets/img/auth/auth.png";
import { FcGoogle } from "react-icons/fc";
import { FaFacebook } from "react-icons/fa";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";
import { useAuth } from "contexts/AuthContext";

function SignIn() {
  // Chakra color mode
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorBrand = useColorModeValue("brand.500", "white");
  const brandStars = useColorModeValue("brand.500", "brand.400");
  const socialBtnBg = useColorModeValue("white", "navy.800");
  const socialBtnBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const socialBtnHover = useColorModeValue(
    { bg: "gray.50" },
    { bg: "whiteAlpha.100" }
  );
  const [show, setShow] = React.useState(false);
  const handleClick = () => setShow(!show);

  // ===== 2025-12-31: Supabase 로그인 연동 =====
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({
        title: "입력 오류",
        description: "이메일과 비밀번호를 입력하세요.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    const { data, error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: "로그인 실패",
        description: error.message || "이메일 또는 비밀번호를 확인하세요.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } else {
      toast({
        title: "로그인 성공",
        description: "환영합니다!",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      navigate("/admin/default");
    }
  };

  return (
    <Flex
      w="100vw"
      h="100vh"
      bg={useColorModeValue("white", "navy.900")}
      overflow="hidden"
    >
      {/* 왼쪽: 로그인 폼 */}
      <Flex
        w={{ base: "100%", lg: "50%" }}
        direction="column"
        justify="center"
        align="center"
        px={{ base: "20px", md: "50px", lg: "80px" }}
        py={{ base: "40px", md: "60px" }}
      >
        <Box w="100%" maxW="440px">
          {/* Welcome Back */}
          <Heading
            color={textColor}
            fontSize={{ base: "28px", md: "36px" }}
            mb="10px"
            fontWeight="700"
          >
            Welcome Back 👋
          </Heading>
          <Text
            mb="36px"
            color={textColorSecondary}
            fontWeight="400"
            fontSize={{ base: "sm", md: "md" }}
          >
            Today is a new day. It's your day. You shape it.
            <br />
            Sign in to start managing your projects.
          </Text>

          {/* 이메일 입력 */}
          <FormControl mb="20px">
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
              onKeyPress={(e) => e.key === "Enter" && handleSignIn()}
            />
          </FormControl>

          {/* 비밀번호 입력 */}
          <FormControl mb="16px">
            <FormLabel
              fontSize="sm"
              fontWeight="500"
              color={textColor}
              mb="8px"
            >
              Password
            </FormLabel>
            <InputGroup size="md">
              <Input
                isRequired={true}
                fontSize="sm"
                placeholder="At least 8 characters"
                size="lg"
                type={show ? "text" : "password"}
                variant="auth"
                borderRadius="10px"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSignIn()}
              />
              <InputRightElement display="flex" alignItems="center" mt="4px">
                <Icon
                  color={textColorSecondary}
                  _hover={{ cursor: "pointer" }}
                  as={show ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                  onClick={handleClick}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>

          {/* Forgot Password */}
          <Flex justify="flex-end" mb="24px">
            <NavLink to="/auth/forgot-password">
              <Text
                color={textColorBrand}
                fontSize="sm"
                fontWeight="500"
                _hover={{ textDecoration: "underline" }}
              >
                Forgot Password?
              </Text>
            </NavLink>
          </Flex>

          {/* Sign in 버튼 */}
          <Button
            fontSize="sm"
            variant="brand"
            fontWeight="500"
            w="100%"
            h="50px"
            mb="20px"
            borderRadius="10px"
            onClick={handleSignIn}
            isLoading={loading}
          >
            Sign in
          </Button>

          {/* Or sign in with */}
          <Flex align="center" mb="20px">
            <Box flex="1" h="1px" bg="gray.200" />
            <Text color="gray.400" mx="14px" fontSize="sm">
              Or sign in with
            </Text>
            <Box flex="1" h="1px" bg="gray.200" />
          </Flex>

          {/* Social 로그인 버튼 */}
          <Flex gap="12px" mb="24px">
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
            >
              Facebook
            </Button>
          </Flex>

          {/* Sign up 링크 */}
          <Text
            color={textColorSecondary}
            fontWeight="400"
            fontSize="14px"
            textAlign="center"
          >
            Don't you have an account?{" "}
            <NavLink to="/auth/sign-up">
              <Text
                color={textColorBrand}
                as="span"
                fontWeight="600"
                _hover={{ textDecoration: "underline" }}
              >
                Sign up
              </Text>
            </NavLink>
          </Text>

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

export default SignIn;
