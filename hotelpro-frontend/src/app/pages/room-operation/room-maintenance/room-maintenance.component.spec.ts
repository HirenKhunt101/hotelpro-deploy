import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomMaintenanceComponent } from './room-maintenance.component';

describe('RoomMaintenanceComponent', () => {
  let component: RoomMaintenanceComponent;
  let fixture: ComponentFixture<RoomMaintenanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomMaintenanceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RoomMaintenanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
