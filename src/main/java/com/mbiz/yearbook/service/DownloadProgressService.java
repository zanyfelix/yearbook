package com.mbiz.yearbook.service;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 관리자 연감 다운로드 진행 상황을 SSE(Server-Sent Events)로 전송하는 서비스.
 *
 * 흐름:
 *   1. 프론트엔드가 progressToken 을 생성하고 /admin/yearbook/progress?token=... SSE 구독
 *   2. 프론트엔드가 /admin/yearbook/download?token=... 다운로드 요청
 *   3. 백엔드가 각 학교 렌더링 완료 시 sendEvent() 로 진행률 전송
 *   4. 렌더링 완료 후 백엔드가 complete() 호출 → SSE 연결 종료
 *   5. 다운로드 요청의 응답(ZIP 스트림)이 브라우저에 전달됨
 */
@Service
public class DownloadProgressService {

    /** token → SseEmitter 매핑 (동시 요청 지원) */
    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    /**
     * 새 SSE 에미터 생성 및 등록.
     * timeout: 30분 (렌더링이 최대 30분 걸릴 수 있음)
     */
    public SseEmitter createEmitter(String token) {
        SseEmitter emitter = new SseEmitter(1_800_000L); // 30분

        emitters.put(token, emitter);

        // 에미터 완료·타임아웃·에러 시 자동 제거
        emitter.onCompletion(() -> emitters.remove(token));
        emitter.onTimeout(()    -> emitters.remove(token));
        emitter.onError((e)     -> emitters.remove(token));

        // 연결 즉시 초기 ping 전송 (브라우저 EventSource 연결 확인용)
        try {
            emitter.send(SseEmitter.event().name("ping").data("connected"));
        } catch (IOException e) {
            emitters.remove(token);
        }

        return emitter;
    }

    /**
     * 진행 이벤트 전송.
     *
     * @param token     progressToken (프론트엔드와 공유)
     * @param eventName SSE 이벤트 이름 (schoolStart, schoolDone, packaging, done 등)
     * @param data      JSON 직렬화될 객체 (Map 또는 단순 문자열)
     */
    public void sendEvent(String token, String eventName, Object data) {
        if (token == null || token.isBlank()) return;

        SseEmitter emitter = emitters.get(token);
        if (emitter == null) return;

        try {
            emitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(data));
        } catch (IOException e) {
            // 연결이 끊겼으면 제거
            emitters.remove(token);
        }
    }

    /**
     * 모든 렌더링 완료 후 SSE 연결 정상 종료.
     */
    public void complete(String token) {
        if (token == null || token.isBlank()) return;

        SseEmitter emitter = emitters.remove(token);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event().name("done").data("complete"));
                emitter.complete();
            } catch (IOException ignored) {
                emitter.completeWithError(ignored);
            }
        }
    }

    /**
     * 에러 발생 시 SSE 연결 오류 종료.
     */
    public void completeWithError(String token, String errorMessage) {
        if (token == null || token.isBlank()) return;

        SseEmitter emitter = emitters.remove(token);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event().name("error").data(errorMessage));
                emitter.complete();
            } catch (IOException ignored) {
                emitter.completeWithError(ignored);
            }
        }
    }
}
