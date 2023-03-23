import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DDataGridComponent } from './d-data-grid.component';

describe('DDataGridComponent', () => {
  let component: DDataGridComponent;
  let fixture: ComponentFixture<DDataGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DDataGridComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DDataGridComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
