import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomTypeRangeSetupComponent } from './room-type-range-setup.component';

describe('RoomTypeRangeSetupComponent', () => {
  let component: RoomTypeRangeSetupComponent;
  let fixture: ComponentFixture<RoomTypeRangeSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomTypeRangeSetupComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RoomTypeRangeSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
