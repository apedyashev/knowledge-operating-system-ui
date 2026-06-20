import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchOverlay } from './search-overlay';

describe('SearchOverlay', () => {
  let component: SearchOverlay;
  let fixture: ComponentFixture<SearchOverlay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchOverlay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchOverlay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
