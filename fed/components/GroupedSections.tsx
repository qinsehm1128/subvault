import React from 'react';
import { VaultGroup, groupItems } from '../utils/groups';

interface GroupedSectionsProps<T extends { category?: string }> {
  items: T[];
  groups: VaultGroup[];
  renderItem: (item: T) => React.ReactNode;
  gridClassName?: string;
  onHeaderClick?: (name: string) => void;
}

export function GroupedSections<T extends { id?: string; category?: string }>({
  items,
  groups,
  renderItem,
  gridClassName = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  onHeaderClick,
}: GroupedSectionsProps<T>) {
  const sections = groupItems(items, groups);

  return (
    <div className="space-y-6">
      {sections.map(section => (
        <section key={section.name} className="space-y-3">
          <button
            type="button"
            onClick={() => onHeaderClick?.(section.name)}
            className="sticky top-0 z-10 flex items-center gap-2 w-full text-left px-1 py-1.5 bg-slate-50/95 backdrop-blur-sm"
          >
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: section.color }} />
            <span className="text-sm font-semibold text-slate-800">{section.name}</span>
            <span className="text-xs text-slate-400">{section.items.length}</span>
          </button>
          <div className={gridClassName}>
            {section.items.map((item, index) => (
              <React.Fragment key={item.id || `${section.name}-${index}`}>
                {renderItem(item)}
              </React.Fragment>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
