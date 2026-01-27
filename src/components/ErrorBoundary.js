import React from 'react';
import { Box, Heading, Text, Button, VStack } from '@chakra-ui/react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('에러 바운더리에서 에러 캐치:', {
      error: error?.message || error,
      errorInfo: errorInfo?.componentStack,
      stack: error?.stack
    });

    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          bg="gray.50"
        >
          <VStack spacing={4} p={8} bg="white" borderRadius="lg" boxShadow="lg" maxW="600px">
            <Heading size="lg" color="red.500">
              오류가 발생했습니다
            </Heading>
            <Text color="gray.600" textAlign="center">
              {this.state.error?.message || '알 수 없는 오류가 발생했습니다.'}
            </Text>
            {this.state.errorInfo && (
              <Box
                bg="gray.100"
                p={4}
                borderRadius="md"
                maxH="200px"
                overflowY="auto"
                w="100%"
              >
                <Text fontSize="sm" fontFamily="mono" color="gray.700">
                  {this.state.error?.stack}
                </Text>
              </Box>
            )}
            <Button
              colorScheme="blue"
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.href = '/';
              }}
            >
              홈으로 돌아가기
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
