import type { Student, ClassRecord } from '../types';

export function exportToCSV(students: Student[], _records: ClassRecord[]): void {
  // 添加UTF-8 BOM以确保Excel正确识别中文
  let csvContent = '\uFEFF';
  csvContent += '姓名,电话,总课时,赠送课时,已用课时,剩余课时,开始日期,截止日期,课时费用,科目,创建时间\n';
  
  students.forEach(student => {
    const remainingHours = student.totalHours + student.giftHours - student.usedHours;
    // 对包含特殊字符的字段进行转义
    const name = escapeCsvField(student.name);
    const phone = escapeCsvField(student.phone);
    const remark = escapeCsvField(student.remark || '-');
    csvContent += `${name},${phone},${student.totalHours},${student.giftHours},${student.usedHours},${remainingHours},"${student.startDate}","${student.deadline}",${student.otherFees},${remark},"${student.createTime}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `学员数据_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// CSV字段转义函数
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function exportToText(students: Student[], records: ClassRecord[]): void {
  let textContent = `学员数据报告\n`;
  textContent += `生成日期：${new Date().toLocaleString('zh-CN')}\n`;
  textContent += `\n========================================\n`;
  textContent += `学员列表（共 ${students.length} 人）\n`;
  textContent += `========================================\n\n`;

  students.forEach((student, index) => {
    const remainingHours = student.totalHours + student.giftHours - student.usedHours;
    textContent += `${index + 1}. ${student.name}\n`;
    textContent += `   电话：${student.phone}\n`;
    textContent += `   科目：${student.remark || '-'}\n`;
    textContent += `   总课时：${student.totalHours}\n`;
    textContent += `   赠送课时：${student.giftHours}\n`;
    textContent += `   已用课时：${student.usedHours}\n`;
    textContent += `   剩余课时：${remainingHours}\n`;
    textContent += `   开始日期：${student.startDate}\n`;
    textContent += `   截止日期：${student.deadline}\n`;
    textContent += `   课时费用：¥${student.otherFees}\n`;
    textContent += `   创建时间：${new Date(student.createTime).toLocaleString('zh-CN')}\n\n`;
  });

  if (records.length > 0) {
    textContent += `\n========================================\n`;
    textContent += `课时记录（共 ${records.length} 条）\n`;
    textContent += `========================================\n\n`;

    const studentMap = new Map(students.map(s => [s.id, s.name]));
    
    records.forEach((record, index) => {
      textContent += `${index + 1}. ${studentMap.get(record.studentId) || '未知学员'}\n`;
      textContent += `   日期：${record.date}\n`;
      textContent += `   课时：${record.hours}\n`;
      textContent += `   备注：${record.description || '-'}\n`;
      textContent += `   记录时间：${new Date(record.createTime).toLocaleString('zh-CN')}\n\n`;
    });
  }

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `学员数据_${new Date().toISOString().split('T')[0]}.txt`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}