import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RateplanComponent } from './rateplan.component';

describe('RateplanComponent', () => {
  let component: RateplanComponent;
  let fixture: ComponentFixture<RateplanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RateplanComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RateplanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
