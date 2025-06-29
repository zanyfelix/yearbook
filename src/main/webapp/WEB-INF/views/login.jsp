<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<!DOCTYPE html>
<html>
<head>
    <title>Yearbook 로그인</title>
    <!-- Bootstrap 5 CDN -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            background-color: #f0f4f8;
        }
        .login-container {
            max-width: 420px;
            margin: 80px auto;
            padding: 30px;
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 6px 12px rgba(0,0,0,0.1);
        }
        .form-title {
            font-weight: bold;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>

<div class="container">
    <div class="login-container">
        <h3 class="text-center form-title">MBIZ Yearbook</h3>

        <form method="post" action="/login">
            <div class="mb-3">
                <input type="text" class="form-control" id="username" name="username" placeholder="User ID" value="user" required autofocus>
            </div>
            <div class="mb-3">
                <input type="password" class="form-control" id="password" name="password" placeholder="Password" value="1234" required>
            </div>

            <c:if test="${not empty error}">
                <div class="alert alert-danger" role="alert">
                    ${error}
                </div>
            </c:if>

            <div class="d-grid">
                <button type="submit" class="btn btn-primary">로그인</button>
            </div>
        </form>
    </div>
</div>

<!-- Bootstrap JS (optional) -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>