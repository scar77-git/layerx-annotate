import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissingFramesComponent } from './missing-frames.component';

describe('MissingFramesComponent', () => {
  let component: MissingFramesComponent;
  let fixture: ComponentFixture<MissingFramesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MissingFramesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MissingFramesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
