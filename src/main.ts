import './style.css';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './components/HomePage';
import { StudentList } from './components/StudentList';
import { RecordList } from './components/RecordList';
import { ExpiringList } from './components/ExpiringList';
import { StudentModal, RecordModal, ConfirmModal } from './components/Modal';
import type { ClassRecord, Student, Statistics } from './types';
import {
  getAllStudents,
  getStudentById,
  addStudent,
  updateStudent,
  updateStudentSortOrders,
  deleteStudent,
  addClassRecord,
  getClassRecordsByStudentId,
  deleteClassRecord,
} from './storage/db';
import { exportToCSV, exportToText } from './utils/export';

let currentTab = 'home';
let students: Student[] = [];

async function loadStudents() {
  try {
    students = await getAllStudents();
  } catch (error) {
    console.error('加载学员数据失败:', error);
    students = [];
  }
}

async function calculateStatistics(): Promise<Statistics> {
  const now = new Date();
  let expiringStudents = 0;

  const stats = students.reduce((acc, student) => {
    const deadline = new Date(student.deadline);
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 30 && diffDays > 0) {
      expiringStudents++;
    }

    return {
      totalStudents: acc.totalStudents + 1,
      totalHours: acc.totalHours + student.totalHours,
      totalGiftHours: acc.totalGiftHours + student.giftHours,
      totalUsedHours: acc.totalUsedHours + student.usedHours,
      totalRemainingHours: acc.totalRemainingHours + student.totalHours + student.giftHours - student.usedHours,
      totalOtherFees: acc.totalOtherFees + student.otherFees,
    };
  }, {
    totalStudents: 0,
    totalHours: 0,
    totalGiftHours: 0,
    totalUsedHours: 0,
    totalRemainingHours: 0,
    totalOtherFees: 0,
  });

  return { ...stats, expiringStudents };
}

async function render() {
  await loadStudents();

  const stats = await calculateStatistics();
  const records: ClassRecord[] = [];
  
  for (const student of students) {
    try {
      const classRecords = await getClassRecordsByStudentId(student.id);
      records.push(...classRecords);
    } catch (error) {
      console.error('加载课时记录失败:', error);
    }
  }

  const expiringStudentsList = students.filter(student => {
    const now = new Date();
    const deadline = new Date(student.deadline);
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  });

  const content = document.getElementById('app')!;
  content.innerHTML = `
    ${Header('课时记录软件')}
    <div class="flex h-[calc(100vh-73px)]">
      ${Sidebar(currentTab)}
      <main class="flex-1 overflow-auto bg-gray-100">
        ${currentTab === 'home' ? HomePage(stats) : ''}
        ${currentTab === 'students' ? StudentList(students) : ''}
        ${currentTab === 'records' ? RecordList(records, students) : ''}
        ${currentTab === 'expiring' ? ExpiringList(expiringStudentsList) : ''}
      </main>
    </div>
  `;

  attachEventListeners();
}

