package com.mbiz.yearbook.model;

public class Progress {
	
	private int overallCompleted; // ex: 15
    private int overallTotal = 0;

    private int groupCompleted;   // ex: 6
    private int groupTotal = 0;

    private int eventCompleted;   // ex: 7
    private int eventTotal = 0;
    
	public int getOverallCompleted() {
		return overallCompleted;
	}
	public void setOverallCompleted(int overallCompleted) {
		this.overallCompleted = overallCompleted;
	}
	public int getOverallTotal() {
		return overallTotal;
	}
	public void setOverallTotal(int overallTotal) {
		this.overallTotal = overallTotal;
	}
	public int getGroupCompleted() {
		return groupCompleted;
	}
	public void setGroupCompleted(int groupCompleted) {
		this.groupCompleted = groupCompleted;
	}
	public int getGroupTotal() {
		return groupTotal;
	}
	public void setGroupTotal(int groupTotal) {
		this.groupTotal = groupTotal;
	}
	public int getEventCompleted() {
		return eventCompleted;
	}
	public void setEventCompleted(int eventCompleted) {
		this.eventCompleted = eventCompleted;
	}
	public int getEventTotal() {
		return eventTotal;
	}
	public void setEventTotal(int eventTotal) {
		this.eventTotal = eventTotal;
	}

    
}