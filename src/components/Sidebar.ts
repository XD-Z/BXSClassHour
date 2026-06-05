interface NavItem {
  id: string;
  label: string;
  icon: string;
}

export function Sidebar(activeTab: string) {
  const navItems: NavItem[] = [
    { id: 'home', label: '首页统计', icon: '🏠' },
    { id: 'students', label: '学员管理', icon: '👥' },
    { id: 'records', label: '课时记录', icon: '📝' },
    { id: 'expiring', label: '即将到期', icon: '⏰' },
  ];

  return `
    <aside class="w-64 bg-white shadow-md h-full flex flex-col">
      <div class="p-4 border-b">
        <div class="flex items-center gap-2">
          <span class="text-2xl">📚</span>
          <span class="font-semibold text-gray-800">课时记录系统</span>
        </div>
      </div>
      <nav class="flex-1 p-2">
        ${navItems.map(item => `
          <button
            data-tab="${item.id}"
            class="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
              activeTab === item.id
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }"
          >
            <span class="text-xl">${item.icon}</span>
            <span>${item.label}</span>
          </button>
        `).join('')}
      </nav>
    </aside>
  `;
}
