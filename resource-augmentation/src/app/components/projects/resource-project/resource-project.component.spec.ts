import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResourceProjectComponent } from './resource-project.component';

describe('ResourceProjectComponent', () => {
  let component: ResourceProjectComponent;
  let fixture: ComponentFixture<ResourceProjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourceProjectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResourceProjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
