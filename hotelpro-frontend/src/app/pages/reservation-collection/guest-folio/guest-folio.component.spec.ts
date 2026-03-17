import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuestFolioComponent } from './guest-folio.component';

describe('GuestFolioComponent', () => {
  let component: GuestFolioComponent;
  let fixture: ComponentFixture<GuestFolioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuestFolioComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GuestFolioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
