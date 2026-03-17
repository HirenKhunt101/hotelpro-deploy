import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TapeChartComponent } from './tape-chart.component';

describe('TapeChartComponent', () => {
  let component: TapeChartComponent;
  let fixture: ComponentFixture<TapeChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TapeChartComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TapeChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
