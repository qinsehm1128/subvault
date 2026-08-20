import React from 'react';
import { VaultGroup, groupColor, resolveGroupName } from '../utils/groups';

interface GroupBadgeProps {
  name?: string;
  groups: VaultGroup[];
  className?: string;
}

export const GroupBadge: React.FC<GroupBadgeProps> = ({ name, groups, className = '' }) => {
  const label = resolveGroupName(name);
  const color = groupColor(groups, label);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${className}`}
      style={{ backgroundColor: `${color}22`, color, borderColor: `${color}55` }}
    >
      {label}
    </span>
  );
};
