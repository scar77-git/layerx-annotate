import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewVersionConfirmationComponent } from './new-version-confirmation.component';

describe('NewVersionConfirmationComponent', () => {
  let component: NewVersionConfirmationComponent;
  let fixture: ComponentFixture<NewVersionConfirmationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewVersionConfirmationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewVersionConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
