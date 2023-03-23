import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubLabelComponent } from './sub-label.component';

describe('SubLabelComponent', () => {
  let component: SubLabelComponent;
  let fixture: ComponentFixture<SubLabelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SubLabelComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SubLabelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
