import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaxSetComponent } from './tax-set.component';

describe('TaxSetComponent', () => {
  let component: TaxSetComponent;
  let fixture: ComponentFixture<TaxSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaxSetComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TaxSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
