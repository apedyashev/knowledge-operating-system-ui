import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { SearchField } from './search-field.component';

describe('SearchField', () => {
  let component: SearchField;
  let fixture: ComponentFixture<SearchField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchField],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchField);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
