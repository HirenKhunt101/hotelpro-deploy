import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateReservationPaymentComponent } from './create-reservation-payment.component';

describe('CreateReservationPaymentComponent', () => {
  let component: CreateReservationPaymentComponent;
  let fixture: ComponentFixture<CreateReservationPaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateReservationPaymentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateReservationPaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
