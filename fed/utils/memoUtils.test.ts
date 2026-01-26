import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { filterByCategory, searchMemos } from './memoUtils';
import { Memo, MEMO_CATEGORIES, MemoCategory } from '../types';

/**
 * Arbitrary generator for Memo objects
 * Creates random memo data for property-based testing
 */
const memoArbitrary: fc.Arbitrary<Memo> = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  category: fc.constantFrom(...MEMO_CATEGORIES),
  isPinned: fc.boolean(),
  createdAt: fc.integer({ min: 0, max: Date.now() }),
  updatedAt: fc.integer({ min: 0, max: Date.now() }),
});

describe('memoUtils - Property Based Tests', () => {
  /**
   * Feature: memo-feature, Property 7: Category filter returns only matching memos
   * 
   * For any memo list and selected category, filtering by that category should 
   * return only memos whose category field matches the selected category.
   * 
   * **Validates: Requirements 5.2**
   */
  describe('Property 7: Category filter returns only matching memos', () => {
    it('should return only memos matching the selected category', () => {
      fc.assert(
        fc.property(
          fc.array(memoArbitrary),
          fc.constantFrom(...MEMO_CATEGORIES),
          (memos: Memo[], category: MemoCategory) => {
            const filtered = filterByCategory(memos, category);
            
            // All filtered memos must have the matching category
            return filtered.every(m => m.category === category);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not include any memos with different categories', () => {
      fc.assert(
        fc.property(
          fc.array(memoArbitrary, { minLength: 1 }),
          fc.constantFrom(...MEMO_CATEGORIES),
          (memos: Memo[], category: MemoCategory) => {
            const filtered = filterByCategory(memos, category);
            
            // No memo in filtered results should have a different category
            return filtered.every(m => m.category === category);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return subset of original memos', () => {
      fc.assert(
        fc.property(
          fc.array(memoArbitrary),
          fc.constantFrom(...MEMO_CATEGORIES),
          (memos: Memo[], category: MemoCategory) => {
            const filtered = filterByCategory(memos, category);
            
            // Filtered count should be <= original count
            return filtered.length <= memos.length;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return all memos of matching category', () => {
      fc.assert(
        fc.property(
          fc.array(memoArbitrary),
          fc.constantFrom(...MEMO_CATEGORIES),
          (memos: Memo[], category: MemoCategory) => {
            const filtered = filterByCategory(memos, category);
            const expectedCount = memos.filter(m => m.category === category).length;
            
            // Filtered count should equal the count of memos with matching category
            return filtered.length === expectedCount;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve memo data integrity after filtering', () => {
      fc.assert(
        fc.property(
          fc.array(memoArbitrary),
          fc.constantFrom(...MEMO_CATEGORIES),
          (memos: Memo[], category: MemoCategory) => {
            const filtered = filterByCategory(memos, category);
            
            // Each filtered memo should exist in original array with same data
            return filtered.every(filteredMemo => 
              memos.some(originalMemo => 
                originalMemo.id === filteredMemo.id &&
                originalMemo.title === filteredMemo.title &&
                originalMemo.content === filteredMemo.content &&
                originalMemo.category === filteredMemo.category
              )
            );
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Feature: memo-feature, Property 8: Search results contain search term
   * 
   * For any memo list and non-empty search term, all memos in the search results 
   * should contain the search term in either their title or content field (case-insensitive).
   * 
   * **Validates: Requirements 5.3**
   */
  describe('Property 8: Search results contain search term', () => {
    it('should return only memos containing the search term in title or content (case-insensitive)', () => {
      fc.assert(
        fc.property(
          fc.array(memoArbitrary),
          fc.string({ minLength: 1, maxLength: 20 }),
          (memos: Memo[], searchTerm: string) => {
            // Skip whitespace-only search terms as they return all memos
            if (!searchTerm.trim()) {
              return true;
            }
            
            const results = searchMemos(memos, searchTerm);
            const lowerSearchTerm = searchTerm.toLowerCase();
            
            // All search results must contain the search term in title or content
            return results.every(memo => 
              memo.title.toLowerCase().includes(lowerSearchTerm) ||
              memo.content.toLowerCase().includes(lowerSearchTerm)
            );
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should be case-insensitive when matching search term', () => {
      fc.assert(
        fc.property(
          fc.array(memoArbitrary, { minLength: 1 }),
          fc.string({ minLength: 1, maxLength: 10 }),
          (memos: Memo[], searchTerm: string) => {
            if (!searchTerm.trim()) {
              return true;
            }
            
            // Search with different cases should return same results
            const lowerResults = searchMemos(memos, searchTerm.toLowerCase());
            const upperResults = searchMemos(memos, searchTerm.toUpperCase());
            const mixedResults = searchMemos(memos, searchTerm);
            
            // All variations should return the same number of results
            return lowerResults.length === upperResults.length && 
                   upperResults.length === mixedResults.length;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return subset of original memos', () => {
      fc.assert(
        fc.property(
          fc.array(memoArbitrary),
          fc.string({ minLength: 1, maxLength: 20 }),
          (memos: Memo[], searchTerm: string) => {
            const results = searchMemos(memos, searchTerm);
            
            // Search results count should be <= original count
            return results.length <= memos.length;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return all memos when search term is empty or whitespace', () => {
      fc.assert(
        fc.property(
          fc.array(memoArbitrary),
          fc.constantFrom('', ' ', '  ', '\t', '\n'),
          (memos: Memo[], emptySearchTerm: string) => {
            const results = searchMemos(memos, emptySearchTerm);
            
            // Empty search should return all memos
            return results.length === memos.length;
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve memo data integrity after searching', () => {
      fc.assert(
        fc.property(
          fc.array(memoArbitrary),
          fc.string({ minLength: 1, maxLength: 20 }),
          (memos: Memo[], searchTerm: string) => {
            const results = searchMemos(memos, searchTerm);
            
            // Each result memo should exist in original array with same data
            return results.every(resultMemo => 
              memos.some(originalMemo => 
                originalMemo.id === resultMemo.id &&
                originalMemo.title === resultMemo.title &&
                originalMemo.content === resultMemo.content &&
                originalMemo.category === resultMemo.category
              )
            );
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
