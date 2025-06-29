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
    <div class="top-bar">
        <span class="badge bg-success text-dark">Yearbook Due: Mar. 31st. 2026 (D-${remainDays} days left)</span>
        <span class="badge bg-success text-dark">Group Photo Page: ${groupProgress}%</span>
        <span class="badge bg-success text-dark">Event Photo Page: ${eventProgress}%</span>
    </div>
    
    <div class="section-box">
        <h5>Yearbook Guidance</h5>
        <ul>
            <li>Please click HERE to download the manual for this program</li>
            <li>Please review all the guidelines prior to commencing work on the yearbook pages</li>
            <li>If you have any difficulties of using this program, please direct your inquiries by email to chris.kim@mbizkr.com</li>
        </ul>
    </div>

    <div class="section-box">
        <h5>NOTICE</h5>
        <ul>
            <li>The Due date for yearbook page submission is March 31st, 2026</li>
            <li>Please review the following guidelines below prior to commencing work on the yearbook</li>
            <li>If you have any difficulties using this program, please send your inquiries by email to
                <a href="mailto:chris.kim@mbizkr.com">chris.kim@mbizkr.com</a></li>
        </ul>
    </div>

    <div class="section-box">
        <h5>Yearbook Edit</h5>
        <ul>
            <li>Click “+” to start making yearbook pages</li>
            <li>Please customize the pages by utilizing preferred backgrounds, frames, and text</li>
            <li>The number of pages per category is restricted by the administrator. Should additional pages be required, please contact the administrator.</li>
        </ul>
    </div>

    <div class="section-box">
        <h5>Progress Report</h5>
        <ul>
            <li>Please ensure that all submissions are finalized before the designated deadline, as modifications to any page will not be possible thereafter.</li>
        </ul>
    </div>

    <div class="section-box">
        <h5>Submit to MBIZ</h5>
        <ul>
            <li>Final Submission Date is March 31st, 2026</li>
            <li>Please ensure that all submissions are finalized before the designated deadline, as modifications to any page will not be possible thereafter.</li>
        </ul>
    </div>
</div>

</body>
</html>