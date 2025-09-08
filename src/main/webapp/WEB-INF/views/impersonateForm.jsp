<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Logging in as ${targetUser.name}...</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 450px;
        }
        .config-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
            font-size: 14px;
        }
        .config-info h4 {
            margin-top: 0;
            color: #495057;
        }
        .config-item {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .config-item:last-child {
            border-bottom: none;
        }
        .config-label {
            font-weight: 500;
            color: #6c757d;
        }
        .config-value {
            color: #212529;
            font-weight: bold;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .info {
            margin: 20px 0;
            padding: 15px;
            background: #f0f0f0;
            border-radius: 5px;
        }
        .admin-info {
            color: #667eea;
            font-weight: bold;
        }
        .user-info {
            color: #764ba2;
            font-weight: bold;
        }
        .warning {
            color: #ff6b6b;
            font-size: 12px;
            margin-top: 10px;
        }
        .countdown {
            font-size: 18px;
            color: #667eea;
            font-weight: bold;
            margin: 10px 0;
        }
        .status-enabled {
            color: #28a745;
        }
        .status-disabled {
            color: #dc3545;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <h2>🔄 Impersonate Mode</h2>
        <div class="spinner"></div>
        
        <div class="info">
            <p>Admin: <span class="admin-info">${adminUser.name}</span></p>
            <p>↓</p>
            <p>Logging in as: <span class="user-info">${targetUser.name} (${targetUser.userId})</span></p>
        </div>
        
        <!-- 설정 정보 표시 -->
        <div class="config-info">
            <h4>⚙️ Active Configuration</h4>
            <div class="config-item">
                <span class="config-label">Feature Status:</span>
                <span class="config-value ${config.enabled ? 'status-enabled' : 'status-disabled'}">
                    ${config.enabled ? '✅ Enabled' : '❌ Disabled'}
                </span>
            </div>
            <div class="config-item">
                <span class="config-label">Token Timeout:</span>
                <span class="config-value">${config.tokenTimeout} seconds</span>
            </div>
            <div class="config-item">
                <span class="config-label">Session Duration:</span>
                <span class="config-value">${config.sessionTimeout / 60} minutes</span>
            </div>
            <div class="config-item">
                <span class="config-label">Audit Logging:</span>
                <span class="config-value ${config.audit.enabled ? 'status-enabled' : 'status-disabled'}">
                    ${config.audit.enabled ? '✅ Active' : '⚠️ Inactive'}
                </span>
            </div>
            <div class="config-item">
                <span class="config-label">Max Sessions:</span>
                <span class="config-value">${config.maxConcurrentSessions}</span>
            </div>
        </div>
        
        <div class="countdown">
            Token expires in: <span id="countdown">${config.tokenTimeout}</span> seconds
        </div>
        
        <p>Establishing secure session...</p>
        <p class="warning">
            ⚠️ All actions will be logged for audit purposes<br>
            Session will auto-expire after ${config.sessionTimeout / 60} minutes
        </p>
        
        <!-- 자동 제출 폼 -->
        <form id="autoLoginForm" action="${pageContext.request.contextPath}/admin/impersonate/login" method="post" style="display: none;">
            <input type="hidden" name="token" value="${token}" />
            <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}" />
        </form>
    </div>
    
    <script>
        // 카운트다운 표시
        var countdown = ${config.tokenTimeout};
        var countdownElement = document.getElementById('countdown');
        
        var countdownInterval = setInterval(function() {
            countdown--;
            if (countdown >= 0) {
                countdownElement.textContent = countdown;
            } else {
                clearInterval(countdownInterval);
                countdownElement.textContent = "EXPIRED";
                countdownElement.style.color = "#dc3545";
            }
        }, 1000);
        
        // 1초 후 자동으로 폼 제출
        setTimeout(function() {
            document.getElementById('autoLoginForm').submit();
        }, 1000);
        
        // 5초 후에도 페이지가 그대로면 수동 제출 버튼 표시
        setTimeout(function() {
            if (document.getElementById('autoLoginForm')) {
                document.querySelector('.login-container').innerHTML += 
                    '<button onclick="document.getElementById(\'autoLoginForm\').submit();" ' +
                    'style="margin-top: 20px; padding: 10px 20px; background: #667eea; color: white; ' +
                    'border: none; border-radius: 5px; cursor: pointer;">Click here if not redirected</button>';
            }
        }, 5000);
        
        // 토큰 만료 시 알림
        setTimeout(function() {
            if (document.getElementById('autoLoginForm')) {
                alert('Token has expired. Please try again.');
                window.close();
            }
        }, ${config.tokenTimeout * 1000});
    </script>
</body>
</html>