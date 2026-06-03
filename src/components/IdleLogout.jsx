import { useEffect, useRef, useState, useCallback } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
} from "@chakra-ui/react";
import { useAuth } from "contexts/AuthContext";

// 무활동 30분 → 1분 카운트다운 모달 → 미응답 시 자동 로그아웃
const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30분
const GRACE_MS = 60 * 1000; // 모달 표시 후 유예 1분
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

export default function IdleLogout() {
  const { user, signOut } = useAuth();
  const isLoggedIn = !!user;

  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(GRACE_MS / 1000);

  // signOut을 ref로 보관 → 콜백 identity가 signOut 변화에 영향받지 않게 (effect 재실행 방지)
  const signOutRef = useRef(signOut);
  useEffect(() => {
    signOutRef.current = signOut;
  }, [signOut]);

  const idleTimer = useRef(null);
  const graceTimer = useRef(null);
  const countdownTimer = useRef(null);
  const modalOpenRef = useRef(false);
  const lastResetRef = useRef(0);

  const clearAll = useCallback(() => {
    clearTimeout(idleTimer.current);
    clearTimeout(graceTimer.current);
    clearInterval(countdownTimer.current);
  }, []);

  const doLogout = useCallback(async () => {
    clearAll();
    modalOpenRef.current = false;
    setShowModal(false);
    try {
      await signOutRef.current();
    } catch (e) {
      // 무시 (이미 로그아웃 등)
    }
  }, [clearAll]);

  const startGrace = useCallback(() => {
    modalOpenRef.current = true;
    setCountdown(GRACE_MS / 1000);
    setShowModal(true);
    clearInterval(countdownTimer.current);
    countdownTimer.current = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    clearTimeout(graceTimer.current);
    graceTimer.current = setTimeout(() => doLogout(), GRACE_MS);
  }, [doLogout]);

  const armIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => startGrace(), IDLE_LIMIT_MS);
  }, [startGrace]);

  const onActivity = useCallback(() => {
    if (modalOpenRef.current) return; // 모달 떠있는 동안엔 명시적 버튼으로만 해제
    const now = Date.now();
    if (now - lastResetRef.current < 1000) return; // 1초 throttle
    lastResetRef.current = now;
    armIdle();
  }, [armIdle]);

  // "계속 로그인" — 타이머 재시작
  const stayLoggedIn = useCallback(() => {
    clearTimeout(graceTimer.current);
    clearInterval(countdownTimer.current);
    modalOpenRef.current = false;
    setShowModal(false);
    armIdle();
  }, [armIdle]);

  // 로그인 여부(boolean)에만 의존 → 토큰 갱신/리렌더로 인한 타이머 재설정 방지
  useEffect(() => {
    if (!isLoggedIn) {
      clearAll();
      modalOpenRef.current = false;
      setShowModal(false);
      return;
    }
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    armIdle();
    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      clearAll();
    };
    // onActivity/armIdle/clearAll 은 이제 stable identity (signOut은 ref 사용)
  }, [isLoggedIn, onActivity, armIdle, clearAll]);

  if (!isLoggedIn || !showModal) return null;

  return (
    <Modal isOpen={showModal} onClose={stayLoggedIn} isCentered closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>자동 로그아웃 안내</ModalHeader>
        <ModalBody>
          <Text fontSize="sm" mb="8px">
            30분 동안 활동이 없어 곧 자동 로그아웃됩니다.
          </Text>
          <Text fontSize="sm" fontWeight="700" color="red.500">
            {countdown}초 후 로그아웃
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={doLogout}>
            지금 로그아웃
          </Button>
          <Button colorScheme="brand" onClick={stayLoggedIn}>
            계속 로그인
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
