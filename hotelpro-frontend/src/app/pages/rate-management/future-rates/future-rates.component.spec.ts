import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FutureRatesComponent } from './future-rates.component';

describe('FutureRatesComponent', () => {
  let component: FutureRatesComponent;
  let fixture: ComponentFixture<FutureRatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FutureRatesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FutureRatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
