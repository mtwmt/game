import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Guideline } from './guideline';

describe('Guideline', () => {
  let component: Guideline;
  let fixture: ComponentFixture<Guideline>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Guideline]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Guideline);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
