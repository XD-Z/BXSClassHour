import type { Student, ClassRecord } from '../types';

// ==================== 核心架构：内存缓存优先 + 异步持久化 ====================
// 1. 所有读操作：直接从内存缓存读取（同步，即时响应）
// 2. 所有写操作：先更新内存缓存 → 立即触发 UI → 异步写入文件持久化
// 3. 应用启动时：异步从文件加载数据到内存缓存

// ---------- 内存缓存 ----------
const cache: {
  students: Student[];
  classRecords: ClassRecord[];
  vacationStudents: Student[];
  vacationRecords: ClassRecord[];
  initialized: boolean;
} = {
  students: [],
  classRecords: [],
  vacationStudents: [],
  vacationRecords: [],
  initialized: false,
};

// ---------- 存储键名 ----------
const KEY_STUDENTS = 'students';
const KEY_CLASS_RECORDS = 'classRecords';
const KEY_VACATION_STUDENTS = 'vacationStudents';
const KEY_VACATION_RECORDS = 'vacationRecords';

// ---------- 环境检测 ----------
function isTauriApp(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__TAURI__;
}

// ---------- Tauri invoke：尝试多种可能的 API 路径 ----------
async function tauriInvoke<T>(cmd: string, args: Record<string, any>): Promise<T> {
  const tauri = (window as any).__TAURI__;
  if (!tauri) throw new Error('Tauri API 不可用');

  // 打印 Tauri 对象结构，帮助诊断
  console.log('[DB] Tauri 对象 keys:', Object.keys(tauri));

  // 方式 1：tauri.invoke（Tauri 2.x withGlobalTauri 常见）
  if (typeof tauri.invoke === 'function') {
    console.log('[DB] 使用 tauri.invoke 方式');
    return tauri.invoke(cmd, args);
  }

  // 方式 2：tauri.core.invoke
  if (tauri.core && typeof tauri.core.invoke === 'function') {
    console.log('[DB] 使用 tauri.core.invoke 方式');
    return tauri.core.invoke(cmd, args);
  }

  // 方式 3：遍历所有属性找 invoke 函数
  for (const k of Object.keys(tauri)) {
    const v = tauri[k];
    if (v && typeof v.invoke === 'function') {
      console.log('[DB] 找到 invoke 在属性:', k);
      return v.invoke(cmd, args);
    }
  }

  throw new Error('找不到 Tauri invoke 函数');
}

// ---------- 浏览器 localStorage 回退 ----------
function readLS<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch (e) {
    console.warn('[DB] localStorage 读取失败:', key, e);
    return [];
  }
}

function writeLS<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('[DB] localStorage 写入失败:', key, e);
  }
}

// ---------- 从文件加载到内存缓存（应用启动时调用）----------
export async function initStorage(): Promise<void> {
  if (cache.initialized) return;

  console.log('[DB] 初始化存储...');

  if (isTauriApp()) {
    // Tauri 桌面应用：尝试从 Rust 命令读取文件
    try {
      const [s, r, vs, vr] = await Promise.all([
        tauriInvoke<string>('load_json_data', { key: KEY_STUDENTS }),
        tauriInvoke<string>('load_json_data', { key: KEY_CLASS_RECORDS }),
        tauriInvoke<string>('load_json_data', { key: KEY_VACATION_STUDENTS }),
        tauriInvoke<string>('load_json_data', { key: KEY_VACATION_RECORDS }),
      ]);
      cache.students = s ? JSON.parse(s) : [];
      cache.classRecords = r ? JSON.parse(r) : [];
      cache.vacationStudents = vs ? JSON.parse(vs) : [];
      cache.vacationRecords = vr ? JSON.parse(vr) : [];
      console.log('[DB] Tauri 文件加载成功:', {
        students: cache.students.length,
        records: cache.classRecords.length,
        vacationStudents: cache.vacationStudents.length,
        vacationRecords: cache.vacationRecords.length,
      });
    } catch (error) {
      console.warn('[DB] Tauri 文件读取失败，回退到 localStorage:', error);
      cache.students = readLS<Student>(KEY_STUDENTS);
      cache.classRecords = readLS<ClassRecord>(KEY_CLASS_RECORDS);
      cache.vacationStudents = readLS<Student>(KEY_VACATION_STUDENTS);
      cache.vacationRecords = readLS<ClassRecord>(KEY_VACATION_RECORDS);
    }
  } else {
    // 浏览器：从 localStorage 读取
    cache.students = readLS<Student>(KEY_STUDENTS);
    cache.classRecords = readLS<ClassRecord>(KEY_CLASS_RECORDS);
    cache.vacationStudents = readLS<Student>(KEY_VACATION_STUDENTS);
    cache.vacationRecords = readLS<ClassRecord>(KEY_VACATION_RECORDS);
  }

  cache.initialized = true;
  console.log('[DB] 存储初始化完成');
}

