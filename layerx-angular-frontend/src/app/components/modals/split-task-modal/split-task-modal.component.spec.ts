import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SplitTaskModalComponent } from './split-task-modal.component';

describe('SplitTaskModalComponent', () => {
  let component: SplitTaskModalComponent;
  let fixture: ComponentFixture<SplitTaskModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SplitTaskModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SplitTaskModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
