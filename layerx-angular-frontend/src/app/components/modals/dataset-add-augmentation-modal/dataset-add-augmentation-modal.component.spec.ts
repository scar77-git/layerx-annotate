import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetAddAugmentationModalComponent } from './dataset-add-augmentation-modal.component';

describe('DatasetAddAugmentationModalComponent', () => {
  let component: DatasetAddAugmentationModalComponent;
  let fixture: ComponentFixture<DatasetAddAugmentationModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DatasetAddAugmentationModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatasetAddAugmentationModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
