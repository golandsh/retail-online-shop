import React, { useState } from 'react';
import type { Category } from '../types';
import './VerticalTabs.scss';

interface VerticalTabsProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export const VerticalTabs: React.FC<VerticalTabsProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const parents = categories.filter((c) => !c.parentID);
  
  // Keep track of which parent categories are expanded
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({
    dairy: true,
    bakery: true,
    produce: true,
    meat: true,
  });

  const toggleExpand = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParents((prev) => ({
      ...prev,
      [parentId]: !prev[parentId],
    }));
  };

  const getSubcategories = (parentId: string) => {
    return categories.filter((c) => c.parentID === parentId);
  };

  return (
    <aside className="vertical-tabs-container">
      <div className="tabs-header">
        <h3>מחלקות</h3>
      </div>
      <nav className="tabs-nav">
        {parents.map((parent) => {
          const subs = getSubcategories(parent.categoryId);
          const hasSubs = subs.length > 0;
          const isSelected = selectedCategoryId === parent.categoryId;
          const isExpanded = !!expandedParents[parent.categoryId];

          return (
            <div key={parent.categoryId} className="category-group">
              <button
                type="button"
                className={`category-tab parent-tab ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectCategory(parent.categoryId)}
              >
                <span className="category-desc">{parent.categoryDesc}</span>
                {hasSubs && (
                  <span
                    className={`expand-chevron ${isExpanded ? 'rotated' : ''}`}
                    onClick={(e) => toggleExpand(parent.categoryId, e)}
                  >
                    ▼
                  </span>
                )}
              </button>

              {hasSubs && isExpanded && (
                <div className="subcategory-list">
                  {subs.map((sub) => {
                    const isSubSelected = selectedCategoryId === sub.categoryId;
                    return (
                      <button
                        key={sub.categoryId}
                        type="button"
                        className={`category-tab sub-tab ${isSubSelected ? 'active' : ''}`}
                        onClick={() => onSelectCategory(sub.categoryId)}
                      >
                        <span className="sub-bullet">└</span>
                        <span className="category-desc">{sub.categoryDesc}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