// ---------- 异步持久化写入 ----------
async function persist(key: string, data: any[]): Promise<void> {
  if (isTauriApp()) {
    try {
      await tauriInvoke('save_json_data', { key, value: JSON.stringify(data) });
    } catch (error) {
      console.warn('[DB] Tauri 写入失败，回退到 localStorage:', error);
      writeLS(key, data);
    }
  } else {
    writeLS(key, data);
  }
}

// ---------- 排序工具 ----------
function sortStudents(students: Student[]): Student[] {
  return [...students].sort((a, b) => {
    const aOrder = a.sortOrder ?? 0;
    const bOrder = b.sortOrder ?? 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(a.createTime).getTime() - new Date(b.createTime).getTime();
  });
}

// ==================== 正式学员模块 ====================

export async function addStudent(
  student: Omit<Student, 'id' | 'usedHours' | 'createTime' | 'updateTime' | 'sortOrder'>
): Promise<string> {
  const id = Date.now().toString();
  const now = new Date().toISOString();
  const maxSortOrder =
    cache.students.length > 0 ? Math.max(...cache.students.map((s) => s.sortOrder || 0)) : 0;

  const newStudent: Student = {
    ...student,
    id,
    usedHours: 0,
    sortOrder: maxSortOrder + 1,
    createTime: now,
    updateTime: now,
  };

  // 1. 更新内存缓存（立即生效）
  cache.students.push(newStudent);

  // 2. 异步写入文件（不阻塞 UI）
  persist(KEY_STUDENTS, cache.students).catch((e) =>
    console.error('[DB] 持久化学员数据失败:', e)
  );

  console.log('[DB] 学员已添加:', newStudent.name, '当前总数:', cache.students.length);
  return id;
}

export async function updateStudent(student: Student): Promise<void> {
  const idx = cache.students.findIndex((s) => s.id === student.id);
  if (idx >= 0) {
    cache.students[idx] = { ...student, updateTime: new Date().toISOString() };
    persist(KEY_STUDENTS, cache.students).catch((e) =>
      console.error('[DB] 持久化学员数据失败:', e)
    );
  }
}

export async function updateStudentSortOrders(students: Student[]): Promise<void> {
  const now = new Date().toISOString();
  students.forEach((student, index) => {
    const idx = cache.students.findIndex((s) => s.id === student.id);
    if (idx >= 0) {
      cache.students[idx] = { ...student, sortOrder: index + 1, updateTime: now };
    } else {
      cache.students.push({ ...student, sortOrder: index + 1, updateTime: now });
    }
  });
  persist(KEY_STUDENTS, cache.students).catch((e) =>
    console.error('[DB] 持久化学员排序失败:', e)
  );
}