function attachEventListeners() {
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.getAttribute('data-tab') || 'home';
      render();
    });
  });

  const addStudentBtn = document.getElementById('add-student-btn');
  if (addStudentBtn) {
    addStudentBtn.addEventListener('click', () => {
      document.body.insertAdjacentHTML('beforeend', StudentModal('add'));
      attachStudentModalListeners('add');
    });
  }

  const addRecordBtn = document.getElementById('add-record-btn');
  if (addRecordBtn) {
    addRecordBtn.addEventListener('click', () => {
      if (students.length === 0) {
        alert('请先添加学员');
        return;
      }
      document.body.insertAdjacentHTML('beforeend', RecordModal(students.map(s => ({ id: s.id, name: s.name }))));
      attachRecordModalListeners();
    });
  }

  document.querySelectorAll('.edit-student-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const student = await getStudentById(id!);
      if (student) {
        document.body.insertAdjacentHTML('beforeend', StudentModal('edit', student));
        attachStudentModalListeners('edit');
      }
    });
  });

  document.querySelectorAll('.record-hours-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const studentId = btn.getAttribute('data-id');
      const student = students.find(s => s.id === studentId);
      if (student) {
        document.body.insertAdjacentHTML('beforeend', RecordModal([{ id: student.id, name: student.name }]));
        const select = document.getElementById('record-student') as HTMLSelectElement;
        select.value = student.id;
        attachRecordModalListeners();
      }
    });
  });

  document.querySelectorAll('.delete-student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const student = students.find(s => s.id === id);
      document.body.insertAdjacentHTML('beforeend', ConfirmModal(`确定要删除学员 "${student?.name}" 吗？此操作将同时删除该学员的所有课时记录。`));
      attachConfirmModalListeners(async () => {
        await deleteStudent(id!);
        render();
      });
    });
  });

  // 拖拽排序功能
  const tableBody = document.getElementById('student-table-body');
  if (tableBody) {
    let draggedRow: HTMLTableRowElement | null = null;
    
    tableBody.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      draggedRow = target.closest('tr');
      if (draggedRow) {
        draggedRow.style.opacity = '0.5';
      }
    });

    tableBody.addEventListener('dragend', (e) => {
      const target = e.target as HTMLElement;
      draggedRow = target.closest('tr');
      if (draggedRow) {
        draggedRow.style.opacity = '1';
      }
    });

    tableBody.addEventListener('dragover', (e) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const targetRow = target.closest('tr');
      if (targetRow) {
        targetRow.style.borderTop = '2px solid blue';
      }
    });

    tableBody.addEventListener('dragleave', (e) => {
      const target = e.target as HTMLElement;
      const targetRow = target.closest('tr');
      if (targetRow) {
        targetRow.style.borderTop = '';
      }
    });

    tableBody.addEventListener('drop', async (e) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const targetRow = target.closest('tr');
      if (!targetRow) return;
      
      targetRow.style.borderTop = '';
      
      if (draggedRow && draggedRow !== targetRow) {
        const draggedIndex = parseInt(draggedRow.getAttribute('data-index') || '0');
        const targetIndex = parseInt(targetRow.getAttribute('data-index') || '0');
        
        // 移动学员到新位置
        const [movedStudent] = students.splice(draggedIndex, 1);
        students.splice(targetIndex, 0, movedStudent);
        
        // 持久化排序
        try {
          await updateStudentSortOrders(students);
          // 重新渲染以更新顺序
          render();
        } catch (error) {
          console.error('保存排序失败:', error);
          alert('保存排序失败');
        }
      }
    });
  }

  // 导出功能
  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', async () => {
      await loadStudents();
      const records: ClassRecord[] = [];
      for (const student of students) {
        try {
          const classRecords = await getClassRecordsByStudentId(student.id);
          records.push(...classRecords);
        } catch (error) {
          console.error('加载课时记录失败:', error);
        }
      }
      exportToCSV(students, records);
    });
  }

  const exportTxtBtn = document.getElementById('export-txt-btn');
  if (exportTxtBtn) {
    exportTxtBtn.addEventListener('click', async () => {
      await loadStudents();
      const records: ClassRecord[] = [];
      for (const student of students) {
        try {
          const classRecords = await getClassRecordsByStudentId(student.id);
          records.push(...classRecords);
        } catch (error) {
          console.error('加载课时记录失败:', error);
        }
      }
      exportToText(students, records);
    });
  }

  document.querySelectorAll('.delete-record-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const studentId = btn.getAttribute('data-student-id');
      const hours = parseFloat(btn.getAttribute('data-hours') || '0');
      
      document.body.insertAdjacentHTML('beforeend', ConfirmModal('确定要删除这条课时记录吗？'));
      attachConfirmModalListeners(async () => {
        await deleteClassRecord(id!);
        
        const student = await getStudentById(studentId!);
        if (student) {
          student.usedHours = Math.max(0, student.usedHours - hours);
          await updateStudent(student);
        }
        
        render();
      });
    });
  });
}

