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
import { NavLink } from "react-router-dom";
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
} from "@chakra-ui/react";
// Assets
import illustration from "assets/img/auth/auth.png";
import { FcGoogle } from "react-icons/fc";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { RiEyeCloseLine } from "react-icons/ri";

function SignUp() {
  // Chakra color mode
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = "gray.400";
  const textColorBrand = useColorModeValue("brand.500", "white");
  const socialBtnBg = useColorModeValue("white", "navy.800");
  const socialBtnBorder = useColorModeValue("gray.200", "whiteAlpha.200");
  const socialBtnHover = useColorModeValue(
    { bg: "gray.50" },
    { bg: "whiteAlpha.100" }
  );
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const handlePasswordClick = () => setShowPassword(!showPassword);
  const handleConfirmPasswordClick = () => setShowConfirmPassword(!showConfirmPassword);

  return (
    <Flex
      w="100vw"
      h="100vh"
      bg={useColorModeValue("white", "navy.900")}
      overflow="hidden"
    >
      {/* 왼쪽: 회원가입 폼 */}
      <Flex
        w={{ base: "100%", lg: "50%" }}
        direction="column"
        justify="center"
        align="center"
        px={{ base: "20px", md: "50px", lg: "80px" }}
        py={{ base: "40px", md: "60px" }}
        overflowY="auto"
      >
        <Box w="100%" maxW="440px">
          {/* Welcome to ExploreMe */}
          <Heading
            color={textColor}
            fontSize={{ base: "28px", md: "36px" }}
            mb="10px"
            fontWeight="700"
          >
            Welcome to ExploreMe 👋
          </Heading>
          <Text
            mb="36px"
            color={textColorSecondary}
            fontWeight="400"
            fontSize={{ base: "sm", md: "md" }}
          >
            Kindly fill in your details below to create an account
          </Text>

          {/* Full Name 입력 */}
          <FormControl mb="20px">
            <FormLabel
              fontSize="sm"
              fontWeight="500"
              color={textColor}
              mb="8px"
            >
              Full Name
            </FormLabel>
            <Input
              isRequired={true}
              variant="auth"
              fontSize="sm"
              type="text"
              placeholder="Enter your full name"
              fontWeight="500"
              size="lg"
              borderRadius="10px"
            />
          </FormControl>

          {/* Email Address 입력 */}
          <FormControl mb="20px">
            <FormLabel
              fontSize="sm"
              fontWeight="500"
              color={textColor}
              mb="8px"
            >
              Email Address*
            </FormLabel>
            <Input
              isRequired={true}
              variant="auth"
              fontSize="sm"
              type="email"
              placeholder="Enter your email address"
              fontWeight="500"
              size="lg"
              borderRadius="10px"
            />
          </FormControl>

          {/* Password 입력 */}
          <FormControl mb="20px">
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
                placeholder="Create your password"
                size="lg"
                type={showPassword ? "text" : "password"}
                variant="auth"
                borderRadius="10px"
              />
              <InputRightElement display="flex" alignItems="center" mt="4px">
                <Icon
                  color={textColorSecondary}
                  _hover={{ cursor: "pointer" }}
                  as={showPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                  onClick={handlePasswordClick}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>

          {/* Confirm Password 입력 */}
          <FormControl mb="20px">
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
                placeholder="Confirm your password"
                size="lg"
                type={showConfirmPassword ? "text" : "password"}
                variant="auth"
                borderRadius="10px"
              />
              <InputRightElement display="flex" alignItems="center" mt="4px">
                <Icon
                  color={textColorSecondary}
                  _hover={{ cursor: "pointer" }}
                  as={showConfirmPassword ? RiEyeCloseLine : MdOutlineRemoveRedEye}
                  onClick={handleConfirmPasswordClick}
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>

          {/* Terms & Conditions */}
          <Flex mb="24px" align="center">
            <Checkbox
              colorScheme="brand"
              me="10px"
            />
            <Text
              color={textColorSecondary}
              fontSize="sm"
              fontWeight="400"
            >
              I agree to terms & conditions
            </Text>
          </Flex>

          {/* Register Account 버튼 */}
          <Button
            fontSize="sm"
            variant="brand"
            fontWeight="500"
            w="100%"
            h="50px"
            mb="20px"
            borderRadius="10px"
          >
            Register Account
          </Button>

          {/* Or Register with */}
          <Flex align="center" mb="20px">
            <Box flex="1" h="1px" bg="gray.200" />
            <Text color="gray.400" mx="14px" fontSize="sm">
              Or Register with
            </Text>
            <Box flex="1" h="1px" bg="gray.200" />
          </Flex>

          {/* Social 로그인 버튼 */}
          <Button
            w="100%"
            fontSize="sm"
            fontWeight="500"
            h="50px"
            borderRadius="10px"
            bg={socialBtnBg}
            border="1px solid"
            borderColor={socialBtnBorder}
            _hover={socialBtnHover}
            leftIcon={<Icon as={FcGoogle} w="20px" h="20px" />}
            mb="24px"
          >
            Register with Google
          </Button>

          {/* Already have account */}
          <Text
            color={textColorSecondary}
            fontWeight="400"
            fontSize="14px"
            textAlign="center"
          >
            Already have an account?{" "}
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

export default SignUp;
