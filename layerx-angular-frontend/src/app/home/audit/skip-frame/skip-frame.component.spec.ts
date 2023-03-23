import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkipFrameComponent } from './skip-frame.component';

describe('SkipFrameComponent', () => {
  let component: SkipFrameComponent;
  let fixture: ComponentFixture<SkipFrameComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SkipFrameComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SkipFrameComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
