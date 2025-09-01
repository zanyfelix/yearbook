$(document).ready(function() {
    $("#submitBtn").on("click", function(e) {
		e.preventDefault();
		
        // 폼 데이터 수집
        const name = $("#name").val();
        const email = $("#mail").val();
        const subject = $("#subject").val();
        const message = $("#message").val();
        const userId = $("#userId").val();
        const file = $("#file")[0].files[0];

        // 기본적인 클라이언트 측 유효성 검사
        if (!name || !email || !subject || !message) {
            alert("Please fill in all required fields.");
            return;
        }

        const formData = new FormData();
        formData.append("name", name);
        formData.append("mail", email);
        formData.append("subject", subject);
        formData.append("message", message);
        formData.append("userId", userId);
        if (file) {
            formData.append("file", file);
        }

        $.ajax({
            url: "/api/contactUs/submit",
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success) {
                    // 성공 시 모달 표시
                    const modal = new bootstrap.Modal(document.getElementById('successModal'));
                    modal.show();
                    // 폼 초기화
                    $("#contactForm")[0].reset();
                } else {
                    // 실패 시 에러 메시지 표시
                    alert("Submission failed: " + response.message);
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("An error occurred. Please try again later.");
            }
        });
    });
});