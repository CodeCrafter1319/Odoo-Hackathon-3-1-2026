import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminProjectsCreateComponent } from './admin-projects-create.component';

describe('AdminProjectsCreateComponent', () => {
  let component: AdminProjectsCreateComponent;
  let fixture: ComponentFixture<AdminProjectsCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminProjectsCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminProjectsCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
