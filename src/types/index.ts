export interface Student {
  id: string;
  name: string;
  phone: string;
  totalHours: number;
  giftHours: number;
  usedHours: number;
  startDate: string;
  deadline: string;
  otherFees: number;
  remark: string;
  sortOrder: number;
  createTime: string;
  updateTime: string;
}

export interface ClassRecord {
  id: string;
  studentId: string;
  hours: number;
  date: string;
  description: string;
  createTime: string;
}

export interface Statistics {
  totalStudents: number;
  totalHours: number;
  totalGiftHours: number;
  totalUsedHours: number;
  totalRemainingHours: number;
  totalOtherFees: number;
  expiringStudents: number;
}
