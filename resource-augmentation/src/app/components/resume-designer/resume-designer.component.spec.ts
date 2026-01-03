import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumeDesignerComponent } from './resume-designer.component';

describe('ResumeDesignerComponent', () => {
  let component: ResumeDesignerComponent;
  let fixture: ComponentFixture<ResumeDesignerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumeDesignerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResumeDesignerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
