import type { Student } from '../types';

export function VacationStudentList(students: Student[]) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const isExpired = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  return `
    <div class="p-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h2 class="text-xl font-bold text-gray-800">寒暑假学员列表</h2>
          <p class="text-sm text-gray-500 mt-1">独立记录，不计入主系统</p>
        </div>
        <button id="vacation-add-student-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + 添加学员
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-2 py-2 text-left text-sm font-semibold text-gray-600 w-6">排序</th>
              <th class="px-2 py-2 text-left text-sm font-semibold text-gray-600">姓名</th>
              <th class="px-2 py-2 text-left text-sm font-semibold text-gray-600">电话</th>
              <th class="px-2 py-2 text-left text-sm font-semibold text-gray-600">科目</th>
              <th class="px-2 py-2 text-left text-sm font-semibold text-gray-600 text-center">总课时</th>
              <th class="px-2 py-2 text-left text-sm font-semibold text-gray-600 text-center">赠送课时</th>
              <th class="px-2 py-2 text-left text-sm font-semibold text-gray-600 text-center">已用课时</th>
              <th class="px-2 py-2 text-left text-sm font-semibold text-gray-600 text-center">剩余课时</th>
              <th class="px-2 py-2 text-left text-sm font-semibold text-gray-600">开始日期</th>
              <th class="px-2 py-2 text-left text-sm font-semibold text-gray-600 text-right">课时费用</th>
              <th class="px-2 py-2 text-left text-sm font-semibold text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody id="vacation-student-table-body">
            ${students.length === 0 ? `
              <tr>
                <td colspan="11" class="px-4 py-8 text-center text-gray-500">暂无寒暑假学员数据</td>
              </tr>
            ` : students.map((student, index) => {
              const remainingHours = student.totalHours + student.giftHours - student.usedHours;
              const expired = isExpired(student.deadline);

              return `
                <tr class="border-t hover:bg-gray-50 transition-colors ${expired ? 'bg-red-50' : ''}" draggable="true" data-index="${index}" data-id="${student.id}">
                  <td class="px-2 py-2 cursor-move select-none">
                    <svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v2a1 1 0 01-1 1H8a1 1 0 01-1-1V4a1 1 0 011-1h2zm0 10a1 1 0 011 1v2a1 1 0 01-1 1H8a1 1 0 01-1-1v-2a1 1 0 011-1h2zm0-5a1 1 0 011 1v2a1 1 0 01-1 1H8a1 1 0 01-1-1v-2a1 1 0 011-1h2z" clip-rule="evenodd"/>
                    </svg>
                  </td>
                  <td class="px-2 py-2">${student.name}</td>
                  <td class="px-2 py-2">${student.phone}</td>
                  <td class="px-2 py-2">${student.remark || '-'}</td>
                  <td class="px-2 py-2 text-center">${student.totalHours}</td>
                  <td class="px-2 py-2 text-center">${student.giftHours}</td>
                  <td class="px-2 py-2 text-center text-green-600 font-semibold">${student.usedHours}</td>
                  <td class="px-2 py-2 text-center">
                    <span class="${remainingHours <= 5 ? 'text-red-600 font-bold' : 'text-gray-800'}">
                      ${remainingHours}
                    </span>
                  </td>
                  <td class="px-2 py-2">${formatDate(student.startDate)}</td>
                  <td class="px-2 py-2 text-right">¥${student.otherFees}</td>
                  <td class="px-2 py-2">
                    <div class="flex gap-1">
                      <button class="vacation-edit-student-btn text-blue-600 hover:text-blue-800 text-sm" data-id="${student.id}">编辑</button>
                      <button class="vacation-record-hours-btn text-green-600 hover:text-green-800 text-sm" data-id="${student.id}">记课时</button>
                      <button class="vacation-delete-student-btn text-red-600 hover:text-red-800 text-sm" data-id="${student.id}">删除</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
