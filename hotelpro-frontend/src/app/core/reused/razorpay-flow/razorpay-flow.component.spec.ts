import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RazorpayFlowComponent } from './razorpay-flow.component';

describe('RazorpayFlowComponent', () => {
  let component: RazorpayFlowComponent;
  let fixture: ComponentFixture<RazorpayFlowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RazorpayFlowComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RazorpayFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
