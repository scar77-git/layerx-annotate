import { TestBed } from '@angular/core/testing';

import { AddLabelService } from './add-label.service';

describe('AddLabelService', () => {
  let service: AddLabelService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AddLabelService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
