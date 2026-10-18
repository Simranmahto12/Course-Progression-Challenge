const subjects = [
  { name: 'Data Structures & Algorithms', color: '#7b70e1', progress: 82, pace: 'On track', buffer: '1.32×' },
  { name: 'Database Systems', color: '#e7a956', progress: 46, pace: 'At risk', buffer: '0.84×' },
  { name: 'Computer Networks', color: '#68a0df', progress: 71, pace: 'On track', buffer: '1.18×' },
  { name: 'Machine Learning', color: '#68bd96', progress: 64, pace: 'Tight', buffer: '1.08×' },
  { name: 'Operating Systems', color: '#e98783', progress: 76, pace: 'On track', buffer: '1.24×' },
  { name: 'Artificial Intelligence', color: '#7daab0', progress: 70, pace: 'On track', buffer: '1.25×' },
  { name: 'Professional Skills', color: '#a77fca', progress: 67, pace: 'On track', buffer: '1.20×' },
];

const sessions = [
  { time: '09:00 AM', subject: 'Data Structures & Algorithms', detail: 'Lecture · Room 204', color: '', tag: 'Logged', logged: true },
  { time: '11:30 AM', subject: 'Computer Networks', detail: 'Lecture · Room 108', color: 'blue-mark', tag: 'Log session', logged: false },
  { time: '02:00 PM', subject: 'Machine Learning', detail: 'Lab · Lab 03', color: 'orange-mark', tag: 'Upcoming', logged: false },
];

const pageDetails = {
  overview: ['Overview', 'Good morning, Suresh', 'Here’s how your courses are moving this semester.'],
  sessions: ['Sessions', 'Your teaching sessions', 'Log classes and keep your course progress up to date.'],
  subjects: ['Subjects', 'Your subjects', 'A clear view of progress, pace, and time left for each course.'],
  calendar: ['Calendar', 'Semester calendar', 'Your classes and important exam dates, all in one place.'],
  students: ['Students', 'Student progress', 'See how your batch is moving through the semester.'],
  reports: ['Reports', 'Progress reports', 'A quick summary of course coverage and teaching hours.'],
  timetable: ['Timetable', 'Weekly timetable', 'See when and where classes are scheduled.'],
  settings: ['Settings', 'Semester settings', 'Manage semester details and course preferences.'],
};

const savedSessions = loadSavedSessions();
const subjectRows = document.getElementById('subject-rows');
const scheduleList = document.getElementById('schedule-list');
const dialog = document.getElementById('session-dialog');
const form = document.getElementById('session-form');
let toastTimeout;

function loadSavedSessions() {
  try {
    const stored = localStorage.getItem('mirai-course-sessions');
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Saved demo sessions could not be loaded.', error);
    return [];
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));
}

function getSubjectProgress(subject) {
  const change = savedSessions
    .filter((session) => session.subject === subject.name && session.status !== 'Skipped' && session.status !== 'Cancelled')
    .reduce((total, session) => total + (Number(session.completion) || 0) / 5, 0);
  return Math.min(100, Math.round(subject.progress + change));
}

function renderSubjects() {
  subjectRows.innerHTML = subjects.map((subject) => {
    const progress = getSubjectProgress(subject);
    const paceClass = subject.pace === 'Tight' ? 'tight' : subject.pace === 'At risk' ? 'danger' : '';
    const progressClass = paceClass === 'danger' ? 'progress-amber' : paceClass === 'tight' ? '' : 'progress-green';
    return `<tr>
      <td><span class="subject-name"><i class="subject-dot" style="background:${subject.color}"></i>${escapeHtml(subject.name)}</span></td>
      <td><span class="subject-progress"><span class="progress-track"><i class="${progressClass}" style="width:${progress}%"></i></span><span class="progress-number">${progress}%</span></span></td>
      <td><span class="pace-pill ${paceClass}">${escapeHtml(subject.pace)}</span></td>
      <td class="buffer-cell">${subject.buffer}</td>
    </tr>`;
  }).join('');
  const completedCount = subjects.filter((subject) => subject.pace === 'On track').length;
  document.querySelector('.stat-card:nth-child(3) .stat-unit').textContent = `of ${subjects.length} subjects`;
  document.getElementById('track-value').textContent = String(completedCount);
  const average = Math.round(subjects.reduce((sum, subject) => sum + getSubjectProgress(subject), 0) / subjects.length);
  document.getElementById('coverage-value').textContent = `${average}%`;
}

function renderWeek() {
  const days = [['MON', '12'], ['TUE', '13'], ['WED', '14'], ['THU', '15'], ['FRI', '16']];
  document.getElementById('week-strip').innerHTML = days.map(([day, date]) =>
    `<div class="day-chip ${day === 'THU' ? 'today' : ''}"><span>${day}</span><strong>${date}</strong></div>`,
  ).join('');
}

