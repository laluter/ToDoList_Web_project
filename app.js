// --- 유저/비회원 데이터 관리 ---
function getUsers() { return JSON.parse(localStorage.getItem('users') || '{}'); }
function saveUsers(users) { localStorage.setItem('users', JSON.stringify(users)); }
function setCurrentUser(username) { localStorage.setItem('currentUser', username); }
function getCurrentUser() { return localStorage.getItem('currentUser') || 'guest'; }
function logoutUser() { localStorage.removeItem('currentUser'); }
function isGuest() { return !localStorage.getItem('currentUser') || getCurrentUser() === 'guest'; }

// --- 템플릿 데이터 ---
let templateData = JSON.parse(localStorage.getItem('templates') || '{}');
if (!Object.keys(templateData).length) {
  templateData = {
    worker: { name: "직장인", todos: [
      { title: "출근 준비", category: "작업", memo: "", deadline: "", repeat: "daily" },
      { title: "이메일 확인", category: "작업", memo: "", deadline: "", repeat: "daily" },
      { title: "업무 리스트 작성", category: "작업", memo: "", deadline: "", repeat: "daily" },
      { title: "점심시간", category: "개인적인", memo: "", deadline: "", repeat: "daily" },
      { title: "퇴근 후 운동", category: "개인적인", memo: "", deadline: "", repeat: "weekly" }
    ]},
    student: { name: "학생", todos: [
      { title: "수업 듣기", category: "작업", memo: "", deadline: "", repeat: "daily" },
      { title: "과제 제출", category: "작업", memo: "", deadline: "", repeat: "weekly" },
      { title: "시험 공부", category: "작업", memo: "", deadline: "", repeat: "monthly" },
      { title: "동아리 활동", category: "개인적인", memo: "", deadline: "", repeat: "weekly" },
      { title: "친구와 약속", category: "개인적인", memo: "", deadline: "", repeat: "none" }
    ]},
    owl: { name: "올빼미형", todos: [
      { title: "야간 운동", category: "개인적인", memo: "", deadline: "", repeat: "daily" },
      { title: "밤샘 프로젝트", category: "작업", memo: "", deadline: "", repeat: "none" },
      { title: "야식 챙기기", category: "개인적인", memo: "", deadline: "", repeat: "daily" },
      { title: "새벽 독서", category: "위시리스트", memo: "", deadline: "", repeat: "weekly" }
    ]}
  };
  localStorage.setItem('templates', JSON.stringify(templateData));
}
function saveTemplates() { localStorage.setItem('templates', JSON.stringify(templateData)); }

// --- 앱 데이터 상태 ---
let categories = [];
let selectedCategory = 'all';
let tasks = [];
let modalCategory = "";
let modalMemo = '', modalDeadlineDate = '', modalDeadlineTime = '', modalRepeat = 'none';

// --- 템플릿 UI 상태 ---
let selectedTpl = null;
let tplTodos = [];
let tplDetailIdx = null;

// --- 템플릿 관리 모달 상태 ---
let editingTemplateKey = null;
let editingTodoIdx = null;

// --- 메인에서 템플릿 선택 상태 ---
let mainSelectedTpl = null;
let mainTplTodos = [];

// --- 템플릿 화면 렌더링 및 이벤트 ---
function renderTemplateSelect() {
  const templateSelect = document.getElementById('template-select');
  templateSelect.innerHTML = '';
  
  // 기본 템플릿 버튼들 추가
  Object.keys(templateData).forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'template-btn';
    btn.dataset.tpl = key;
    btn.textContent = templateData[key].name;
    templateSelect.appendChild(btn);
  });
  
  // 템플릿 추가 버튼
  const addBtn = document.createElement('button');
  addBtn.id = 'add-template-btn';
  addBtn.className = 'template-btn';
  addBtn.textContent = '+ 템플릿 추가';
  templateSelect.appendChild(addBtn);

  document.querySelectorAll('.template-btn').forEach(btn=>{
    btn.classList.remove('selected');
    if (btn.dataset.tpl) btn.onclick = function() {
      selectedTpl = btn.dataset.tpl;
      document.querySelectorAll('.template-btn').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      renderTemplatePreview();
    }
  });
  
  document.getElementById('add-template-btn').onclick = () => {
    editingTemplateKey = null;
    document.getElementById('templateNameInput').value = '';
    document.getElementById('addTemplateBtn').style.display = '';
    document.getElementById('editTemplateBtn').style.display = 'none';
    document.getElementById('templateTodoList').innerHTML = '';
    renderTemplateList();
    document.getElementById('templateManageModalBg').classList.add('show');
  };
  
  selectedTpl = null;
  tplTodos = [];
  document.getElementById('template-preview').innerHTML = '';
  document.getElementById('template-actions').style.display = 'none';
}

