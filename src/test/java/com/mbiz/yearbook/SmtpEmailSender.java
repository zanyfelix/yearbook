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

public class SmtpEmailSender {

    public static void main(String[] args) {

        // --- Email Information Setup ---
        // 📧 Sender's Information
        final String senderEmail = "noreply@capturecord.com"; // Your email address
        final String senderPassword = "fGVJvFh6si10";   // Your email app password

        // 📧 Receiver's Information
        final String receiverEmail = "brainy_smurf@naver.com"; // Receiver's email address

        // --- SMTP Server Information (Gmail) ---
        final String smtpHost = "smtp.worksmobile.com";
        final int smtpPort = 587; // TLS port

        // --- Configure SMTP server properties ---
        Properties props = new Properties();
        props.put("mail.smtp.host", smtpHost);
        props.put("mail.smtp.port", smtpPort);
        props.put("mail.smtp.auth", "true"); // Enable authentication
        props.put("mail.smtp.starttls.enable", "true"); // Enable TLS encryption

        // --- Create a Session with an Authenticator ---
        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(senderEmail, senderPassword);
            }
        });
        
        // You can enable debug mode to see the communication with the SMTP server
        // session.setDebug(true);

        try {
            // --- Create the Email Message ---
            Message message = new MimeMessage(session);

            // Set sender
            message.setFrom(new InternetAddress(senderEmail));

            // Set receiver
            message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(receiverEmail));

            // Set subject
            message.setSubject("Java SMTP Mail Sending Test");

            // Set body
            message.setText("This is a test email sent automatically from Java. 🚀");

            // --- Send the Email ---
            Transport.send(message);

            System.out.println("✅ Email sent successfully! (To: " + receiverEmail + ")");

        } catch (MessagingException e) {
            System.err.println("❌ Failed to send email.");
            e.printStackTrace();
        }
    }
}