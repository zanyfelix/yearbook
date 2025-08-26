package com.mbiz.yearbook.model;

import java.util.List;

public class SubmitForm {
    
    private List<Submit> submit;

    // Getter와 Setter를 반드시 생성해야 합니다.
    public List<Submit> getSubmit() {
        return submit;
    }

    public void setSubmit(List<Submit> submit) {
        this.submit = submit;
    }
}