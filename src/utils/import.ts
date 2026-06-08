import type { Student } from '../types';

export async function importFromCSV(file: File): Promise<Student[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        // 移除UTF-8 BOM
        const csvContent = content.replace(/^\uFEFF/, '');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('CSV文件内容为空或格式不正确'));
          return;
        }
        
        // 解析表头
        const headers = lines[0].split(',').map(h => h.trim());
        
        // 找到各列的索引
        const nameIndex = headers.findIndex(h => h.includes('姓名'));
        const phoneIndex = headers.findIndex(h => h.includes('电话'));
        const totalHoursIndex = headers.findIndex(h => h.includes('总课时'));
        const giftHoursIndex = headers.findIndex(h => h.includes('赠送课时'));
        const usedHoursIndex = headers.findIndex(h => h.includes('已用课时'));
        const startDateIndex = headers.findIndex(h => h.includes('开始日期'));
        const deadlineIndex = headers.findIndex(h => h.includes('截止日期'));
        const otherFeesIndex = headers.findIndex(h => h.includes('课时费用'));
        const remarkIndex = headers.findIndex(h => h.includes('科目'));
        
        // 检查必填列
        if (nameIndex === -1 || phoneIndex === -1 || totalHoursIndex === -1 || 
            startDateIndex === -1 || deadlineIndex === -1) {
          reject(new Error('CSV文件缺少必要的列（姓名、电话、总课时、开始日期、截止日期）'));
          return;
        }
        
        // 解析数据行
        const students: Student[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          const fields = parseCSVLine(line);
          
          const student: Student = {
            id: `import_${Date.now()}_${i}`,
            name: fields[nameIndex] || '',
            phone: fields[phoneIndex] || '',
            totalHours: parseFloat(fields[totalHoursIndex] || '0'),
            giftHours: parseFloat(fields[giftHoursIndex] || '0'),
            usedHours: parseFloat(fields[usedHoursIndex] || '0'),
            startDate: fields[startDateIndex] || '',
            deadline: fields[deadlineIndex] || '',
            otherFees: parseFloat(fields[otherFeesIndex] || '0'),
            remark: fields[remarkIndex] || '',
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            sortOrder: i,
          };
          
          // 验证必填字段
          if (!student.name || !student.phone || isNaN(student.totalHours) || 
              !student.startDate || !student.deadline) {
            console.warn(`第${i+1}行数据不完整，已跳过`);
            continue;
          }
          
          students.push(student);
        }
        
        if (students.length === 0) {
          reject(new Error('没有找到有效的学员数据'));
          return;
        }
        
        resolve(students);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    
    reader.readAsText(file, 'UTF-8');
  });
}

// 解析CSV行，处理带引号的字段
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        // 转义的双引号
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}
