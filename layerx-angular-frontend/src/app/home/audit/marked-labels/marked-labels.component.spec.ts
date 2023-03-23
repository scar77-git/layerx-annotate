import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkedLabelsComponent } from './marked-labels.component';

describe('MarkedLabelsComponent', () => {
  let component: MarkedLabelsComponent;
  let fixture: ComponentFixture<MarkedLabelsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MarkedLabelsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MarkedLabelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