function renderTemplatePreview() {
  if (!selectedTpl || !templateData[selectedTpl]) return;
  tplTodos = templateData[selectedTpl].todos.map(todo => ({
    ...todo,
    checked: true,
    memo: todo.memo || "",
    deadline: todo.deadline || "",
    repeat: todo.repeat || "none"
  }));
  let html = `<div class="template-todo-list">`;
  tplTodos.forEach((todo, idx) => {
    html += `
      <div class="tpl-todo-item" data-idx="${idx}">
        <input type="checkbox" class="tpl-todo-check" ${todo.checked ? "checked" : ""}>
        <span class="tpl-todo-title">${todo.title}</span>
        <span class="tpl-todo-meta">${todo.repeat !== "none" ? "반복:" + repeatKor(todo.repeat) : ""}</span>
        <button class="tpl-todo-edit-btn">수정</button>
        <button class="tpl-todo-delete-btn">삭제</button>
        ${todo.memo ? `<span class="tpl-todo-memo">메모: ${todo.memo}</span>` : ""}
        ${todo.deadline ? `<span class="tpl-todo-meta">마감: ${todo.deadline}</span>` : ""}
      </div>
    `;
  });
  html += `</div>`;
  html += `<button class="add-todo-to-template-btn">+ To-Do 추가</button>`;
  document.getElementById('template-preview').innerHTML = html;
  document.getElementById('template-actions').style.display = '';

  document.querySelectorAll('.tpl-todo-check').forEach((cb, i) => {
    cb.onchange = function() { tplTodos[i].checked = cb.checked; }
  });

  document.querySelectorAll('.tpl-todo-edit-btn').forEach((btn, i) => {
    btn.onclick = function() {
      editingTodoIdx = i;
      openTplTodoEditModal();
    }
  });
  document.querySelectorAll('.tpl-todo-delete-btn').forEach((btn, i) => {
    btn.onclick = function() {
      if (confirm('이 To-Do를 삭제하시겠습니까?')) {
        tplTodos.splice(i, 1);
        templateData[selectedTpl].todos = tplTodos;
        saveTemplates();
        renderTemplatePreview();
      }
    }
  });
  document.querySelector('.add-todo-to-template-btn').onclick = function() {
    editingTodoIdx = null;
    openTplTodoEditModal();
  };
}

function repeatKor(val) {
  switch(val) {
    case "daily": return "매일";
    case "weekly": return "매주";
    case "monthly": return "매월";
    default: return "없음";
  }
}

// --- 템플릿 관리 모달 ---
function renderTemplateList() {
  const list = document.getElementById('templateList');
  list.innerHTML = '';
  Object.keys(templateData).forEach(key => {
    const item = document.createElement('div');
    item.className = 'template-list-item';
    item.innerHTML = `
      <span>${templateData[key].name}</span>
      <div>
        <button class="edit-template-btn" data-key="${key}">수정</button>
        <button class="delete-template-btn" data-key="${key}">삭제</button>
      </div>
    `;
    list.appendChild(item);
  });
document.querySelectorAll('.edit-template-btn').forEach(btn => {
  btn.onclick = function() {
    editingTemplateKey = btn.dataset.key;
    document.getElementById('templateNameInput').value = templateData[editingTemplateKey].name;
    tplTodos = (templateData[editingTemplateKey].todos || []).map(todo => ({
      ...todo,
      checked: true,
      memo: todo.memo || "",
      deadline: todo.deadline || "",
      repeat: todo.repeat || "none"
    }));
    renderTemplateTodoList();
    document.getElementById('addTemplateBtn').style.display = 'none';
    document.getElementById('editTemplateBtn').style.display = '';
  };
});

  document.querySelectorAll('.delete-template-btn').forEach(btn => {
    btn.onclick = function() {
      if (confirm(`"${templateData[btn.dataset.key].name}" 템플릿을 삭제하시겠습니까?`)) {
        delete templateData[btn.dataset.key];
        saveTemplates();
        renderTemplateList();
        renderTemplateSelect();
      }
    };
  });
}

