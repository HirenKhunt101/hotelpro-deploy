import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomsReviewComponent } from './rooms-review.component';

describe('RoomsReviewComponent', () => {
  let component: RoomsReviewComponent;
  let fixture: ComponentFixture<RoomsReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomsReviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RoomsReviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
