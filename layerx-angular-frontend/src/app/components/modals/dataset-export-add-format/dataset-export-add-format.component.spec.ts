import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatasetExportAddFormatComponent } from './dataset-export-add-format.component';

describe('DatasetExportAddFormatComponent', () => {
  let component: DatasetExportAddFormatComponent;
  let fixture: ComponentFixture<DatasetExportAddFormatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DatasetExportAddFormatComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatasetExportAddFormatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
