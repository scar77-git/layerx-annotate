import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetRebalanceComponent } from './dataset-rebalance.component';

describe('DatasetRebalanceComponent', () => {
  let component: DatasetRebalanceComponent;
  let fixture: ComponentFixture<DatasetRebalanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DatasetRebalanceComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatasetRebalanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
