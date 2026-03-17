import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YieldManagementComponent } from './yield-management.component';

describe('YieldManagementComponent', () => {
  let component: YieldManagementComponent;
  let fixture: ComponentFixture<YieldManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YieldManagementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(YieldManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