function attachStudentModalListeners(mode: 'add' | 'edit') {
  const closeModal = () => {
    const modal = document.getElementById('student-modal');
    if (modal) modal.remove();
  };

  document.getElementById('close-student-modal')?.addEventListener('click', closeModal);
  document.getElementById('cancel-student-btn')?.addEventListener('click', closeModal);

  // 手动输入日期应用按钮
  const applyDeadlineBtn = document.getElementById('apply-deadline-btn');
  applyDeadlineBtn?.addEventListener('click', () => {
    const year = (document.getElementById('deadline-year') as HTMLInputElement).value;
    const month = String(parseInt((document.getElementById('deadline-month') as HTMLInputElement).value) || 1).padStart(2, '0');
    const day = String(parseInt((document.getElementById('deadline-day') as HTMLInputElement).value) || 1).padStart(2, '0');
    
    if (year && month && day) {
      const deadlineInput = document.getElementById('student-deadline') as HTMLInputElement;
      deadlineInput.value = `${year}-${month}-${day}`;
    } else {
      alert('请填写完整的年月日');
    }
  });

  document.getElementById('save-student-btn')?.addEventListener('click', async () => {
    const name = (document.getElementById('student-name') as HTMLInputElement).value;
    const phone = (document.getElementById('student-phone') as HTMLInputElement).value;
    const totalHours = parseFloat((document.getElementById('student-total-hours') as HTMLInputElement).value);
    const giftHours = parseFloat((document.getElementById('student-gift-hours') as HTMLInputElement).value) || 0;
    const startDate = (document.getElementById('student-start-date') as HTMLInputElement).value;
    const deadline = (document.getElementById('student-deadline') as HTMLInputElement).value;
    const otherFees = parseFloat((document.getElementById('student-other-fees') as HTMLInputElement).value) || 0;
    const remark = (document.getElementById('student-remark') as HTMLTextAreaElement).value || '';

    if (!name || !phone || isNaN(totalHours) || !startDate || !deadline) {
      alert('请填写必填项');
      return;
    }

    try {
      if (mode === 'add') {
        await addStudent({ name, phone, totalHours, giftHours, startDate, deadline, otherFees, remark });
      } else {
        const id = (document.getElementById('student-id') as HTMLInputElement).value;
        const student = await getStudentById(id);
        if (student) {
          await updateStudent({
            ...student,
            name,
            phone,
            totalHours,
            giftHours,
            startDate,
            deadline,
            otherFees,
            remark,
          });
        }
      }
      closeModal();
      render();
    } catch (error) {
      console.error('保存学员失败:', error);
      alert('保存失败');
    }
  });
}

function attachRecordModalListeners() {
  const closeModal = () => {
    const modal = document.getElementById('record-modal');
    if (modal) modal.remove();
  };

  document.getElementById('close-record-modal')?.addEventListener('click', closeModal);
  document.getElementById('cancel-record-btn')?.addEventListener('click', closeModal);

  // 天数加减按钮
  const hoursInput = document.getElementById('record-hours') as HTMLInputElement;
  const decreaseBtn = document.getElementById('record-hours-decrease');
  const increaseBtn = document.getElementById('record-hours-increase');

  decreaseBtn?.addEventListener('click', () => {
    let currentValue = parseInt(hoursInput.value) || 2;
    currentValue = Math.max(1, currentValue - 1);
    hoursInput.value = currentValue.toString();
  });

  increaseBtn?.addEventListener('click', () => {
    let currentValue = parseInt(hoursInput.value) || 2;
    currentValue += 1;
    hoursInput.value = currentValue.toString();
  });

  document.getElementById('save-record-btn')?.addEventListener('click', async () => {
    const studentId = (document.getElementById('record-student') as HTMLSelectElement).value;
    const date = (document.getElementById('record-date') as HTMLInputElement).value;
    const hours = parseInt((document.getElementById('record-hours') as HTMLInputElement).value);
    const description = (document.getElementById('record-description') as HTMLTextAreaElement).value;

    if (!studentId || !date || isNaN(hours)) {
      alert('请填写必填项');
      return;
    }

    try {
      await addClassRecord({ studentId, hours, date, description });

      const student = await getStudentById(studentId);
      if (student) {
        student.usedHours += hours;
        await updateStudent(student);
      }

      closeModal();
      render();
    } catch (error) {
      console.error('保存课时记录失败:', error);
      alert('保存失败');
    }
  });
}

function attachConfirmModalListeners(onConfirm: () => void) {
  const closeModal = () => {
    const modal = document.getElementById('confirm-modal');
    if (modal) modal.remove();
  };

  document.getElementById('cancel-confirm-btn')?.addEventListener('click', closeModal);
  document.getElementById('confirm-btn')?.addEventListener('click', () => {
    onConfirm();
    closeModal();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  render();
});
