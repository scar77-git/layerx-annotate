import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetLabelsComponent } from './dataset-labels.component';

describe('DLabelsComponent', () => {
  let component: DatasetLabelsComponent;
  let fixture: ComponentFixture<DatasetLabelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DatasetLabelsComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatasetLabelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
