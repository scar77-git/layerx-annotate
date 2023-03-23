import { TestBed } from '@angular/core/testing';

import { DatasetSplitService } from './dataset-split.service';

describe('DatasetSplitService', () => {
  let service: DatasetSplitService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatasetSplitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
