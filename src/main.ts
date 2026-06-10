import './style.css';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HomePage } from './components/HomePage';
import { StudentList } from './components/StudentList';
import { RecordList } from './components/RecordList';
import { ExpiringList } from './components/ExpiringList';
import { StudentModal, RecordModal, ConfirmModal } from './components/Modal';
import { VacationStudentList } from './components/VacationStudentList';
import { VacationRecordList } from './components/VacationRecordList';
import { VacationStudentModal, VacationRecordModal, VacationConfirmModal } from './components/VacationModal';
import type { ClassRecord, Student, Statistics } from './types';
import {
  initStorage,
  getAllStudents,
  getStudentById,
  addStudent,
  updateStudent,
  updateStudentSortOrders,
  deleteStudent,
  addClassRecord,
  getClassRecordsByStudentId,
  deleteClassRecord,
  // 寒暑假班独立模块
  getAllVacationStudents,
  getVacationStudentById,
  addVacationStudent,
  updateVacationStudent,
  updateVacationStudentSortOrders,
  deleteVacationStudent,
  addVacationRecord,
  getVacationRecordsByStudentId,
  deleteVacationRecord,
} from './storage/db';
import { exportToCSV, exportToText } from './utils/export';
import { importFromCSV } from './utils/import';

let currentTab = 'home';
let students: Student[] = [];
// 寒暑假班独立状态（与主系统完全隔离）
let vacationStudents: Student[] = [];

function loadStudents() {
  students = getAllStudents();
}

function loadVacationStudents() {
  vacationStudents = getAllVacationStudents();
}