function renderTemplateTodoList() {
  const list = document.getElementById('templateTodoList');
  list.innerHTML = '';
  if (!editingTemplateKey) return;

  // tplTodos 동기화 (수정된 부분!)
  tplTodos = (templateData[editingTemplateKey].todos || []).map(todo => ({
    ...todo,
    checked: true,
    memo: todo.memo || "",
    deadline: todo.deadline || "",
    repeat: todo.repeat || "none"
  }));

  tplTodos.forEach((todo, idx) => {
    const item = document.createElement('div');
    item.className = 'template-todo-item';
    item.innerHTML = `
      <div style="flex: 1;">
        <div style="font-weight: 500;">${todo.title}</div>
        <div style="font-size: 0.9em; color: #666; margin-top: 4px;">
          카테고리: ${todo.category}
          ${todo.memo ? ` | 메모: ${todo.memo.substring(0, 20)}${todo.memo.length > 20 ? '...' : ''}` : ''}
          ${todo.deadline ? ` | 마감: ${todo.deadline}` : ''}
          ${todo.repeat && todo.repeat !== 'none' ? ` | 반복: ${repeatKor(todo.repeat)}` : ''}
        </div>
      </div>
      <div>
        <button class="edit-todo-btn" data-idx="${idx}">수정</button>
        <button class="delete-todo-btn" data-idx="${idx}">삭제</button>
      </div>
    `;
    list.appendChild(item);
  });
  
  // 기존 이벤트 핸들러들
  document.querySelectorAll('.edit-todo-btn').forEach(btn => {
    btn.onclick = function() {
      const idx = parseInt(btn.dataset.idx);
      editingTodoIdx = idx;
      openTplTodoEditModal();
    };
  });
  
  document.querySelectorAll('.delete-todo-btn').forEach(btn => {
    btn.onclick = function() {
      if (confirm('이 To-Do를 삭제하시겠습니까?')) {
        templateData[editingTemplateKey].todos.splice(parseInt(btn.dataset.idx), 1);
        saveTemplates();
        renderTemplateTodoList();
      }
    };
  });
}

document.getElementById('addTemplateBtn').onclick = function() {
  const name = document.getElementById('templateNameInput').value.trim();
  if (!name) return alert('템플릿 이름을 입력하세요.');
  const key = 'tpl_' + Date.now();
  templateData[key] = { name, todos: [] };
  editingTemplateKey = key;
  saveTemplates();
  renderTemplateList();
  renderTemplateTodoList();
  document.getElementById('addTemplateBtn').style.display = 'none';
  document.getElementById('editTemplateBtn').style.display = '';
};

document.getElementById('editTemplateBtn').onclick = function() {
  if (!editingTemplateKey) return;
  const name = document.getElementById('templateNameInput').value.trim();
  if (!name) return alert('템플릿 이름을 입력하세요.');
  templateData[editingTemplateKey].name = name;
  saveTemplates();
  renderTemplateList();
  renderTemplateSelect();
};

document.getElementById('addTodoToTemplateBtn').onclick = function() {
  if (!editingTemplateKey) return;
  const title = prompt('To-Do 제목을 입력하세요.');
  if (!title) return;
  const category = prompt('카테고리를 입력하세요.');
  if (!category) return;
  templateData[editingTemplateKey].todos.push({
    title, category, memo: "", deadline: "", repeat: "none"
  });
  saveTemplates();
  renderTemplateTodoList();
};

document.getElementById('closeTemplateManageModal').onclick = function() {
  document.getElementById('templateManageModalBg').classList.remove('show');
};

// 메인 페이지에서 템플릿 관리 모달 오픈
document.getElementById('edit-templates-btn').onclick = function() {
  // 실제 템플릿 관리 모달 열기
  editingTemplateKey = null;
  document.getElementById('templateNameInput').value = '';
  document.getElementById('addTemplateBtn').style.display = '';
  document.getElementById('editTemplateBtn').style.display = 'none';
  document.getElementById('templateTodoList').innerHTML = '';
  renderTemplateList();
  document.getElementById('templateManageModalBg').classList.add('show');
};

// 템플릿 관리 모달에서 템플릿 선택 모달 열기
document.getElementById('openMainTemplateSelectBtn').onclick = function() {
  renderMainTemplateSelectList();
  document.getElementById('mainTemplateSelectModalBg').classList.add('show');
};

// --- 메인에서 템플릿 선택 및 추가 기능 ---
function renderMainTemplateSelectList() {
  const list = document.getElementById('mainTemplateSelectList');
  list.innerHTML = '';
  
  Object.keys(templateData).forEach(key => {
    const item = document.createElement('div');
    item.className = 'template-list-item';
    item.innerHTML = `
      <span>${templateData[key].name}</span>
      <div>
        <button class="select-template-btn" data-key="${key}">선택</button>
      </div>
    `;
    list.appendChild(item);
  });
  
  document.querySelectorAll('.select-template-btn').forEach(btn => {
    btn.onclick = function() {
      mainSelectedTpl = btn.dataset.key;
      renderMainTemplatePreview();
      // 선택된 버튼 스타일 업데이트
      document.querySelectorAll('.select-template-btn').forEach(b => {
        b.textContent = '선택';
        b.style.background = '#4285f4';
      });
      btn.textContent = '선택됨';
      btn.style.background = '#28a745';
    };
  });
  
  // 초기화
  mainSelectedTpl = null;
  mainTplTodos = [];
  document.getElementById('mainTemplatePreview').innerHTML = '';
  document.getElementById('applyMainTemplateBtn').style.display = 'none';
}

