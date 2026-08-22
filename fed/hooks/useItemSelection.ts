import { useMemo, useState } from 'react';

export function useItemSelection(visibleIds: string[]) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedIds = useMemo(
    () => visibleIds.filter(id => selected.has(id)),
    [visibleIds, selected]
  );

  const toggle = (id: string) => {
    setSelectMode(true);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectMode(true);
    setSelected(new Set(visibleIds));
  };

  const clear = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const isSelected = (id: string) => selected.has(id);

  return { selectMode, selectedIds, toggle, selectAll, clear, isSelected, setSelectMode };
}
