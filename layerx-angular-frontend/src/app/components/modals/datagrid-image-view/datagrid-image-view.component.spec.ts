import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatagridImageViewComponent } from './datagrid-image-view.component';

describe('DatagridImageViewComponent', () => {
  let component: DatagridImageViewComponent;
  let fixture: ComponentFixture<DatagridImageViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DatagridImageViewComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DatagridImageViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
