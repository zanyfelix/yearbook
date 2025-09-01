package com.mbiz.yearbook.service;

import java.io.File;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.ContactUs;
import com.mbiz.yearbook.model.User;
import com.mbiz.yearbook.repository.UserRepository;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender javaMailSender;
    
    @Autowired
    private UserRepository userRepository;
    
    @Value("${spring.mail.username}")
    private String smtpAuthEmail;

    /**
     * Contact Us 문의 내용을 이메일로 발송합니다.
     * @param contact 문의 내용이 담긴 객체
     * @param file 첨부 파일
     */
    public void sendContactUsEmail(ContactUs inquiryToForward) {
    	
        MimeMessage mimeMessage = javaMailSender.createMimeMessage();

        try {
            // MimeMessageHelper를 사용하면 파일 첨부나 HTML 메일 전송이 쉬워집니다. (true는 multipart 메일임을 의미)
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            
            List<User> user = userRepository.findByUserId("admin");

            // 1. 메일 수신자 설정 (관리자 이메일)
            helper.setTo(user.get(0).getMail());

            // 2. 메일 발신자 설정 (서버 계정)
            helper.setFrom(smtpAuthEmail);
            
            // 3. 답장 받을 이메일 주소 설정 (문의한 사용자의 이메일)
            helper.setReplyTo(inquiryToForward.getMail());

            // 4. 메일 제목 설정
            helper.setSubject("[Contact Us Inquiry] " + inquiryToForward.getSubject());

            // 5. 메일 본문 내용 구성
            StringBuilder mailContent = new StringBuilder();
            mailContent.append("<h3>New Inquiry Received</h3>");
            mailContent.append("<hr>");
            mailContent.append("<p><strong>School:</strong> ").append(inquiryToForward.getSchoolName()).append("</p>");
            mailContent.append("<p><strong>Name:</strong> ").append(inquiryToForward.getName()).append("</p>");
            mailContent.append("<p><strong>Email (Reply-To):</strong> ").append(inquiryToForward.getMail()).append("</p>");
            mailContent.append("<h4>Message:</h4>");
            mailContent.append("<p style='border:1px solid #ddd; padding:10px;'>").append(inquiryToForward.getMessage().replaceAll("\n", "<br>")).append("</p>");
            
            helper.setText(mailContent.toString(), true); // true는 HTML 형식의 메일임을 의미

            // ▼▼▼ 5. 첨부파일 추가 로직 ▼▼▼
            String attachmentPath = inquiryToForward.getAttachmentPath();
            if (attachmentPath != null && !attachmentPath.isEmpty()) {
                File file = new File(attachmentPath);
                if (file.exists()) {
                    // 원본 파일명 추출 (경로에서 첫 '_' 이후의 문자열)
                    String originalFileName = file.getName();
                    int underscoreIndex = originalFileName.indexOf('_');
                    if (underscoreIndex != -1) {
                        originalFileName = originalFileName.substring(underscoreIndex + 1);
                    }
                    
                    FileSystemResource fileResource = new FileSystemResource(file);
                    helper.addAttachment(originalFileName, fileResource);
                }
            }

            // 7. 메일 발송
            javaMailSender.send(mimeMessage);

        } catch (MessagingException e) {
            // 이메일 발송 실패 시 예외 처리 (서버 로그에 기록 등)
            e.printStackTrace();
            // 필요하다면 throw new RuntimeException("Email sending failed"); 등으로 예외를 다시 던질 수 있습니다.
        }
    }
}