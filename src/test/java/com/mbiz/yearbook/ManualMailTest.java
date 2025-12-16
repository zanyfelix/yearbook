package com.mbiz.yearbook;
import java.util.Properties;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

public class ManualMailTest {

    public static void main(String[] args) {
        // 1. SMTP 서버 설정 정보
        String host = "smtp.worksmobile.com";
        String port = "587";
        final String username = "noreply@capturecord.com";
        final String password = "tkgKH28c0htl"; // 보안을 위해 테스트 후 즉시 삭제/변경 요망

        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.host", host);
        props.put("mail.smtp.port", port);
        props.put("mail.smtp.ssl.protocols", "TLSv1.2"); // 최신 보안 프로토콜 명시 권장

        // 2. 세션 생성 및 인증
        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(username, password);
            }
        });

        try {
            // 3. 메시지 작성
            Message message = new MimeMessage(session);
            message.setFrom(new InternetAddress(username));
            message.setRecipients(
                Message.RecipientType.TO,
                InternetAddress.parse("kwangzi@naver.com") // 수신자 이메일 수정
            );
            message.setSubject("Pure Java SMTP 테스트 (WorksMobile)");
            message.setText("Java Mail API를 직접 사용하여 발송한 테스트 메일입니다.");

            // 4. 발송
            Transport.send(message);
            System.out.println("✅ 메일 전송 성공!");

        } catch (MessagingException e) {
            System.err.println("❌ 메일 전송 실패");
            e.printStackTrace();
        }
    }
}