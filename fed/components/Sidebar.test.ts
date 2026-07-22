import { describe, expect, it, vi } from 'vitest';
import { runSidebarAction } from './Sidebar';

describe('runSidebarAction', () => {
  it('closes the mobile navigation before running its action', () => {
    const calls: string[] = [];

    runSidebarAction(
      vi.fn(() => calls.push('action')),
      vi.fn(() => calls.push('close')),
    );

    expect(calls).toEqual(['close', 'action']);
  });

  it('runs the action when no close callback is provided', () => {
    const action = vi.fn();

    runSidebarAction(action);

    expect(action).toHaveBeenCalledOnce();
  });
});