function calculateStatistics(): Statistics {
  const now = new Date();
  let expiringStudents = 0;

  const stats = students.reduce((acc, student) => {
    const deadline = new Date(student.deadline);
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const remainingHours = student.totalHours + student.giftHours - student.usedHours;

    if ((diffDays <= 30 && diffDays > 0) || remainingHours <= 10) {
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
  loadStudents();
  loadVacationStudents();

  const stats = calculateStatistics();
  const records: ClassRecord[] = [];

  for (const student of students) {
    try {
      const classRecords = getClassRecordsByStudentId(student.id);
      records.push(...classRecords);
    } catch (error) {
      console.error('加载课时记录失败:', error);
    }
  }

  // 寒暑课时记录（独立加载）
  const vacationRecords: ClassRecord[] = [];
  for (const student of vacationStudents) {
    try {
      const vRecords = getVacationRecordsByStudentId(student.id);
      vacationRecords.push(...vRecords);
    } catch (error) {
      console.error('加载寒暑课时记录失败:', error);
    }
  }

  const expiringStudentsList = students.filter(student => {
    const now = new Date();
    const deadline = new Date(student.deadline);
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const remainingHours = student.totalHours + student.giftHours - student.usedHours;
    return (diffDays <= 30 && diffDays > 0) || remainingHours <= 10;
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
        ${currentTab === 'vacation-students' ? VacationStudentList(vacationStudents) : ''}
        ${currentTab === 'vacation-records' ? VacationRecordList(vacationRecords, vacationStudents) : ''}
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
      const student = getStudentById(id!);
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

  // 导入功能
  const importFileInput = document.getElementById('import-file') as HTMLInputElement;
  if (importFileInput) {
    importFileInput.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const importedStudents = await importFromCSV(file);
        
        const confirmed = confirm(`即将导入 ${importedStudents.length} 名学员数据，是否继续？`);
        if (!confirmed) {
          importFileInput.value = '';
          return;
        }
        
        // 批量添加学员
        for (const student of importedStudents) {
          await addStudent(student);
        }
        
        alert(`成功导入 ${importedStudents.length} 名学员！`);
        render();
      } catch (error) {
        console.error('导入失败:', error);
        alert(`导入失败: ${(error as Error).message}`);
      } finally {
        importFileInput.value = '';
      }
    });
  }

  // 导出功能
  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', async () => {
      loadStudents();
      const records: ClassRecord[] = [];
      for (const student of students) {
        try {
          const classRecords = getClassRecordsByStudentId(student.id);
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
      loadStudents();
      const records: ClassRecord[] = [];
      for (const student of students) {
        try {
          const classRecords = getClassRecordsByStudentId(student.id);
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

      document.body.insertAdjacentHTML('beforeend', ConfirmModal('确定要删除这条课时记录吗？'));
      attachConfirmModalListeners(async () => {
        await deleteClassRecord(id!);
        render();
      });
    });
  });

  // ==================== 寒暑假班独立模块事件监听 ====================

  const vacationAddStudentBtn = document.getElementById('vacation-add-student-btn');
  if (vacationAddStudentBtn) {
    vacationAddStudentBtn.addEventListener('click', () => {
      document.body.insertAdjacentHTML('beforeend', VacationStudentModal('add'));
      attachVacationStudentModalListeners('add');
    });
  }

  const vacationAddRecordBtn = document.getElementById('vacation-add-record-btn');
  if (vacationAddRecordBtn) {
    vacationAddRecordBtn.addEventListener('click', () => {
      if (vacationStudents.length === 0) {
        alert('请先添加寒暑假学员');
        return;
      }
      document.body.insertAdjacentHTML('beforeend', VacationRecordModal(vacationStudents.map(s => ({ id: s.id, name: s.name }))));
      attachVacationRecordModalListeners();
    });
  }

  document.querySelectorAll('.vacation-edit-student-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const student = getVacationStudentById(id!);
      if (student) {
        document.body.insertAdjacentHTML('beforeend', VacationStudentModal('edit', student));
        attachVacationStudentModalListeners('edit');
      }
    });
  });

  document.querySelectorAll('.vacation-record-hours-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const studentId = btn.getAttribute('data-id');
      const student = vacationStudents.find(s => s.id === studentId);
      if (student) {
        document.body.insertAdjacentHTML('beforeend', VacationRecordModal([{ id: student.id, name: student.name }]));
        const select = document.getElementById('vacation-record-student') as HTMLSelectElement;
        select.value = student.id;
        attachVacationRecordModalListeners();
      }
    });
  });

  document.querySelectorAll('.vacation-delete-student-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const student = vacationStudents.find(s => s.id === id);
      document.body.insertAdjacentHTML('beforeend', VacationConfirmModal(`确定要删除寒暑假学员 "${student?.name}" 吗？此操作将同时删除该学员的所有课时记录。`));
      attachVacationConfirmModalListeners(async () => {
        await deleteVacationStudent(id!);
        render();
      });
    });
  });

  // 寒暑假学员拖拽排序
  const vacationTableBody = document.getElementById('vacation-student-table-body');
  if (vacationTableBody) {
    let draggedRow: HTMLTableRowElement | null = null;

    vacationTableBody.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      draggedRow = target.closest('tr');
      if (draggedRow) {
        draggedRow.style.opacity = '0.5';
      }
    });

    vacationTableBody.addEventListener('dragend', (e) => {
      const target = e.target as HTMLElement;
      draggedRow = target.closest('tr');
      if (draggedRow) {
        draggedRow.style.opacity = '1';
      }
    });

    vacationTableBody.addEventListener('dragover', (e) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const targetRow = target.closest('tr');
      if (targetRow) {
        targetRow.style.borderTop = '2px solid blue';
      }
    });

    vacationTableBody.addEventListener('dragleave', (e) => {
      const target = e.target as HTMLElement;
      const targetRow = target.closest('tr');
      if (targetRow) {
        targetRow.style.borderTop = '';
      }
    });

    vacationTableBody.addEventListener('drop', async (e) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const targetRow = target.closest('tr');
      if (!targetRow) return;

      targetRow.style.borderTop = '';

      if (draggedRow && draggedRow !== targetRow) {
        const draggedIndex = parseInt(draggedRow.getAttribute('data-index') || '0');
        const targetIndex = parseInt(targetRow.getAttribute('data-index') || '0');

        const [movedStudent] = vacationStudents.splice(draggedIndex, 1);
        vacationStudents.splice(targetIndex, 0, movedStudent);

        try {
          await updateVacationStudentSortOrders(vacationStudents);
          render();
        } catch (error) {
          console.error('保存寒暑假学员排序失败:', error);
          alert('保存排序失败');
        }
      }
    });
  }

  // 寒暑假课时记录删除
  document.querySelectorAll('.vacation-delete-record-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');

      document.body.insertAdjacentHTML('beforeend', VacationConfirmModal('确定要删除这条寒暑课时记录吗？'));
      attachVacationConfirmModalListeners(async () => {
        await deleteVacationRecord(id!);
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
        const student = getStudentById(id);
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

  // 课时数加减按钮
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

// ==================== 寒暑假班 Modal 监听器（与主系统完全隔离） ====================

function attachVacationStudentModalListeners(mode: 'add' | 'edit') {
  const closeModal = () => {
    const modal = document.getElementById('vacation-student-modal');
    if (modal) modal.remove();
  };

  document.getElementById('vacation-close-student-modal')?.addEventListener('click', closeModal);
  document.getElementById('vacation-cancel-student-btn')?.addEventListener('click', closeModal);

  const applyDeadlineBtn = document.getElementById('vacation-apply-deadline-btn');
  applyDeadlineBtn?.addEventListener('click', () => {
    const year = (document.getElementById('vacation-deadline-year') as HTMLInputElement).value;
    const month = String(parseInt((document.getElementById('vacation-deadline-month') as HTMLInputElement).value) || 1).padStart(2, '0');
    const day = String(parseInt((document.getElementById('vacation-deadline-day') as HTMLInputElement).value) || 1).padStart(2, '0');

    if (year && month && day) {
      const deadlineInput = document.getElementById('vacation-student-deadline') as HTMLInputElement;
      deadlineInput.value = `${year}-${month}-${day}`;
    } else {
      alert('请填写完整的年月日');
    }
  });

  document.getElementById('vacation-save-student-btn')?.addEventListener('click', async () => {
    const name = (document.getElementById('vacation-student-name') as HTMLInputElement).value;
    const phone = (document.getElementById('vacation-student-phone') as HTMLInputElement).value;
    const totalHours = parseFloat((document.getElementById('vacation-student-total-hours') as HTMLInputElement).value);
    const giftHours = parseFloat((document.getElementById('vacation-student-gift-hours') as HTMLInputElement).value) || 0;
    const startDate = (document.getElementById('vacation-student-start-date') as HTMLInputElement).value;
    const deadline = (document.getElementById('vacation-student-deadline') as HTMLInputElement).value;
    const otherFees = parseFloat((document.getElementById('vacation-student-other-fees') as HTMLInputElement).value) || 0;
    const remark = (document.getElementById('vacation-student-remark') as HTMLTextAreaElement).value || '';

    if (!name || !phone || isNaN(totalHours) || !startDate || !deadline) {
      alert('请填写必填项');
      return;
    }

    try {
      if (mode === 'add') {
        await addVacationStudent({ name, phone, totalHours, giftHours, startDate, deadline, otherFees, remark });
      } else {
        const id = (document.getElementById('vacation-student-id') as HTMLInputElement).value;
        const student = getVacationStudentById(id);
        if (student) {
          await updateVacationStudent({
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
      console.error('保存寒暑假学员失败:', error);
      alert('保存失败');
    }
  });
}

function attachVacationRecordModalListeners() {
  const closeModal = () => {
    const modal = document.getElementById('vacation-record-modal');
    if (modal) modal.remove();
  };

  document.getElementById('vacation-close-record-modal')?.addEventListener('click', closeModal);
  document.getElementById('vacation-cancel-record-btn')?.addEventListener('click', closeModal);

  const hoursInput = document.getElementById('vacation-record-hours') as HTMLInputElement;
  const decreaseBtn = document.getElementById('vacation-record-hours-decrease');
  const increaseBtn = document.getElementById('vacation-record-hours-increase');

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

  document.getElementById('vacation-save-record-btn')?.addEventListener('click', async () => {
    const studentId = (document.getElementById('vacation-record-student') as HTMLSelectElement).value;
    const date = (document.getElementById('vacation-record-date') as HTMLInputElement).value;
    const hours = parseInt((document.getElementById('vacation-record-hours') as HTMLInputElement).value);
    const description = (document.getElementById('vacation-record-description') as HTMLTextAreaElement).value;

    if (!studentId || !date || isNaN(hours)) {
      alert('请填写必填项');
      return;
    }

    try {
      await addVacationRecord({ studentId, hours, date, description });

      closeModal();
      render();
    } catch (error) {
      console.error('保存寒暑课时记录失败:', error);
      alert('保存失败');
    }
  });
}

function attachVacationConfirmModalListeners(onConfirm: () => void) {
  const closeModal = () => {
    const modal = document.getElementById('vacation-confirm-modal');
    if (modal) modal.remove();
  };

  document.getElementById('vacation-cancel-confirm-btn')?.addEventListener('click', closeModal);
  document.getElementById('vacation-confirm-btn')?.addEventListener('click', () => {
    onConfirm();
    closeModal();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. 诊断 Tauri 环境
  if (typeof window !== 'undefined') {
    const tauri = (window as any).__TAURI__;
    console.log('[Init] Tauri 环境检测:', tauri ? '已检测到 Tauri' : '未检测到 Tauri（浏览器环境）');
    if (tauri) {
      console.log('[Init] Tauri 对象 keys:', Object.keys(tauri));
    }
  }

  // 2. 从文件加载历史数据到内存缓存
  await initStorage();

  // 3. 首次渲染
  render();
});
