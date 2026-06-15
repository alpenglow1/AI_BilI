// 由于 categories 表无 icon 字段（按 Jerry 决策），前端按分类名映射 emoji + 主题色。
// 与 docs/prototypes/editModal.html 对齐。

export interface CategoryVisual {
  emoji: string;
  bgClass: string;       // 未选中底色（NativeWind className）
  textClass: string;     // 未选中文字/emoji 色
  selectedBgClass: string;
  selectedTextClass: string;
}

const FALLBACK: CategoryVisual = {
  emoji: '·',
  bgClass: 'bg-slate-100',
  textClass: 'text-slate-500',
  selectedBgClass: 'bg-slate-200',
  selectedTextClass: 'text-slate-700',
};

const MAP: Record<string, CategoryVisual> = {
  // 支出
  '餐饮':   { emoji: '🍔', bgClass: 'bg-orange-50',   textClass: 'text-orange-500',   selectedBgClass: 'bg-orange-100',  selectedTextClass: 'text-orange-600',  },
  '交通':   { emoji: '🚗', bgClass: 'bg-blue-50',     textClass: 'text-blue-500',     selectedBgClass: 'bg-blue-100',    selectedTextClass: 'text-blue-600',    },
  '购物':   { emoji: '🛒', bgClass: 'bg-purple-50',   textClass: 'text-purple-500',   selectedBgClass: 'bg-purple-100',  selectedTextClass: 'text-purple-600',  },
  '居住':   { emoji: '🏠', bgClass: 'bg-amber-50',    textClass: 'text-amber-500',    selectedBgClass: 'bg-amber-100',   selectedTextClass: 'text-amber-600',   },
  '娱乐':   { emoji: '🎮', bgClass: 'bg-pink-50',     textClass: 'text-pink-500',     selectedBgClass: 'bg-pink-100',    selectedTextClass: 'text-pink-600',    },
  '医疗':   { emoji: '🏥', bgClass: 'bg-red-50',      textClass: 'text-red-500',      selectedBgClass: 'bg-red-100',     selectedTextClass: 'text-red-600',     },
  '人情':   { emoji: '🎁', bgClass: 'bg-rose-50',     textClass: 'text-rose-500',     selectedBgClass: 'bg-rose-100',    selectedTextClass: 'text-rose-600',    },
  '零食':   { emoji: '🍿', bgClass: 'bg-yellow-50',   textClass: 'text-yellow-600',   selectedBgClass: 'bg-yellow-100',  selectedTextClass: 'text-yellow-700',  },
  '宠物':   { emoji: '🐶', bgClass: 'bg-lime-50',     textClass: 'text-lime-600',     selectedBgClass: 'bg-lime-100',    selectedTextClass: 'text-lime-700',    },
  '其他支出': { emoji: '···', bgClass: 'bg-slate-100', textClass: 'text-slate-400',   selectedBgClass: 'bg-slate-200',   selectedTextClass: 'text-slate-600',   },

  // 收入
  '工资':   { emoji: '💰', bgClass: 'bg-emerald-50',  textClass: 'text-emerald-500',  selectedBgClass: 'bg-emerald-100', selectedTextClass: 'text-emerald-600', },
  '理财':   { emoji: '📈', bgClass: 'bg-teal-50',     textClass: 'text-teal-500',     selectedBgClass: 'bg-teal-100',    selectedTextClass: 'text-teal-600',    },
  '红包':   { emoji: '🧧', bgClass: 'bg-red-50',      textClass: 'text-red-500',      selectedBgClass: 'bg-red-100',     selectedTextClass: 'text-red-600',     },
  '借入':   { emoji: '💵', bgClass: 'bg-cyan-50',     textClass: 'text-cyan-500',     selectedBgClass: 'bg-cyan-100',    selectedTextClass: 'text-cyan-600',    },
  '兼职':   { emoji: '💼', bgClass: 'bg-indigo-50',   textClass: 'text-indigo-500',   selectedBgClass: 'bg-indigo-100',  selectedTextClass: 'text-indigo-600',  },
  '其他收入': { emoji: '···', bgClass: 'bg-slate-100', textClass: 'text-slate-400',   selectedBgClass: 'bg-slate-200',   selectedTextClass: 'text-slate-600',   },
};

export function getCategoryVisual(name: string): CategoryVisual {
  return MAP[name] ?? FALLBACK;
}
