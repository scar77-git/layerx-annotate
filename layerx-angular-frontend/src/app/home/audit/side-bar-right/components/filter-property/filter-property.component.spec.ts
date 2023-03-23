import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FilterPropertyComponent } from './filter-property.component';

describe('FilterPropertyComponent', () => {
  let component: FilterPropertyComponent;
  let fixture: ComponentFixture<FilterPropertyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FilterPropertyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FilterPropertyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