function renderMainTemplatePreview() {
  if (!mainSelectedTpl || !templateData[mainSelectedTpl]) return;
  
  mainTplTodos = templateData[mainSelectedTpl].todos.map(todo => ({
    ...todo,
    checked: true,
    memo: todo.memo || "",
    deadline: todo.deadline || "",
    repeat: todo.repeat || "none"
  }));
  
  let html = `<h4>${templateData[mainSelectedTpl].name} 템플릿</h4>`;
  html += `<div class="template-todo-list">`;
  
  mainTplTodos.forEach((todo, idx) => {
    html += `
      <div class="tpl-todo-item" data-idx="${idx}">
        <input type="checkbox" class="main-tpl-todo-check" ${todo.checked ? "checked" : ""}>
        <span class="tpl-todo-title">${todo.title}</span>
        <span class="tpl-todo-meta">(${todo.category})</span>
        ${todo.repeat !== "none" ? `<span class="tpl-todo-meta">반복: ${repeatKor(todo.repeat)}</span>` : ""}
        ${todo.memo ? `<div class="tpl-todo-memo">메모: ${todo.memo}</div>` : ""}
        ${todo.deadline ? `<div class="tpl-todo-meta">마감: ${todo.deadline}</div>` : ""}
      </div>
    `;
  });
  
  html += `</div>`;
  document.getElementById('mainTemplatePreview').innerHTML = html;
  document.getElementById('applyMainTemplateBtn').style.display = '';
  
  // 체크박스 이벤트 추가
  document.querySelectorAll('.main-tpl-todo-check').forEach((cb, i) => {
    cb.onchange = function() { 
      mainTplTodos[i].checked = cb.checked; 
    }
  });
}

// 메인에서 템플릿 적용 버튼
document.getElementById('applyMainTemplateBtn').onclick = function() {
  const selected = mainTplTodos.filter(t => t.checked);
  if (!selected.length) {
    alert('추가할 항목을 선택하세요!');
    return;
  }
  
  const user = getCurrentUser();
  const users = getUsers();
  if (!users[user]) {
    users[user] = {
      password: "",
      categories: ["작업", "개인적인", "위시리스트"],
      tasks: []
    };
  }
  
  let addedCount = 0;
  selected.forEach(todo => {
    // 카테고리가 존재하지 않으면 추가
    if (!categories.includes(todo.category)) {
      categories.push(todo.category);
    }
    
    users[user].tasks.push({
      id: Date.now() + Math.floor(Math.random()*10000),
      title: todo.title,
      category: todo.category,
      memo: todo.memo,
      deadline: todo.deadline || "미설정",
      repeat: todo.repeat,
      done: false
    });
    addedCount++;
  });
  
  saveUsers(users);
  loadUserData();
  renderCategories();
  renderCatSelect();
  renderTasks();
  
  alert(`${addedCount}개의 할 일이 추가되었습니다!`);
  document.getElementById('mainTemplateSelectModalBg').classList.remove('show');
};

// 메인 템플릿 선택 모달 닫기
document.getElementById('closeMainTemplateSelectModal').onclick = function() {
  document.getElementById('mainTemplateSelectModalBg').classList.remove('show');
};

// --- 템플릿 To-Do 편집 모달 ---
function openTplTodoEditModal() {
  const modal = document.getElementById('tplTodoEditModalBg');
  if (editingTodoIdx !== null) {
    // 수정 모드
    const todo = tplTodos[editingTodoIdx];
    document.getElementById('tpl-todo-title').value = todo.title;
    document.getElementById('tpl-todo-category').value = todo.category;
    document.getElementById('tpl-todo-memo').value = todo.memo || "";
    document.getElementById('tpl-todo-deadline-date').value = todo.deadline ? (todo.deadline.split(' ')[0] || "") : "";
    document.getElementById('tpl-todo-deadline-time').value = todo.deadline ? (todo.deadline.split(' ')[1] || "") : "";
    document.getElementById('tpl-todo-repeat').value = todo.repeat || "none";
    document.getElementById('tpl-todo-modal-title').textContent = 'To-Do 수정';
  } else {
    // 추가 모드
    document.getElementById('tpl-todo-title').value = '';
    document.getElementById('tpl-todo-category').value = '작업';
    document.getElementById('tpl-todo-memo').value = '';
    document.getElementById('tpl-todo-deadline-date').value = '';
    document.getElementById('tpl-todo-deadline-time').value = '';
    document.getElementById('tpl-todo-repeat').value = 'none';
    document.getElementById('tpl-todo-modal-title').textContent = 'To-Do 추가';
  }
  modal.classList.add('show');
}

