import { TestBed } from '@angular/core/testing';

import { NotificationSharedService } from './notification-shared.service';

describe('NotificationSharedService', () => {
  let service: NotificationSharedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationSharedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
