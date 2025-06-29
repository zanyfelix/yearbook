<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<%@ page session="true" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>Yearbook Home</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
        }

        .sidebar {
            width: 200px;
            background-color: #333;
            color: white;
            position: fixed;
            height: 100%;
            padding-top: 20px;
        }

        .sidebar h5 {
            text-align: center;
            margin-bottom: 30px;
            font-size: 1.1rem;
        }

        .sidebar a {
            display: block;
            padding: 12px 20px;
            color: white;
            text-decoration: none;
        }

        .sidebar a:hover {
            background-color: #555;
        }

        .content {
            margin-left: 200px;
            padding: 20px 30px;
        }

        .top-bar {
            background-color: #d2f4e8;
            border: 1px solid #ccc;
            padding: 10px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .top-bar .badge {
            font-size: 0.95rem;
            padding: 10px 16px;
        }

        .section-box {
            background-color: white;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 5px solid #ccc;
            box-shadow: 0 1px 4px rgba(0,0,0,0.1);
        }

        .section-box h5 {
            font-weight: bold;
            margin-bottom: 12px;
        }

        .section-box ul {
            margin: 0;
            padding-left: 20px;
        }
        
        .sidebar a.active {
        	background-color: #28a745;
        	font-weight: bold;
    	}
    </style>
</head>
<body>

<div class="sidebar">
    <h5>${sessionScope.loginUser.schoolName}</h5>
    <a href="/home" class="${currentMenu eq 'home' ? 'active' : ''}">Home</a>
    <a href="/edit?username=${sessionScope.loginUser.username}" class="${currentMenu eq 'edit' ? 'active' : ''}">Yearbook Edit</a>
    <a href="/progress" class="${currentMenu eq 'progress' ? 'active' : ''}">Progress Report</a>
    <a href="/submit" class="${currentMenu eq 'submit' ? 'active' : ''}">Submit to MBIZ</a>
    <a href="/contact" class="${currentMenu eq 'contact' ? 'active' : ''}">Contact Us</a>
</div>

<div class="content">

</div>

</body>
</html>