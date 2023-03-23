import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommentPropertyComponent } from './comment-property.component';

describe('CommentPropertyComponent', () => {
  let component: CommentPropertyComponent;
  let fixture: ComponentFixture<CommentPropertyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CommentPropertyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CommentPropertyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
