import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataSetMenuComponent } from './data-set-menu.component';

describe('DataSetMenuComponent', () => {
  let component: DataSetMenuComponent;
  let fixture: ComponentFixture<DataSetMenuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataSetMenuComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DataSetMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