document.getElementById('saveTplTodoBtn').onclick = function() {
  const title = document.getElementById('tpl-todo-title').value.trim();
  const category = document.getElementById('tpl-todo-category').value.trim();
  const memo = document.getElementById('tpl-todo-memo').value;
  const date = document.getElementById('tpl-todo-deadline-date').value;
  const time = document.getElementById('tpl-todo-deadline-time').value;
  const deadline = (date && time) ? (date + " " + time) : "";
  const repeat = document.getElementById('tpl-todo-repeat').value;

  if (!title) return alert('제목을 입력하세요.');
  if (!category) return alert('카테고리를 입력하세요.');

  const todoData = { title, category, memo, deadline, repeat };

  if (editingTodoIdx !== null) {
    // 수정
    tplTodos[editingTodoIdx] = { ...tplTodos[editingTodoIdx], ...todoData };
  } else {
    // 추가
    tplTodos.push({ ...todoData, checked: true });
  }

  templateData[selectedTpl].todos = tplTodos;
  saveTemplates();
  renderTemplatePreview();
  document.getElementById('tplTodoEditModalBg').classList.remove('show');
};

document.getElementById('closeTplTodoEditModal').onclick = function() {
  document.getElementById('tplTodoEditModalBg').classList.remove('show');
};

// --- 템플릿 세부설정 모달 ---
const tplDetailModalBg = document.getElementById('tplDetailModalBg');
function openTplDetailModal() {
  if (tplDetailIdx == null || !tplTodos[tplDetailIdx]) return;
  const todo = tplTodos[tplDetailIdx];
  document.getElementById('tpl-detail-title').innerText = todo.title;
  document.getElementById('tpl-modal-memo').value = todo.memo || "";
  document.getElementById('tpl-modal-deadline-date').value = todo.deadline ? (todo.deadline.split(' ')[0] || "") : "";
  document.getElementById('tpl-modal-deadline-time').value = todo.deadline ? (todo.deadline.split(' ')[1] || "") : "";
  document.getElementById('tpl-modal-repeat').value = todo.repeat || "none";
  tplDetailModalBg.classList.add('show');
}

document.getElementById('closeTplDetailModal').onclick = function() {
  if (tplDetailIdx == null || !tplTodos[tplDetailIdx]) {
    tplDetailModalBg.classList.remove('show');
    return;
  }
  tplTodos[tplDetailIdx].memo = document.getElementById('tpl-modal-memo').value;
  const date = document.getElementById('tpl-modal-deadline-date').value;
  const time = document.getElementById('tpl-modal-deadline-time').value;
  tplTodos[tplDetailIdx].deadline = (date && time) ? (date + " " + time) : "";
  tplTodos[tplDetailIdx].repeat = document.getElementById('tpl-modal-repeat').value;
  templateData[selectedTpl].todos = tplTodos;
  saveTemplates();
  tplDetailModalBg.classList.remove('show');
  renderTemplatePreview();
};

// --- 템플릿 적용 및 건너뛰기 ---
document.getElementById('apply-template-btn').onclick = function() {
  const selected = tplTodos.filter(t => t.checked);
  if (!selected.length) {
    alert('추가할 항목을 선택하세요!');
    return;
  }
  const user = getCurrentUser();
  const users = getUsers();
  if (!users[user]) {
    users[user] = {
      password: "",
      categories: ["작업", "개인적인", "위시리스트"],
      tasks: []
    };
  }
  selected.forEach(todo => {
    users[user].tasks.push({
      id: Date.now() + Math.floor(Math.random()*10000),
      title: todo.title,
      category: todo.category,
      memo: todo.memo,
      deadline: todo.deadline || "미설정",
      repeat: todo.repeat,
      done: false
    });
  });
  saveUsers(users);
  loadUserData();
  showApp();
  renderCategories();
  renderCatSelect();
  renderTasks();
};



// --- 로그인/회원가입 모달 ---
const loginModalBg = document.getElementById('loginModalBg');
document.getElementById('login-modal-btn').onclick = function() {
  loginModalBg.classList.add('show');
  showLoginSection();
};
document.getElementById('closeLoginModal').onclick = function() {
  loginModalBg.classList.remove('show');
};

function showLoginSection() {
  document.getElementById('login-section').style.display = '';
  document.getElementById('register-section').style.display = 'none';
}
function showRegisterSection() {
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('register-section').style.display = '';
}

document.getElementById('goto-register-btn').onclick = showRegisterSection;
document.getElementById('back-to-login-btn').onclick = showLoginSection;

document.getElementById('login-btn').onclick = function() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const users = getUsers();
  if (!users[username] || users[username].password !== password) {
    document.getElementById('login-error').innerText = '아이디 또는 비밀번호가 올바르지 않습니다.';
    return;
  }
  setCurrentUser(username);
  document.getElementById('login-error').innerText = '';
  loginModalBg.classList.remove('show');
  loadUserData();
  showApp();
  renderCategories();
  renderCatSelect();
  renderTasks();
  updateLoginUI();
};

