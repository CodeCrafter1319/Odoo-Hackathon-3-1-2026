import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectResourcesComponent } from './project-resources.component';

describe('ProjectResourcesComponent', () => {
  let component: ProjectResourcesComponent;
  let fixture: ComponentFixture<ProjectResourcesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectResourcesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectResourcesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
