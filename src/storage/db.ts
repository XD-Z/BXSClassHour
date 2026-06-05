import type { Student, ClassRecord } from '../types';

const DB_NAME = 'ClassRecordDB';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains('students')) {
        const studentStore = database.createObjectStore('students', { keyPath: 'id' });
        studentStore.createIndex('name', 'name', { unique: false });
        studentStore.createIndex('deadline', 'deadline', { unique: false });
      }

      if (!database.objectStoreNames.contains('classRecords')) {
        const recordStore = database.createObjectStore('classRecords', { keyPath: 'id' });
        recordStore.createIndex('studentId', 'studentId', { unique: false });
        recordStore.createIndex('date', 'date', { unique: false });
      }
    };
  });
}

export async function addStudent(student: Omit<Student, 'id' | 'usedHours' | 'createTime' | 'updateTime' | 'sortOrder'>): Promise<string> {
  const database = await openDB();
  const id = Date.now().toString();
  const now = new Date().toISOString();
  
  // 获取当前最大排序值
  const allStudents = await getAllStudents();
  const maxSortOrder = allStudents.length > 0 ? Math.max(...allStudents.map(s => s.sortOrder || 0)) : 0;
  
  const newStudent: Student = {
    ...student,
    id,
    usedHours: 0,
    sortOrder: maxSortOrder + 1,
    createTime: now,
    updateTime: now,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['students'], 'readwrite');
    const store = transaction.objectStore('students');
    const request = store.add(newStudent);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function updateStudent(student: Student): Promise<void> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['students'], 'readwrite');
    const store = transaction.objectStore('students');
    const request = store.put({ ...student, updateTime: new Date().toISOString() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateStudentSortOrders(students: Student[]): Promise<void> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['students'], 'readwrite');
    const store = transaction.objectStore('students');
    
    let completed = 0;
    const total = students.length;
    
    students.forEach((student, index) => {
      const updatedStudent = {
        ...student,
        sortOrder: index + 1,
        updateTime: new Date().toISOString()
      };
      
      const request = store.put(updatedStudent);
      
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  });
}

export async function deleteStudent(id: string): Promise<void> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['students', 'classRecords'], 'readwrite');
    const studentStore = transaction.objectStore('students');
    const recordStore = transaction.objectStore('classRecords');
    
    studentStore.delete(id);
    
    const index = recordStore.index('studentId');
    const request = index.openCursor(id);
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

export async function getAllStudents(): Promise<Student[]> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['students'], 'readonly');
    const store = transaction.objectStore('students');
    const request = store.getAll();

    request.onsuccess = () => {
      const students = request.result;
      // 按sortOrder排序，如果没有sortOrder则按createTime排序
      students.sort((a, b) => {
        const aOrder = a.sortOrder ?? 0;
        const bOrder = b.sortOrder ?? 0;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        return new Date(a.createTime).getTime() - new Date(b.createTime).getTime();
      });
      resolve(students);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getStudentById(id: string): Promise<Student | undefined> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['students'], 'readonly');
    const store = transaction.objectStore('students');
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addClassRecord(record: Omit<ClassRecord, 'id' | 'createTime'>): Promise<string> {
  const database = await openDB();
  const id = Date.now().toString();
  const now = new Date().toISOString();
  
  const newRecord: ClassRecord = {
    ...record,
    id,
    createTime: now,
  };

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['classRecords'], 'readwrite');
    const store = transaction.objectStore('classRecords');
    const request = store.add(newRecord);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getClassRecordsByStudentId(studentId: string): Promise<ClassRecord[]> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['classRecords'], 'readonly');
    const store = transaction.objectStore('classRecords');
    const index = store.index('studentId');
    const request = index.getAll(studentId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteClassRecord(id: string): Promise<void> {
  const database = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['classRecords'], 'readwrite');
    const store = transaction.objectStore('classRecords');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
