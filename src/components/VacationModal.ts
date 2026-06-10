export function VacationStudentModal(mode: 'add' | 'edit', student?: {
  id: string;
  name: string;
  phone: string;
  totalHours: number;
  giftHours: number;
  startDate: string;
  deadline: string;
  otherFees: number;
  remark: string;
}) {
  const isEdit = mode === 'edit';
  const today = new Date();
  const defaultDeadline = new Date();
  defaultDeadline.setFullYear(defaultDeadline.getFullYear() + 1);
  const todayStr = today.toISOString().split('T')[0];
  const defaultDeadlineStr = defaultDeadline.toISOString().split('T')[0];

  return `
    <div id="vacation-student-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-gray-800">${isEdit ? '编辑寒暑假学员' : '添加寒暑假学员'}</h3>
          <button id="vacation-close-student-modal" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        ${isEdit ? `<input type="hidden" id="vacation-student-id" value="${student?.id || ''}">` : ''}

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
            <input type="text" id="vacation-student-name" required class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${student?.name || ''}">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">电话 *</label>
            <input type="tel" id="vacation-student-phone" required class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${student?.phone || ''}">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">总课时 *</label>
            <input type="number" id="vacation-student-total-hours" required min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${student?.totalHours || ''}">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">赠送课时</label>
            <input type="number" id="vacation-student-gift-hours" min="0" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${student?.giftHours || '0'}">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">开始日期 *</label>
            <input type="date" id="vacation-student-start-date" required class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${student?.startDate || todayStr}">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">截止日期 *</label>
            <input type="date" id="vacation-student-deadline" required class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${student?.deadline || defaultDeadlineStr}">
            <div class="mt-2 flex items-center gap-2 w-full">
              <input type="number" id="vacation-deadline-year" placeholder="年" min="2024" max="2100" class="flex-1 px-4 py-2 border border-gray-300 rounded text-center text-lg" value="${student?.deadline ? student.deadline.split('-')[0] : defaultDeadline.getFullYear()}">
              <span class="text-gray-400 text-lg whitespace-nowrap">年</span>
              <input type="number" id="vacation-deadline-month" placeholder="月" min="1" max="12" class="flex-1 px-4 py-2 border border-gray-300 rounded text-center text-lg" value="${student?.deadline ? student.deadline.split('-')[1] : String(defaultDeadline.getMonth() + 1).padStart(2, '0')}">
              <span class="text-gray-400 text-lg whitespace-nowrap">月</span>
              <input type="number" id="vacation-deadline-day" placeholder="日" min="1" max="31" class="flex-1 px-4 py-2 border border-gray-300 rounded text-center text-lg" value="${student?.deadline ? student.deadline.split('-')[2] : String(defaultDeadline.getDate()).padStart(2, '0')}">
              <span class="text-gray-400 text-lg whitespace-nowrap">日</span>
              <button id="vacation-apply-deadline-btn" class="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm whitespace-nowrap">应用</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">课时费用</label>
            <input type="number" id="vacation-student-other-fees" min="0" step="0.01" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${student?.otherFees || '0'}">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">备注（科目等）</label>
            <textarea id="vacation-student-remark" class="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="3" placeholder="例如：数学、英语（可填写多科目）">${student?.remark || ''}</textarea>
          </div>
        </div>

        <div class="mt-6 flex gap-3">
          <button id="vacation-cancel-student-btn" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
          <button id="vacation-save-student-btn" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">保存</button>
        </div>
      </div>
    </div>
  `;
}

export function VacationRecordModal(students: { id: string; name: string }[]) {
  const today = new Date().toISOString().split('T')[0];

  return `
    <div id="vacation-record-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold text-gray-800">添加寒暑课时记录</h3>
          <button id="vacation-close-record-modal" class="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">选择学员 *</label>
            <select id="vacation-record-student" required class="w-full px-3 py-3 border border-gray-300 rounded-lg">
              <option value="">请选择学员</option>
              ${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">上课日期 *</label>
            <input type="date" id="vacation-record-date" required class="w-full px-3 py-3 border border-gray-300 rounded-lg" value="${today}">
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">课时数 *</label>
            <div class="flex items-center gap-2">
              <button type="button" id="vacation-record-hours-decrease" class="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-lg text-2xl font-bold text-gray-700 transition-colors">-</button>
              <input type="number" id="vacation-record-hours" required min="1" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-xl font-semibold" value="2">
              <button type="button" id="vacation-record-hours-increase" class="w-12 h-12 bg-gray-200 hover:bg-gray-300 rounded-lg text-2xl font-bold text-gray-700 transition-colors">+</button>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">备注</label>
            <textarea id="vacation-record-description" class="w-full px-3 py-2 border border-gray-300 rounded-lg" rows="2"></textarea>
          </div>
        </div>

        <div class="mt-6 flex gap-3">
          <button id="vacation-cancel-record-btn" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
          <button id="vacation-save-record-btn" class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">保存</button>
        </div>
      </div>
    </div>
  `;
}

export function VacationConfirmModal(message: string, confirmText: string = '确定') {
  return `
    <div id="vacation-confirm-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div class="text-center mb-6">
          <div class="text-4xl mb-4">⚠️</div>
          <p class="text-gray-800">${message}</p>
        </div>
        <div class="flex gap-3">
          <button id="vacation-cancel-confirm-btn" class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">取消</button>
          <button id="vacation-confirm-btn" class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">${confirmText}</button>
        </div>
      </div>
    </div>
  `;
}