function renderSessions() {
  scheduleList.innerHTML = sessions.map((session, index) => {
    const saved = savedSessions.some((item) => item.subject === session.subject);
    const tag = saved ? 'Logged' : session.tag;
    const logged = saved || session.logged;
    return `<div class="schedule-item">
      <span class="schedule-time">${session.time}</span>
      <i class="schedule-mark ${session.color}"></i>
      <span class="schedule-info"><strong>${escapeHtml(session.subject)}</strong><small>${escapeHtml(session.detail)}</small></span>
      <button class="schedule-tag ${logged ? 'logged' : ''}" data-session-index="${index}">${tag}</button>
    </div>`;
  }).join('');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => toast.classList.remove('visible'), 2600);
}

function setPage(page) {
  const details = pageDetails[page] || pageDetails.overview;
  document.getElementById('crumb-title').textContent = details[0];
  document.getElementById('page-subtitle').textContent = details[2];
  document.querySelectorAll('.nav-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.page === page);
  });
  if (page === 'overview') {
    document.getElementById('page-title').innerHTML = 'Good morning, Suresh <span class="wave">✳</span>';
    document.querySelector('.stat-grid').hidden = false;
    document.querySelector('.content-grid').hidden = false;
    document.querySelector('.subject-panel').hidden = false;
    document.querySelector('.week-panel').hidden = false;
    document.querySelector('.bottom-grid').hidden = false;
    return;
  }
  document.getElementById('page-title').textContent = details[1];
  if (page === 'subjects') {
    document.querySelector('.stat-grid').hidden = true;
    document.querySelector('.content-grid').hidden = false;
    document.querySelector('.subject-panel').hidden = false;
    document.querySelector('.week-panel').hidden = true;
    document.querySelector('.bottom-grid').hidden = true;
    return;
  }
  if (page === 'sessions' || page === 'calendar' || page === 'timetable') {
    document.querySelector('.stat-grid').hidden = true;
    document.querySelector('.content-grid').hidden = false;
    document.querySelector('.subject-panel').hidden = true;
    document.querySelector('.week-panel').hidden = false;
    document.querySelector('.bottom-grid').hidden = true;
    return;
  }
  document.querySelector('.stat-grid').hidden = false;
  document.querySelector('.content-grid').hidden = false;
  document.querySelector('.subject-panel').hidden = false;
  document.querySelector('.week-panel').hidden = true;
  document.querySelector('.bottom-grid').hidden = false;
  if (page === 'settings') showToast('These settings will be available when the backend is connected.');
}

function openSessionDialog(subject) {
  const select = document.getElementById('session-subject');
  select.innerHTML = subjects.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('');
  if (subject && subjects.some((item) => item.name === subject)) select.value = subject;
  document.getElementById('session-status').value = 'Completed';
  document.getElementById('session-completion').value = '100';
  document.getElementById('completion-label').textContent = '100%';
  document.getElementById('session-notes').value = '';
  document.getElementById('completion-wrap').hidden = false;
  dialog.showModal();
}

document.querySelectorAll('.nav-link').forEach((button) => {
  button.addEventListener('click', () => {
    setPage(button.dataset.page);
    document.getElementById('sidebar').classList.remove('open');
  });
});
document.querySelectorAll('[data-page-link]').forEach((button) => {
  button.addEventListener('click', () => setPage(button.dataset.pageLink));
});
document.querySelectorAll('[data-toast]').forEach((button) => {
  button.addEventListener('click', () => showToast(button.dataset.toast));
});
document.getElementById('log-session-button').addEventListener('click', () => openSessionDialog());
document.getElementById('attention-log').addEventListener('click', () => openSessionDialog('Computer Networks'));
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
document.getElementById('mobile-menu').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});
document.getElementById('profile-button').addEventListener('click', () => showToast('Signed in as Suresh Varma · Program Manager'));
document.getElementById('session-status').addEventListener('change', (event) => {
  const complete = event.target.value === 'Completed' || event.target.value === 'In progress';
  document.getElementById('completion-wrap').hidden = !complete;
});
document.getElementById('session-completion').addEventListener('input', (event) => {
  document.getElementById('completion-label').textContent = `${event.target.value}%`;
});
document.getElementById('semester-select').addEventListener('change', (event) => {
  showToast(`${event.target.value} selected. Semester data is demo content.`);
});
scheduleList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-session-index]');
  if (!button) return;
  const session = sessions[Number(button.dataset.sessionIndex)];
  if (session) openSessionDialog(session.subject);
});
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const session = {
    subject: document.getElementById('session-subject').value,
    status: document.getElementById('session-status').value,
    completion: Number(document.getElementById('session-completion').value),
    notes: document.getElementById('session-notes').value.trim(),
    loggedAt: new Date().toISOString(),
  };
  savedSessions.unshift(session);
  try {
    localStorage.setItem('mirai-course-sessions', JSON.stringify(savedSessions));
  } catch (error) {
    console.error('Session was logged for this page, but could not be saved in this browser.', error);
  }
  if (session.status === 'Completed') {
    document.getElementById('hours-value').textContent = String(Number(document.getElementById('hours-value').textContent) + 2);
  }
  renderSubjects();
  renderSessions();
  dialog.close();
  showToast('Session saved. Your demo progress has been updated.');
});

renderSubjects();
renderWeek();
renderSessions();
