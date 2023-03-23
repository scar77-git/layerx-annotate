import { TestBed } from '@angular/core/testing';

import { DLabelsService } from './d-labels.service';

describe('DLabelsService', () => {
  let service: DLabelsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DLabelsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
