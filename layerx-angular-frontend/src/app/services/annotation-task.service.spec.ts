import { TestBed } from '@angular/core/testing';

import { AnnotationTaskService } from './annotation-task.service';

describe('AnnotationTaskService', () => {
  let service: AnnotationTaskService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AnnotationTaskService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
