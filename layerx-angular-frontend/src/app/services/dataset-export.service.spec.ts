import { TestBed } from '@angular/core/testing';

import { DatasetExportService } from './dataset-export.service';

describe('DatasetExportService', () => {
  let service: DatasetExportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DatasetExportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
