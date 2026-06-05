import type { Student } from '../types';

export function ExpiringList(students: Student[]) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const getDaysLeft = (deadline: string) => {
    const now = new Date();
    const expireDate = new Date(deadline);
    return Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const sortedStudents = [...students].sort((a, b) => {
    const diffA = getDaysLeft(a.deadline);
    const diffB = getDaysLeft(b.deadline);
    return diffA - diffB;
  });

  return `
    <div class="p-6">
      <h2 class="text-xl font-bold text-gray-800 mb-6">即将到期学员</h2>

      <div class="grid gap-4">
        ${sortedStudents.length === 0 ? `
          <div class="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <span class="text-4xl block mb-2">✅</span>
            <span class="text-green-700 font-semibold">暂无即将到期的学员</span>
          </div>
        ` : sortedStudents.map(student => {
          const daysLeft = getDaysLeft(student.deadline);
          const remainingHours = student.totalHours + student.giftHours - student.usedHours;
          
          let urgencyClass = '';
          if (daysLeft <= 7) urgencyClass = 'border-red-400 bg-red-50';
          else if (daysLeft <= 14) urgencyClass = 'border-amber-400 bg-amber-50';
          else urgencyClass = 'border-yellow-400 bg-yellow-50';

          return `
            <div class="border rounded-xl p-4 ${urgencyClass}">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-gray-800">${student.name}</h3>
                  <p class="text-sm text-gray-600">电话: ${student.phone}</p>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold ${daysLeft <= 7 ? 'text-red-600' : 'text-gray-800'}">
                    ${daysLeft} 天
                  </div>
                  <div class="text-sm text-gray-600">截止日期: ${formatDate(student.deadline)}</div>
                </div>
              </div>
              <div class="mt-4 flex gap-6 text-sm">
                <div>
                  <span class="text-gray-600">剩余课时: </span>
                  <span class="font-semibold ${remainingHours <= 5 ? 'text-red-600' : 'text-gray-800'}">${remainingHours}</span>
                </div>
                <div>
                  <span class="text-gray-600">总课时: </span>
                  <span class="font-semibold">${student.totalHours}</span>
                </div>
                <div>
                  <span class="text-gray-600">赠送课时: </span>
                  <span class="font-semibold">${student.giftHours}</span>
                </div>
                <div>
                  <span class="text-gray-600">已用课时: </span>
                  <span class="font-semibold">${student.usedHours}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
