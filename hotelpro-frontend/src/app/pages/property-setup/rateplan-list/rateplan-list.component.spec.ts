import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RateplanListComponent } from './rateplan-list.component';

describe('RateplanListComponent', () => {
  let component: RateplanListComponent;
  let fixture: ComponentFixture<RateplanListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RateplanListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RateplanListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
