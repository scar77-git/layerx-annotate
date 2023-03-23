import { TestBed } from '@angular/core/testing';

import { DOverviewService } from './d-overview.service';

describe('DOverviewService', () => {
  let service: DOverviewService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DOverviewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
