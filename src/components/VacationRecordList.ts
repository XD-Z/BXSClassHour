import type { ClassRecord, Student } from '../types';

export function VacationRecordList(records: ClassRecord[], students: Student[]) {
  const studentMap = new Map(students.map(s => [s.id, s]));

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const sortedRecords = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return `
    <div class="p-6">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h2 class="text-xl font-bold text-gray-800">寒暑课时记录</h2>
          <p class="text-sm text-gray-500 mt-1">独立记录，不计入主系统</p>
        </div>
        <button id="vacation-add-record-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + 添加记录
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-md overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">学员</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">课时数</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">上课日期</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">备注</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            ${sortedRecords.length === 0 ? `
              <tr>
                <td colspan="5" class="px-4 py-8 text-center text-gray-500">暂无寒暑课时记录</td>
              </tr>
            ` : sortedRecords.map(record => {
              const student = studentMap.get(record.studentId);
              return `
                <tr class="border-t hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3">${student?.name || '未知学员'}</td>
                  <td class="px-4 py-3">${record.hours}</td>
                  <td class="px-4 py-3">${formatDate(record.date)}</td>
                  <td class="px-4 py-3">${record.description || '-'}</td>
                  <td class="px-4 py-3">
                    <button class="vacation-delete-record-btn text-red-600 hover:text-red-800" data-id="${record.id}" data-student-id="${record.studentId}" data-hours="${record.hours}">删除</button>
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
