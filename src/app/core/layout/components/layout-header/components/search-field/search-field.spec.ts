import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchField } from './search-field';

describe('SearchField', () => {
  let component: SearchField;
  let fixture: ComponentFixture<SearchField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchField]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchField);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
