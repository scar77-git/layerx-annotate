import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetDownloadModalComponent } from './dataset-download-modal.component';

describe('DatasetDownloadModalComponent', () => {
  let component: DatasetDownloadModalComponent;
  let fixture: ComponentFixture<DatasetDownloadModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DatasetDownloadModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatasetDownloadModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
