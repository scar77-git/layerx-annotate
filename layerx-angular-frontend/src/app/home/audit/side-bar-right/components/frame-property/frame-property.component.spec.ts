import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FramePropertyComponent } from './frame-property.component';

describe('FramePropertyComponent', () => {
  let component: FramePropertyComponent;
  let fixture: ComponentFixture<FramePropertyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FramePropertyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FramePropertyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
