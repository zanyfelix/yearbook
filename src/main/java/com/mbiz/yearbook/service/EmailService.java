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
     * 
     */
    
    @Value("${file.path.thumbnail}")
	private String uploadPath;
    
    public void sendContactUsEmail(ContactUs inquiryToForward) {
    	
        MimeMessage mimeMessage = javaMailSender.createMimeMessage();

        try {
            // MimeMessageHelper를 사용하면 파일 첨부나 HTML 메일 전송이 쉬워집니다. (true는 multipart 메일임을 의미)
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            
            List<User> userList = userRepository.findByUserId("admin");
            if (userList == null || userList.isEmpty()) {
                throw new RuntimeException("관리자(admin) 계정을 찾을 수 없어 메일을 보낼 수 없습니다.");
            }
            
            
            
            String adminEmail = userList.get(0).getMail();
            if (adminEmail == null || adminEmail.isEmpty()) {
                throw new RuntimeException("관리자 계정에 이메일 주소가 설정되지 않았습니다.");
            }
            
         // [디버깅용 로그 추가]
            System.out.println("============== 메일 발송 디버깅 ==============");
            System.out.println("1. 발신자(SMTP 계정): " + smtpAuthEmail);
            System.out.println("2. 수신자(관리자 DB): " + adminEmail);
            System.out.println("3. 제목: " + inquiryToForward.getSubject());
            System.out.println("===========================================");

            // 1. 메일 수신자 설정 (관리자 이메일)
            helper.setTo(adminEmail);

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

                // 1. 만약 DB에 경로 없이 '파일이름'만 있다면, 우리가 정한 폴더 경로를 앞에 붙여줍니다.
                if (!file.exists() && !attachmentPath.contains("/") && !attachmentPath.contains("\\")) {
                    file = new File(uploadPath + attachmentPath);
                }

                // 2. 로그로 확인
                System.out.println("🔎 [재확인] 최종 파일 경로: " + file.getAbsolutePath());

                if (file.exists()) {
                    // ... (기존 첨부 로직)
                    String originalFileName = file.getName();
                    // ...
                    helper.addAttachment(originalFileName, new FileSystemResource(file));
                    System.out.println("✅ 첨부파일 찾음! 메일에 추가 완료.");
                } else {
                    System.err.println("⚠️ [실패] 여전히 파일을 못 찾았습니다. UPLOAD_DIR 경로를 확인하세요: " + uploadPath);
                }
            }

            // 7. 메일 발송
            javaMailSender.send(mimeMessage);
            
            System.out.println("✅ 메일 전송 명령 호출 완료 (에러 없음)");

        } catch (MessagingException e) {
            // [수정 2] 예외 로그를 찍고, 반드시 다시 던져야 컨트롤러가 실패를 인지함
            e.printStackTrace();
            throw new RuntimeException("메일 발송 실패: " + e.getMessage(), e); 
        } catch (Exception e) {
            // 기타 예외(관리자 없음 등) 처리
            e.printStackTrace();
            throw new RuntimeException("메일 서비스 오류: " + e.getMessage(), e);
        }
    }
}