package com.mbiz.yearbook.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.mbiz.yearbook.model.Progress;
import com.mbiz.yearbook.repository.YearbookRepository;

@Service
public class ProgressService {

    @Autowired
    private YearbookRepository yearbookRepository;
    
    public Progress getProgressForUser(Long userId) {
    	
    	Progress progress = new Progress();
//    	
//    	int totalGroup = 0;
//    	int totalEvent = 0;
//    	int totalOverall = 0;
//    	
//    	int groupCount = yearbookRepository.countByUserIdAndCategory(userId, "group");
//        int eventCount = yearbookRepository.countByUserIdAndCategory(userId, "event");
//        int overallCount = groupCount + eventCount;
//        
//        progress.setGroupCompleted(groupCount);
//        progress.setGroupTotal(totalGroup);
//        
//        progress.setEventCompleted(eventCount);
//        progress.setEventTotal(totalEvent);
//
//        progress.setOverallCompleted(overallCount);
//        progress.setOverallTotal(totalOverall);
//        
        return progress;
    }

}