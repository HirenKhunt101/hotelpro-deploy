import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdatePropertyComponent } from './add-update-property.component';

describe('AddUpdatePropertyComponent', () => {
  let component: AddUpdatePropertyComponent;
  let fixture: ComponentFixture<AddUpdatePropertyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddUpdatePropertyComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AddUpdatePropertyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
