import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetAugmentationComponent } from './dataset-augmentation.component';

describe('AugmentationComponent', () => {
  let component: DatasetAugmentationComponent;
  let fixture: ComponentFixture<DatasetAugmentationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DatasetAugmentationComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatasetAugmentationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
