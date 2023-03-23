import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetSplitRebalanceComponent } from './dataset-split-rebalance.component';

describe('DatasetSplitRebalanceComponent', () => {
  let component: DatasetSplitRebalanceComponent;
  let fixture: ComponentFixture<DatasetSplitRebalanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DatasetSplitRebalanceComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatasetSplitRebalanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
