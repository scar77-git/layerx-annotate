import { TestBed } from '@angular/core/testing';

import { DatasetDataService } from './dataset-data.service';

describe('DatasetDataService', () => {
  let service: DatasetDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatasetDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
