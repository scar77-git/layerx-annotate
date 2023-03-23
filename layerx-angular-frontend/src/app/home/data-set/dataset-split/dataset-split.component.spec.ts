import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetSplitComponent } from './dataset-split.component';

describe('SplitComponent', () => {
  let component: DatasetSplitComponent;
  let fixture: ComponentFixture<DatasetSplitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DatasetSplitComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatasetSplitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
