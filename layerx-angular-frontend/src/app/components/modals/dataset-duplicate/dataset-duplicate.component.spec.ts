import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetDuplicateComponent } from './dataset-duplicate.component';

describe('DatasetDuplicateComponent', () => {
  let component: DatasetDuplicateComponent;
  let fixture: ComponentFixture<DatasetDuplicateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DatasetDuplicateComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatasetDuplicateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