export async function deleteStudent(id: string): Promise<void> {
  cache.students = cache.students.filter((s) => s.id !== id);
  cache.classRecords = cache.classRecords.filter((r) => r.studentId !== id);
  persist(KEY_STUDENTS, cache.students).catch((e) =>
    console.error('[DB] 持久化学员数据失败:', e)
  );
  persist(KEY_CLASS_RECORDS, cache.classRecords).catch((e) =>
    console.error('[DB] 持久化课时记录失败:', e)
  );
}

export function getAllStudents(): Student[] {
  return sortStudents(cache.students);
}

export function getStudentById(id: string): Student | undefined {
  return cache.students.find((s) => s.id === id);
}

// ==================== 正式课时记录模块 ====================

export async function addClassRecord(
  record: Omit<ClassRecord, 'id' | 'createTime'>
): Promise<string> {
  const id = Date.now().toString();
  const now = new Date().toISOString();
  const newRecord: ClassRecord = { ...record, id, createTime: now };

  cache.classRecords.push(newRecord);
  persist(KEY_CLASS_RECORDS, cache.classRecords).catch((e) =>
    console.error('[DB] 持久化课时记录失败:', e)
  );

  // 更新学员已用课时
  const studentIdx = cache.students.findIndex((s) => s.id === record.studentId);
  if (studentIdx >= 0) {
    cache.students[studentIdx] = {
      ...cache.students[studentIdx],
      usedHours: (cache.students[studentIdx].usedHours || 0) + (record.hours || 0),
      updateTime: now,
    };
    persist(KEY_STUDENTS, cache.students).catch((e) =>
      console.error('[DB] 持久化学员数据失败:', e)
    );
  }

  return id;
}

export function getClassRecordsByStudentId(studentId: string): ClassRecord[] {
  return cache.classRecords.filter((r) => r.studentId === studentId);
}

export async function deleteClassRecord(id: string): Promise<void> {
  const record = cache.classRecords.find((r) => r.id === id);
  cache.classRecords = cache.classRecords.filter((r) => r.id !== id);
  persist(KEY_CLASS_RECORDS, cache.classRecords).catch((e) =>
    console.error('[DB] 持久化课时记录失败:', e)
  );

  // 回滚学员已用课时
  if (record) {
    const studentIdx = cache.students.findIndex((s) => s.id === record.studentId);
    if (studentIdx >= 0) {
      cache.students[studentIdx] = {
        ...cache.students[studentIdx],
        usedHours: Math.max(0, (cache.students[studentIdx].usedHours || 0) - (record.hours || 0)),
        updateTime: new Date().toISOString(),
      };
      persist(KEY_STUDENTS, cache.students).catch((e) =>
        console.error('[DB] 持久化学员数据失败:', e)
      );
    }
  }
}

// ==================== 寒暑假班独立模块 ====================

export async function addVacationStudent(
  student: Omit<Student, 'id' | 'usedHours' | 'createTime' | 'updateTime' | 'sortOrder'>
): Promise<string> {
  const id = 'vac_' + Date.now().toString();
  const now = new Date().toISOString();
  const maxSortOrder =
    cache.vacationStudents.length > 0
      ? Math.max(...cache.vacationStudents.map((s) => s.sortOrder || 0))
      : 0;

  const newStudent: Student = {
    ...student,
    id,
    usedHours: 0,
    sortOrder: maxSortOrder + 1,
    createTime: now,
    updateTime: now,
  };

  cache.vacationStudents.push(newStudent);
  persist(KEY_VACATION_STUDENTS, cache.vacationStudents).catch((e) =>
    console.error('[DB] 持久化寒暑假学员失败:', e)
  );

  console.log('[DB] 寒暑假学员已添加:', newStudent.name, '当前总数:', cache.vacationStudents.length);
  return id;
}

export async function updateVacationStudent(student: Student): Promise<void> {
  const idx = cache.vacationStudents.findIndex((s) => s.id === student.id);
  if (idx >= 0) {
    cache.vacationStudents[idx] = { ...student, updateTime: new Date().toISOString() };
    persist(KEY_VACATION_STUDENTS, cache.vacationStudents).catch((e) =>
      console.error('[DB] 持久化寒暑假学员失败:', e)
    );
  }
}

