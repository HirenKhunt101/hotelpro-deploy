import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateWalkinComponent } from './create-walkin.component';

describe('CreateWalkinComponent', () => {
  let component: CreateWalkinComponent;
  let fixture: ComponentFixture<CreateWalkinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateWalkinComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateWalkinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
