import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FutureAvailabilityComponent } from './future-availability.component';

describe('FutureAvailabilityComponent', () => {
  let component: FutureAvailabilityComponent;
  let fixture: ComponentFixture<FutureAvailabilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FutureAvailabilityComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FutureAvailabilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
