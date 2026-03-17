import { TestBed } from '@angular/core/testing';

import { PaymentSharedService } from './payment-shared.service';

describe('PaymentSharedService', () => {
  let service: PaymentSharedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentSharedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
