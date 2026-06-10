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
    const remainA = a.totalHours + a.giftHours - a.usedHours;
    const remainB = b.totalHours + b.giftHours - b.usedHours;
    if (remainA <= 10 && remainB > 10) return -1;
    if (remainA > 10 && remainB <= 10) return 1;
    return diffA - diffB;
  });

  return `
    <div class="p-6">
      <h2 class="text-xl font-bold text-gray-800 mb-6">需要关注的学员</h2>
      <p class="text-sm text-gray-500 mb-4">展示日期即将到期或剩余课时不足 10 节的学员</p>

      <div class="grid gap-4">
        ${sortedStudents.length === 0 ? `
          <div class="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <span class="text-4xl block mb-2">✅</span>
            <span class="text-green-700 font-semibold">暂无需要关注的学员</span>
          </div>
        ` : sortedStudents.map(student => {
          const daysLeft = getDaysLeft(student.deadline);
          const remainingHours = student.totalHours + student.giftHours - student.usedHours;
          const isNearDeadline = daysLeft <= 30 && daysLeft > 0;
          const isLowHours = remainingHours <= 10;

          let tags: string[] = [];
          if (isNearDeadline && daysLeft <= 7) tags.push('<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">日期紧急</span>');
          else if (isNearDeadline && daysLeft <= 14) tags.push('<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">日期临近</span>');
          else if (isNearDeadline) tags.push('<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">日期将至</span>');
          if (isLowHours) tags.push('<span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">课时不足</span>');

          let urgencyClass = '';
          if ((isNearDeadline && daysLeft <= 7) || (isLowHours && remainingHours <= 5)) urgencyClass = 'border-red-400 bg-red-50';
          else if ((isNearDeadline && daysLeft <= 14) || (isLowHours && remainingHours <= 10)) urgencyClass = 'border-amber-400 bg-amber-50';
          else urgencyClass = 'border-yellow-400 bg-yellow-50';

          return `
            <div class="border rounded-xl p-4 ${urgencyClass}">
              <div class="flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-semibold text-gray-800">${student.name}</h3>
                    <div class="flex gap-1">${tags.join('')}</div>
                  </div>
                  <p class="text-sm text-gray-600">电话: ${student.phone}</p>
                </div>
                <div class="text-right">
                  <div class="text-2xl font-bold ${daysLeft <= 7 ? 'text-red-600' : 'text-gray-800'}">
                    ${daysLeft <= 0 ? '已过期' : daysLeft + ' 天'}
                  </div>
                  <div class="text-sm text-gray-600">截止日期: ${formatDate(student.deadline)}</div>
                </div>
              </div>
              <div class="mt-4 flex gap-6 text-sm">
                <div>
                  <span class="text-gray-600">剩余课时: </span>
                  <span class="font-semibold ${remainingHours <= 10 ? 'text-red-600' : 'text-gray-800'}">${remainingHours}</span>
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
                  <span class="font-semibold text-green-600">${student.usedHours}</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}