export async function updateVacationStudentSortOrders(students: Student[]): Promise<void> {
  const now = new Date().toISOString();
  students.forEach((student, index) => {
    const idx = cache.vacationStudents.findIndex((s) => s.id === student.id);
    if (idx >= 0) {
      cache.vacationStudents[idx] = { ...student, sortOrder: index + 1, updateTime: now };
    } else {
      cache.vacationStudents.push({ ...student, sortOrder: index + 1, updateTime: now });
    }
  });
  persist(KEY_VACATION_STUDENTS, cache.vacationStudents).catch((e) =>
    console.error('[DB] 持久化寒暑假学员排序失败:', e)
  );
}

export async function deleteVacationStudent(id: string): Promise<void> {
  cache.vacationStudents = cache.vacationStudents.filter((s) => s.id !== id);
  cache.vacationRecords = cache.vacationRecords.filter((r) => r.studentId !== id);
  persist(KEY_VACATION_STUDENTS, cache.vacationStudents).catch((e) =>
    console.error('[DB] 持久化寒暑假学员失败:', e)
  );
  persist(KEY_VACATION_RECORDS, cache.vacationRecords).catch((e) =>
    console.error('[DB] 持久化寒暑假课时记录失败:', e)
  );
}

export function getAllVacationStudents(): Student[] {
  return sortStudents(cache.vacationStudents);
}

export function getVacationStudentById(id: string): Student | undefined {
  return cache.vacationStudents.find((s) => s.id === id);
}

export async function addVacationRecord(
  record: Omit<ClassRecord, 'id' | 'createTime'>
): Promise<string> {
  const id = 'vac_rec_' + Date.now().toString();
  const now = new Date().toISOString();
  const newRecord: ClassRecord = { ...record, id, createTime: now };

  cache.vacationRecords.push(newRecord);
  persist(KEY_VACATION_RECORDS, cache.vacationRecords).catch((e) =>
    console.error('[DB] 持久化寒暑假课时记录失败:', e)
  );

  const studentIdx = cache.vacationStudents.findIndex((s) => s.id === record.studentId);
  if (studentIdx >= 0) {
    cache.vacationStudents[studentIdx] = {
      ...cache.vacationStudents[studentIdx],
      usedHours: (cache.vacationStudents[studentIdx].usedHours || 0) + (record.hours || 0),
      updateTime: now,
    };
    persist(KEY_VACATION_STUDENTS, cache.vacationStudents).catch((e) =>
      console.error('[DB] 持久化寒暑假学员失败:', e)
    );
  }

  return id;
}

export function getVacationRecordsByStudentId(studentId: string): ClassRecord[] {
  return cache.vacationRecords.filter((r) => r.studentId === studentId);
}

export async function deleteVacationRecord(id: string): Promise<void> {
  const record = cache.vacationRecords.find((r) => r.id === id);
  cache.vacationRecords = cache.vacationRecords.filter((r) => r.id !== id);
  persist(KEY_VACATION_RECORDS, cache.vacationRecords).catch((e) =>
    console.error('[DB] 持久化寒暑假课时记录失败:', e)
  );

  if (record) {
    const studentIdx = cache.vacationStudents.findIndex((s) => s.id === record.studentId);
    if (studentIdx >= 0) {
      cache.vacationStudents[studentIdx] = {
        ...cache.vacationStudents[studentIdx],
        usedHours: Math.max(
          0,
          (cache.vacationStudents[studentIdx].usedHours || 0) - (record.hours || 0)
        ),
        updateTime: new Date().toISOString(),
      };
      persist(KEY_VACATION_STUDENTS, cache.vacationStudents).catch((e) =>
        console.error('[DB] 持久化寒暑假学员失败:', e)
      );
    }
  }
}
