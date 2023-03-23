import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLabelModalComponent } from './add-label-modal.component';

describe('AddLabelModalComponent', () => {
  let component: AddLabelModalComponent;
  let fixture: ComponentFixture<AddLabelModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddLabelModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AddLabelModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
