import { Memo } from '../types';

/**
 * Filter memos by category
 * @param memos - Array of memos to filter
 * @param category - Category to filter by
 * @returns Filtered array of memos matching the category
 * 
 * Validates: Requirements 5.2
 */
export const filterByCategory = (memos: Memo[], category: string): Memo[] => {
  return memos.filter(memo => memo.category === category);
};

/**
 * Search memos by search term (case-insensitive, matches title or content)
 * @param memos - Array of memos to search
 * @param searchTerm - Search term to match against title or content
 * @returns Filtered array of memos containing the search term
 * 
 * Validates: Requirements 5.3
 */
export const searchMemos = (memos: Memo[], searchTerm: string): Memo[] => {
  if (!searchTerm.trim()) {
    return memos;
  }
  
  const lowerSearchTerm = searchTerm.toLowerCase();
  return memos.filter(memo => 
    memo.title.toLowerCase().includes(lowerSearchTerm) ||
    memo.content.toLowerCase().includes(lowerSearchTerm)
  );
};

/**
 * Validate memo data
 * @param memo - Partial memo data to validate
 * @returns Error message string if validation fails, null if valid
 * 
 * Validates: Requirements 1.3
 */
export const validateMemo = (memo: Partial<Memo>): string | null => {
  if (!memo.title?.trim()) return '标题不能为空';
  if (!memo.content?.trim()) return '内容不能为空';
  if (memo.title.length > 100) return '标题不能超过100个字符';
  if (memo.content.length > 10000) return '内容不能超过10000个字符';
  return null;
};

/**
 * Copy text to clipboard using navigator.clipboard API
 * @param text - Text to copy to clipboard
 * @returns Promise that resolves to true on success, false on failure
 * 
 * Validates: Requirements 4.1
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
