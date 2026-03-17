import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FrontdeskDashboardComponent } from './frontdesk-dashboard.component';

describe('FrontdeskDashboardComponent', () => {
  let component: FrontdeskDashboardComponent;
  let fixture: ComponentFixture<FrontdeskDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FrontdeskDashboardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FrontdeskDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
