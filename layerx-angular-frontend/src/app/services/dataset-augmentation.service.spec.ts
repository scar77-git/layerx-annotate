import { TestBed } from '@angular/core/testing';

import { DatasetAugmentationService } from './dataset-augmentation.service';

describe('DatasetAugmentationService', () => {
  let service: DatasetAugmentationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatasetAugmentationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