document.getElementById('register-btn').onclick = function() {
  const username = document.getElementById('register-username').value.trim();
  const password = document.getElementById('register-password').value;
  const password2 = document.getElementById('register-password2').value;
  const users = getUsers();
  if (!username || !password) {
    document.getElementById('register-error').innerText = '아이디와 비밀번호를 입력하세요.';
    return;
  }
  if (users[username]) {
    document.getElementById('register-error').innerText = '이미 존재하는 아이디입니다.';
    return;
  }
  if (password !== password2) {
    document.getElementById('register-error').innerText = '비밀번호가 일치하지 않습니다.';
    return;
  }
  users[username] = {
    password,
    categories: ["작업", "개인적인", "위시리스트"],
    tasks: []
  };
  saveUsers(users);
  document.getElementById('register-error').innerText = '';
  alert('회원가입이 완료되었습니다. 로그인 해주세요.');
  showLoginSection();
};

document.getElementById('logout-btn').onclick = function() {
  logoutUser();
  updateLoginUI();
  loadUserData();
  showApp();
  renderCategories();
  renderCatSelect();
  renderTasks();
};

// --- 유저별 데이터 로드/저장 ---
function loadUserData() {
  const user = getCurrentUser();
  const users = getUsers();
  if (!users[user]) {
    users[user] = {
      password: "",
      categories: ["작업", "개인적인", "위시리스트"],
      tasks: []
    };
    saveUsers(users);
  }
  categories = users[user].categories || ["작업", "개인적인", "위시리스트"];
  tasks = users[user].tasks || [];
  selectedCategory = 'all';
  modalCategory = categories[0] || "";
  modalMemo = ''; modalDeadlineDate = ''; modalDeadlineTime = ''; modalRepeat = 'none';
}

function updateLoginUI() {
  const user = getCurrentUser();
  if (isGuest()) {
    document.getElementById('user-info').innerText = '비회원 모드';
    document.getElementById('login-modal-btn').style.display = '';
    document.getElementById('logout-btn').style.display = 'none';
  } else {
    document.getElementById('user-info').innerText = user + '님';
    document.getElementById('login-modal-btn').style.display = 'none';
    document.getElementById('logout-btn').style.display = '';
  }
}

