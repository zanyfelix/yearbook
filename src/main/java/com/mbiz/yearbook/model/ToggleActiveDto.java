package com.mbiz.yearbook.model;
public class ToggleActiveDto {
    private Long id;
    private boolean active;  // true=ON, false=OFF

    public ToggleActiveDto() {}
    public Long   getId()     { return id; }
    public void   setId(Long id) { this.id = id; }
    public boolean isActive() { return active; }
    public void   setActive(boolean active) { this.active = active; }
}