import type { Statistics } from '../types';

export function HomePage(statistics: Statistics) {
  const statCards = [
    { label: '学员总数', value: statistics.totalStudents, icon: '👥', color: 'bg-blue-500' },
    { label: '总课时', value: statistics.totalHours, icon: '⏱️', color: 'bg-green-500' },
    { label: '赠送课时', value: statistics.totalGiftHours, icon: '🎁', color: 'bg-purple-500' },
    { label: '已用课时', value: statistics.totalUsedHours, icon: '📊', color: 'bg-orange-500' },
    { label: '剩余课时', value: statistics.totalRemainingHours, icon: '📈', color: 'bg-cyan-500' },
    { label: '课时费用', value: `¥${statistics.totalOtherFees}`, icon: '💰', color: 'bg-yellow-500' },
  ];

  return `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-bold text-gray-800">数据统计</h2>
        <div class="flex gap-2">
          <button id="export-csv-btn" class="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <span>📊</span>
            <span>导出Excel</span>
          </button>
          <button id="export-txt-btn" class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <span>📄</span>
            <span>导出文档</span>
          </button>
        </div>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        ${statCards.map(card => `
          <div class="${card.color} text-white rounded-xl p-4 shadow-lg">
            <div class="flex items-center justify-between">
              <span class="text-3xl">${card.icon}</span>
            </div>
            <div class="mt-3">
              <div class="text-2xl font-bold">${card.value}</div>
              <div class="text-blue-100 text-sm">${card.label}</div>
            </div>
          </div>
        `).join('')}
      </div>

      ${statistics.expiringStudents > 0 ? `
        <div class="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div class="flex items-center gap-2 text-amber-700">
            <span class="text-xl">⚠️</span>
            <span class="font-semibold">有 ${statistics.expiringStudents} 名学员的课时即将到期，请及时提醒！</span>
          </div>
        </div>
      ` : `
        <div class="bg-green-50 border border-green-200 rounded-xl p-4">
          <div class="flex items-center gap-2 text-green-700">
            <span class="text-xl">✅</span>
            <span class="font-semibold">暂无即将到期的学员</span>
          </div>
        </div>
      `}
    </div>
  `;
}