// --- 카테고리 렌더링 ---
function renderCategories() {
  const btns = ['<button class="category-btn'+(selectedCategory=='all'?' active':'')+'" data-cat="all">모두</button>'];
  categories.forEach(cat=>{
    btns.push(`<button class="category-btn${selectedCategory==cat?' active':''}" data-cat="${cat}">${cat}</button>`);
  });
  document.getElementById('categoryBtns').innerHTML = btns.join('');
  document.querySelectorAll('.category-btn').forEach(btn=>{
    btn.onclick = function() {
      document.querySelectorAll('.category-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selectedCategory = btn.dataset.cat;
      renderTasks();
    };
  });
}

// --- 카테고리 관리 ---
const catModalBg = document.getElementById('catModalBg');
document.getElementById('openCatModal').onclick = ()=>{ renderCatEditList(); catModalBg.classList.add('show'); };
document.getElementById('closeCatModal').onclick = ()=>{ catModalBg.classList.remove('show'); };

function renderCatEditList() {
  const ul = document.getElementById('catEditList');
  ul.innerHTML = '';
  categories.forEach((cat, idx)=>{
    const li = document.createElement('li');
    li.className = 'cat-edit-item';
    li.innerHTML = `
      <input class="cat-edit-input" value="${cat}">
      <button class="cat-edit-save-btn">저장</button>
      <button class="cat-del-btn">삭제</button>
    `;
    li.querySelector('.cat-edit-save-btn').onclick = ()=>{
      const v = li.querySelector('.cat-edit-input').value.trim();
      if (v && !categories.includes(v)) {
        categories[idx] = v;
        saveUserData();
        renderCatEditList(); renderCategories(); renderCatSelect();
      }
    };
    li.querySelector('.cat-del-btn').onclick = ()=>{
      if(categories.length <= 1) {
        alert('카테고리는 최소 1개는 있어야 합니다.');
        return;
      }
      if (categories[idx] === modalCategory) {
        modalCategory = categories.find((_,i)=>i!==idx) || "";
      }
      categories.splice(idx,1);
      saveUserData();
      renderCatEditList(); renderCategories(); renderCatSelect();
    };
    ul.appendChild(li);
  });
}

document.getElementById('addCatBtn').onclick = ()=>{
  const input = document.getElementById('catAddInput');
  const val = input.value.trim();
  if (val && !categories.includes(val)) {
    categories.push(val);
    input.value = '';
    saveUserData();
    renderCatEditList(); renderCategories(); renderCatSelect();
  }
};

function saveUserData() {
  const user = getCurrentUser();
  const users = getUsers();
  if (!users[user]) return;
  users[user].categories = categories;
  users[user].tasks = tasks;
  saveUsers(users);
}

// --- 할 일 추가/수정시 카테고리 선택 ---
function renderCatSelect() {
  const sel = document.getElementById('modalCatSelect');
  sel.innerHTML = categories.map(cat=>`<button class="cat-mini-btn${modalCategory==cat?' selected':''}" data-cat="${cat}">${cat}</button>`).join('');
  if (!categories.includes(modalCategory)) {
    modalCategory = categories[0] || "";
  }
  document.querySelectorAll('.cat-mini-btn').forEach(btn=>{
    if (btn.dataset.cat === modalCategory) btn.classList.add('selected');
    btn.onclick = function(){
      document.querySelectorAll('.cat-mini-btn').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      modalCategory = btn.dataset.cat;
    };
  });
}

// --- 할 일 추가 모달 ---
const addModalBg = document.getElementById('addModalBg');
const detailModalBg = document.getElementById('detailModalBg');

document.getElementById('openAddModal').onclick = ()=>{
  renderCatSelect();
  addModalBg.classList.add('show');
  document.getElementById('modal-title').value = '';
  document.getElementById('modal-memo').value = '';
  document.getElementById('modal-deadline-date').value = '';
  document.getElementById('modal-deadline-time').value = '';
  document.getElementById('modal-repeat').value = 'none';
  modalCategory = categories[0] || '';
  modalMemo = ''; modalDeadlineDate = ''; modalDeadlineTime = ''; modalRepeat = 'none';
};

document.getElementById('closeAddModal').onclick = ()=>{ addModalBg.classList.remove('show'); };

document.getElementById('openDetail').onclick = ()=>{
  detailModalBg.classList.add('show');
  document.getElementById('modal-memo').value = modalMemo;
  document.getElementById('modal-deadline-date').value = modalDeadlineDate;
  document.getElementById('modal-deadline-time').value = modalDeadlineTime;
  document.getElementById('modal-repeat').value = modalRepeat;
};

document.getElementById('closeDetailModal').onclick = ()=>{
  modalMemo = document.getElementById('modal-memo').value;
  modalDeadlineDate = document.getElementById('modal-deadline-date').value;
  modalDeadlineTime = document.getElementById('modal-deadline-time').value;
  modalRepeat = document.getElementById('modal-repeat').value;
  detailModalBg.classList.remove('show');
};

document.getElementById('addTaskBtn').onclick = ()=>{
  const title = document.getElementById('modal-title').value.trim();
  if (!title) return alert('제목을 입력하세요!');
  if (!modalCategory || !categories.includes(modalCategory)) {
    if (!categories.length) {
      alert('카테고리가 없습니다. 카테고리를 먼저 추가해 주세요!');
      return;
    }
    modalCategory = categories[0];
  }
  const deadline = (modalDeadlineDate && modalDeadlineTime)
    ? `${modalDeadlineDate} ${modalDeadlineTime}` : '미설정';
  const newTask = {
    id: Date.now(),
    title,
    category: modalCategory,
    memo: modalMemo,
    deadline,
    repeat: modalRepeat,
    done: false
  };
  tasks.push(newTask);
  saveUserData();
  renderTasks();
  addModalBg.classList.remove('show');
  document.getElementById('modal-title').value = '';
  modalMemo = ''; modalDeadlineDate = ''; modalDeadlineTime = ''; modalRepeat = 'none';
  modalCategory = categories[0] || "";
  renderCatSelect();
};

// --- 스와이프 삭제 기능 ---
function addSwipeToDelete(li, task) {
  let startX = null, swiped = false;
  li.addEventListener('touchstart', e=>{
    startX = e.touches[0].clientX;
  });
  li.addEventListener('touchmove', e=>{
    if(startX===null) return;
    let dist = e.touches[0].clientX - startX;
    if(dist < -50 && !swiped) {
      li.classList.add('swipe-delete');
      showDeleteBtn(li, task);
      swiped = true;
    }
  });
  li.addEventListener('touchend', ()=>{ startX = null; });
  li.addEventListener('mousedown', e=>{
    startX = e.clientX;
  });
  li.addEventListener('mousemove', e=>{
    if(startX===null) return;
    let dist = e.clientX - startX;
    if(dist < -50 && !swiped) {
      li.classList.add('swipe-delete');
      showDeleteBtn(li, task);
      swiped = true;
    }
  });
  li.addEventListener('mouseup', ()=>{ startX = null; });
}

function showDeleteBtn(li, task) {
  if(li.querySelector('.delete-btn')) return;
  const btn = document.createElement('button');
  btn.className = 'delete-btn';
  btn.innerText = '삭제';
  btn.onclick = e=>{
    tasks = tasks.filter(t=>t.id!==task.id);
    saveUserData();
    renderTasks();
  };
  li.appendChild(btn);
}

// --- 할 일 렌더링 ---
function renderTasks(){
  const todayStr = new Date().toISOString().slice(0,10);
  let filtered = tasks.filter(t=>!t.done && (selectedCategory=='all'||t.category==selectedCategory));
  let completed = tasks.filter(
    t => t.done && t.doneAt === todayStr && (selectedCategory=='all'||t.category==selectedCategory)
  );

  const taskList = document.getElementById('taskList');
  taskList.innerHTML = '';
  filtered.forEach(task=>{
    const li = document.createElement('li');
    li.className = 'task-item';
    li.innerHTML = `
      <span class="task-title">${task.title}</span>
      <span class="task-meta">${task.deadline}</span>
      <span class="flag">${task.category ? task.category.substring(0, 5) : ''}</span>
      <span class="task-repeat">${task.repeat && task.repeat !== "none" ? repeatKor(task.repeat) : ""}</span>
      <input type="checkbox" class="task-check" ${task.done?'checked':''}>
    `;
    li.onclick = (e) => {
      if (e.target.classList.contains('task-check')) return;
      openTaskDetailModal(task);
    };
    li.querySelector('.task-check').onclick = ()=>{
      task.done = !task.done;
      if(task.done) task.doneAt = todayStr;
      else delete task.doneAt;
      saveUserData();
      renderTasks();
    };
    addSwipeToDelete(li, task);
    taskList.appendChild(li);
  });

  const completedList = document.getElementById('completedList');
  completedList.innerHTML = '';
  completed.forEach(task=>{
    const li = document.createElement('li');
    li.className = 'task-item completed';
    li.style.position = "relative";
    li.innerHTML = `
      <span class="task-title">${task.title}</span>
      <span class="task-meta">${task.deadline}</span>
      <span class="flag">${task.category.substring(0, 5)}</span>
      <span class="task-repeat">${task.repeat && task.repeat !== "none" ? repeatKor(task.repeat) : ""}</span>
      <input type="checkbox" class="task-check" checked>
    `;
    li.querySelector('.task-check').onclick = ()=>{
      task.done = false;
      delete task.doneAt;
      saveUserData();
      renderTasks();
    };
    addSwipeToDelete(li, task);
    completedList.appendChild(li);
  });
}

// --- 상세보기 모달 ---
function openTaskDetailModal(task) {
  detailModalBg.classList.add('show');
  document.getElementById('modal-title').value = task.title;
  document.getElementById('modal-memo').value = task.memo || "";
  let date = "", time = "";
  if(task.deadline && task.deadline !== "미설정") {
    [date, time] = task.deadline.split(' ');
  }
  document.getElementById('modal-deadline-date').value = date;
  document.getElementById('modal-deadline-time').value = time;
  document.getElementById('modal-repeat').value = task.repeat || "none";
  modalCategory = task.category;
  renderCatSelect();
  
  document.getElementById('closeDetailModal').onclick = function() {
    task.title = document.getElementById('modal-title').value.trim();
    task.memo = document.getElementById('modal-memo').value;
    const d = document.getElementById('modal-deadline-date').value;
    const t = document.getElementById('modal-deadline-time').value;
    task.deadline = (d && t) ? `${d} ${t}` : '미설정';
    task.repeat = document.getElementById('modal-repeat').value;
    task.category = modalCategory;
    saveUserData();
    renderTasks();
    detailModalBg.classList.remove('show');
  }
}

// --- 화면 전환 ---
function showApp() {
  document.getElementById('template-section').style.display = 'none';
  document.getElementById('app-container').style.display = '';
  updateLoginUI();
}

function showTemplate() {
  document.getElementById('template-section').style.display = '';
  document.getElementById('app-container').style.display = 'none';
  renderTemplateSelect();
}

// --- [1] 브라우저 알림 권한 요청 ---
function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

// --- [2] 마감 체크 & 푸시알림 ---
let notifiedTaskIds = new Set();

function checkAndNotifyTasks() {
  const user = getCurrentUser();
  const users = getUsers();
  if (!users[user] || !users[user].tasks) return;

  const now = new Date();
  users[user].tasks.forEach(task => {
    if (task.deadline && task.deadline !== "미설정" && !task.done) {
      const [dateStr, timeStr] = task.deadline.split(' ');
      if (dateStr && timeStr) {
        const deadlineDate = new Date(`${dateStr}T${timeStr}`);
        const notifyTime = new Date(deadlineDate.getTime() - 5 * 60 * 1000); // 5분(300,000ms) 전

        if (!notifiedTaskIds.has(task.id)) {
          const diff = notifyTime.getTime() - now.getTime();
          // 오차범위
          if (diff <= 10000 && diff > -10000) {
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification('할 일 5분 전 알림', {
                body: `[${task.title}] 5분 뒤!`,
              });
            } else {
              alert(`[알림] "${task.title}" 5분 뒤!`);
            }
            notifiedTaskIds.add(task.id);
          }
        }
      }
    }
  });
}


// --- [3] 주기적 체크 시작 ---
setInterval(checkAndNotifyTasks, 10000); // 10초마다

// --- [4] 앱 진입 시 권한 요청 ---
window.onload = function() {
  requestNotificationPermission();
  if (typeof loadUserData === 'function') loadUserData();
};


// --- 최초 실행 ---
showTemplate();
