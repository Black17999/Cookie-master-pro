document.addEventListener('DOMContentLoaded', () => {
  const loader = document.getElementById('loader');
  const mainContent = document.getElementById('mainContent');
  const textarea = document.getElementById('cookieText');
  const copyBtn = document.getElementById('copyBtn');
  const exportHeader = document.getElementById('exportHeader');
  const exportJSON = document.getElementById('exportJSON');
  const exportNetscape = document.getElementById('exportNetscape');
  const uploadBtn = document.getElementById('uploadBtn');
  const clearBtn = document.getElementById('clearBtn');
  const cookieNamesList = document.getElementById('cookieNames');
  const siteInfo = document.getElementById('siteInfo');
  const apiInput = document.getElementById('apiInput');
  const saveApiBtn = document.getElementById('saveApiBtn');
  // 排序按钮
  const sortByPriorityBtn = document.getElementById('sortByPriority');
  const sortByOrderBtn = document.getElementById('sortByOrder');
  // 当前排序方式
  let currentSortMethod = 'priority'; // 'priority' 或 'order'

  chrome.storage.sync.get(['apiUrl'], (data) => {
    if (data.apiUrl) apiInput.value = data.apiUrl;
  });

  saveApiBtn.addEventListener('click', () => {
    chrome.storage.sync.set({ apiUrl: apiInput.value }, () => {
      alert("API 地址已保存 ✅");
    });
  });

  const init = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tabs[0].url;
    const domain = new URL(url).hostname;
    // 显示网站名称和网址在同一行
    siteInfo.textContent = `${domain} (${url})`;

    const cookies = await getAllCookies(domain);
    renderCookies(cookies, tabs[0].id);

    // 数据加载完毕，显示内容
    loader.style.display = 'none';
    mainContent.style.display = 'block';

    // 实时监听 cookie 变化
    chrome.cookies.onChanged.addListener(async () => {
        const refreshedCookies = await getAllCookies(domain);
        renderCookies(refreshedCookies, tabs[0].id);
    });
  };

  // 排序按钮事件监听
  sortByPriorityBtn.addEventListener('click', () => {
    currentSortMethod = 'priority';
    updateSortButtonStyles();
    // 重新渲染cookies
    const domain = new URL(siteInfo.textContent.split('(')[1].slice(0, -1)).hostname;
    getAllCookies(domain).then(cookies => {
      const tabs = chrome.tabs.query({ active: true, currentWindow: true });
      tabs.then(t => renderCookies(cookies, t[0].id));
    });
  });

  sortByOrderBtn.addEventListener('click', () => {
    currentSortMethod = 'order';
    updateSortButtonStyles();
    // 重新渲染cookies
    const domain = new URL(siteInfo.textContent.split('(')[1].slice(0, -1)).hostname;
    getAllCookies(domain).then(cookies => {
      const tabs = chrome.tabs.query({ active: true, currentWindow: true });
      tabs.then(t => renderCookies(cookies, t[0].id));
    });
  });

  // 更新排序按钮样式
  function updateSortButtonStyles() {
    if (currentSortMethod === 'priority') {
      sortByPriorityBtn.classList.add('active');
      sortByOrderBtn.classList.remove('active');
    } else {
      sortByPriorityBtn.classList.remove('active');
      sortByOrderBtn.classList.add('active');
    }
  }

  init();

  function renderCookies(cookies, tabId) {
    const headerString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    textarea.value = headerString;

    // 根据当前排序方式对Cookie进行排序
    let sortedCookies;
    if (currentSortMethod === 'priority') {
      // 按敏感程度排序：敏感 > 重要 > 普通
      sortedCookies = [...cookies].sort((a, b) => {
        const getPriority = (cookie) => {
          if (/session|token|auth|leaflow|remember_web/i.test(cookie.name)) return 3; // 敏感
          if (/shared_api_cookie|csrftoken/i.test(cookie.name)) return 2; // 重要
          return 1; // 普通
        };
        
        return getPriority(b) - getPriority(a);
      });
    } else {
      // 按获取顺序排序（保持原始顺序）
      sortedCookies = [...cookies];
    }

    cookieNamesList.innerHTML = sortedCookies.map(c => {
      const cls = /session|token|auth|leaflow|remember_web/i.test(c.name)
        ? "sensitive"
        : /shared_api_cookie|csrftoken/i.test(c.name)
        ? "important"
        : "";
      return `
        <li class="${cls}" data-cookie='${JSON.stringify(c)}'>
          <span class="cookie-name">${c.name}</span>
          <span class="cookie-value">${c.value}</span>
          <div class="cookie-actions">
            <span class="edit-cookie" data-cookie='${JSON.stringify(c)}'>编辑</span>
            <span class="delete-cookie" data-cookie='${JSON.stringify(c)}'>删除</span>
            <span class="copy-small" data-value="${c.value}">复制</span>
          </div>
        </li>
      `;
    }).join('');

    cookieNamesList.querySelectorAll(".copy-small").forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.dataset.value);
        btn.textContent = "已复制";
        setTimeout(() => btn.textContent = "复制", 1500);
      });
    });

    // 为编辑按钮添加事件监听器
    cookieNamesList.querySelectorAll(".edit-cookie").forEach(btn => {
      btn.addEventListener('click', (event) => {
        const cookie = JSON.parse(event.target.dataset.cookie);
        openEditCookieModal(cookie);
      });
    });

    // 为删除按钮添加事件监听器
    cookieNamesList.querySelectorAll(".delete-cookie").forEach(btn => {
      btn.addEventListener('click', (event) => {
        const cookie = JSON.parse(event.target.dataset.cookie);
        openDeleteConfirmModal(cookie);
      });
    });

    exportHeader.onclick = () => downloadFile("cookies.txt", headerString);
    exportJSON.onclick = () => downloadFile("cookies.json", JSON.stringify(cookies, null, 2));
    exportNetscape.onclick = () => {
      const lines = ["# Netscape HTTP Cookie File", ""];
      cookies.forEach(c => {
        lines.push([c.domain, c.hostOnly?"FALSE":"TRUE", c.path, c.secure?"TRUE":"FALSE", c.expirationDate?Math.floor(c.expirationDate):0, c.name, c.value].join("\t"));
      });
      downloadFile("cookies_netscape.txt", lines.join("\n"));
    };

    uploadBtn.onclick = async () => {
      if (!apiInput.value) return alert("请先输入 API 地址");
      const res = await fetch(apiInput.value, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cookies)
      });
      const txt = await res.text();
      alert("上传完成: " + txt);
    };

    clearBtn.onclick = async () => {
      textarea.value = "清除中...";
      const removePromises = cookies.map(c => {
        const url = `http${c.secure ? "s" : ""}://${c.domain}${c.path}`;
        return chrome.cookies.remove({ url: url, name: c.name });
      });
      await Promise.all(removePromises);
      chrome.tabs.reload(tabId);
    };

    copyBtn.onclick = () => {
      textarea.select();
      document.execCommand('copy');
      copyBtn.textContent = "已复制!";
      setTimeout(() => copyBtn.textContent = "复制 Header", 1500);
    };
  }

  async function getAllCookies(domain) {
    const baseDomain = domain.split('.').slice(-2).join('.');
    const relatedDomains = [domain, baseDomain, `login.${baseDomain}`];
    const cookiePromises = relatedDomains.map(d => chrome.cookies.getAll({ domain: d }));
    const results = await Promise.all(cookiePromises);
    let allCookies = results.flat();
    const map = new Map();
    allCookies.forEach(c => map.set(c.name + c.domain, c));
    return Array.from(map.values());
  }

  function downloadFile(filename, content) {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 导入Cookie功能
  const importBtn = document.getElementById('importBtn');
  const importModal = document.getElementById('importModal');
  const closeImportModal = document.querySelector('#importModal .close');
  const cancelImportBtn = document.getElementById('cancelImportBtn');
  const importModeRadios = document.getElementsByName('importMode');
  const textImportArea = document.getElementById('textImportArea');
  const fileImportArea = document.getElementById('fileImportArea');
  const selectFileBtn = document.getElementById('selectFileBtn');
  const fileInput = document.getElementById('fileInput');
  const fileName = document.getElementById('fileName');
  const confirmImportBtn = document.getElementById('confirmImportBtn');

  // 显示导入模态框
  importBtn.addEventListener('click', () => {
    importModal.style.display = 'flex';
    
    // 滚动到模态框顶部
    const modalContent = importModal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  });

  // 关闭导入模态框
  closeImportModal.addEventListener('click', () => {
    importModal.style.display = 'none';
  });

  cancelImportBtn.addEventListener('click', () => {
    importModal.style.display = 'none';
  });

  // 点击模态框外部关闭
  window.addEventListener('click', (event) => {
    if (event.target === importModal) {
      importModal.style.display = 'none';
    }
  });

  // 导入模式切换
  importModeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      if (this.value === 'text') {
        textImportArea.style.display = 'block';
        fileImportArea.style.display = 'none';
      } else {
        textImportArea.style.display = 'none';
        fileImportArea.style.display = 'block';
      }
    });
  });

  // 文件选择
  selectFileBtn.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (event) => {
    if (event.target.files.length > 0) {
      fileName.textContent = event.target.files[0].name;
    } else {
      fileName.textContent = '未选择任何文件';
    }
  });

  // 确认导入
  confirmImportBtn.addEventListener('click', () => {
    const importMode = document.querySelector('input[name="importMode"]:checked').value;
    const url = document.getElementById('importUrl').value;
    const password = document.getElementById('decryptPassword').value;

    if (importMode === 'text') {
      const cookieValue = document.getElementById('cookieValue').value;
      // 处理文本导入逻辑
      console.log('导入文本:', cookieValue, 'URL:', url, '密码:', password);
    } else {
      const file = fileInput.files[0];
      if (file) {
        // 处理文件导入逻辑
        const reader = new FileReader();
        reader.onload = function(e) {
          console.log('导入文件内容:', e.target.result, 'URL:', url, '密码:', password);
        };
        reader.readAsText(file);
      } else {
        alert('请选择要导入的文件');
        return;
      }
    }

    // 关闭模态框
    importModal.style.display = 'none';
    // 重置表单
    document.getElementById('importUrl').value = '';
    document.getElementById('cookieValue').value = '';
    document.getElementById('decryptPassword').value = '';
    fileName.textContent = '未选择任何文件';
    fileInput.value = '';
  });
  // 添加Cookie功能
  const addCookieBtn = document.getElementById('addCookieBtn');
  const addCookieModal = document.getElementById('addCookieModal');
  const closeAddCookieModal = document.querySelector('#addCookieModal .close');
  const cancelAddCookieBtn = document.getElementById('cancelAddCookieBtn');
  const confirmAddCookieBtn = document.getElementById('confirmAddCookieBtn');
  const cookieNameInput = document.getElementById('cookieName');
  const cookieValueText = document.getElementById('cookieValueText');
  const cookieExpiration = document.getElementById('cookieExpiration');
  const cookieHttpOnly = document.getElementById('cookieHttpOnly');
  const cookieSameSite = document.getElementById('cookieSameSite');
  const cookieSecure = document.getElementById('cookieSecure');
  const nameError = document.getElementById('nameError');
  const valueError = document.getElementById('valueError');
  const clearExpirationBtn = document.getElementById('clearExpiration');
  const setToTodayBtn = document.getElementById('setToToday');

  // 显示添加Cookie模态框
  addCookieBtn.addEventListener('click', () => {
    // 重置表单
    cookieNameInput.value = '';
    cookieValueText.value = '';
    cookieExpiration.value = '';
    cookieHttpOnly.value = 'true'; // 默认是
    cookieSameSite.value = 'no_restriction'; // 默认不限制
    cookieSecure.value = 'false'; // 默认否
    nameError.textContent = '';
    valueError.textContent = '';
    confirmAddCookieBtn.disabled = true;
    
    addCookieModal.style.display = 'flex';
    
    // 滚动到模态框顶部
    const modalContent = addCookieModal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
  });

  // 关闭添加Cookie模态框
  closeAddCookieModal.addEventListener('click', () => {
    addCookieModal.style.display = 'none';
  });

  cancelAddCookieBtn.addEventListener('click', () => {
    addCookieModal.style.display = 'none';
  });

  // 点击模态框外部关闭
  window.addEventListener('click', (event) => {
    if (event.target === addCookieModal) {
      addCookieModal.style.display = 'none';
    }
  });

  // 表单验证
  function validateForm() {
    let isValid = true;
    
    // 验证名称
    const name = cookieNameInput.value.trim();
    if (!name) {
      nameError.textContent = '请输入 Cookie 名称';
      isValid = false;
    } else if (/[;\n]/.test(name)) {
      nameError.textContent = 'Cookie 名称不能包含分号或换行符';
      isValid = false;
    } else if (name.length > 256) {
      nameError.textContent = 'Cookie 名称长度不能超过256个字符';
      isValid = false;
    } else {
      nameError.textContent = '';
    }
    
    // 验证值
    const value = cookieValueText.value.trim();
    if (!value) {
      valueError.textContent = '请输入 Cookie 值';
      isValid = false;
    } else if (new Blob([value]).size > 4096) {
      valueError.textContent = 'Cookie 值大小不能超过4KB';
      isValid = false;
    } else {
      valueError.textContent = '';
    }
    
    // 验证过期时间
    const expiration = cookieExpiration.value;
    if (expiration) {
      const expirationDate = new Date(expiration);
      if (expirationDate < new Date()) {
        alert('过期时间不能早于当前时间');
        isValid = false;
      }
    }
    
    confirmAddCookieBtn.disabled = !isValid;
    return isValid;
  }

  // 输入事件监听
  cookieNameInput.addEventListener('input', validateForm);
  cookieValueText.addEventListener('input', validateForm);
  cookieExpiration.addEventListener('change', validateForm);

  // SameSite 与 Secure 联动规则
  cookieSameSite.addEventListener('change', function() {
    if (this.value === 'no_restriction' && cookieSecure.value === 'false') {
      cookieSecure.value = 'true';
      alert('选择"不限制"时必须开启 Secure');
    }
    validateForm();
  });

  // 过期时间按钮事件
  clearExpirationBtn.addEventListener('click', () => {
    cookieExpiration.value = '';
  });

  setToTodayBtn.addEventListener('click', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    cookieExpiration.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  // 确认添加Cookie
  confirmAddCookieBtn.addEventListener('click', async () => {
    if (!validateForm()) return;
    
    const cookie = {
      name: cookieNameInput.value.trim(),
      value: cookieValueText.value.trim(),
      httpOnly: cookieHttpOnly.value === 'true',
      sameSite: cookieSameSite.value,
      secure: cookieSecure.value === 'true'
    };
    
    // 处理过期时间
    if (cookieExpiration.value) {
      const expirationDate = new Date(cookieExpiration.value);
      cookie.expirationDate = Math.floor(expirationDate.getTime() / 1000);
    }
    
    // 获取当前标签页URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tabs[0].url;
    
    // 发送消息到background script添加Cookie
    try {
      await chrome.runtime.sendMessage({ type: "ADD_COOKIE", payload: { cookie, url } });
      alert('Cookie 添加成功');
      addCookieModal.style.display = 'none';
    } catch (error) {
      alert('添加Cookie失败: ' + error.message);
    }
  });

  // 删除 Cookie 功能
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  const closeDeleteModal = document.querySelector('#deleteConfirmModal .close');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  let cookieToDelete = null;

  // 打开删除确认模态框
  function openDeleteConfirmModal(cookie) {
    cookieToDelete = cookie;
    deleteConfirmModal.style.display = 'flex';
  }

  // 关闭删除确认模态框
  function closeDeleteConfirmModal() {
    deleteConfirmModal.style.display = 'none';
    cookieToDelete = null;
  }

  // 删除确认模态框事件监听器
  closeDeleteModal.addEventListener('click', closeDeleteConfirmModal);
  cancelDeleteBtn.addEventListener('click', closeDeleteConfirmModal);
  window.addEventListener('click', (event) => {
    if (event.target === deleteConfirmModal) {
      closeDeleteConfirmModal();
    }
  });

  // 确认删除
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!cookieToDelete) return;
    
    try {
      // 构建 URL
      const protocol = cookieToDelete.secure ? 'https' : 'http';
      const url = `${protocol}://${cookieToDelete.domain}${cookieToDelete.path}`;
      
      // 调用 chrome.cookies.remove API
      await chrome.cookies.remove({
        url: url,
        name: cookieToDelete.name,
        storeId: cookieToDelete.storeId
      });
      
      // 关闭模态框
      closeDeleteConfirmModal();
      
      // 显示成功提示
      alert('Cookie 已删除');
      
      // 刷新 Cookie 列表
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const domain = new URL(tabs[0].url).hostname;
      const refreshedCookies = await getAllCookies(domain);
      renderCookies(refreshedCookies, tabs[0].id);
    } catch (error) {
      console.error('删除 Cookie 失败:', error);
      alert('删除 Cookie 失败: ' + error.message);
    }
  });

  // 编辑 Cookie 功能
  const editCookieModal = document.getElementById('editCookieModal');
  const closeEditModal = document.querySelector('#editCookieModal .close');
  const cancelEditCookieBtn = document.getElementById('cancelEditCookieBtn');
  const confirmEditCookieBtn = document.getElementById('confirmEditCookieBtn');
  const editCookieName = document.getElementById('editCookieName');
  const editCookieValue = document.getElementById('editCookieValue');
  const editCookieExpiration = document.getElementById('editCookieExpiration');
  const editCookiePath = document.getElementById('editCookiePath');
  const editCookieHttpOnly = document.getElementById('editCookieHttpOnly');
  const editCookieSameSite = document.getElementById('editCookieSameSite');
  const editCookieSecure = document.getElementById('editCookieSecure');
  const clearEditExpirationBtn = document.getElementById('clearEditExpiration');
  const setEditToTodayBtn = document.getElementById('setEditToToday');
  let cookieToEdit = null;

  // 打开编辑 Cookie 模态框
  function openEditCookieModal(cookie) {
    cookieToEdit = cookie;
    
    // 预填表单数据
    editCookieName.value = cookie.name;
    editCookieValue.value = cookie.value;
    editCookiePath.value = cookie.path;
    
    // 处理过期时间
    if (cookie.expirationDate) {
      const date = new Date(cookie.expirationDate * 1000);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      editCookieExpiration.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    } else {
      editCookieExpiration.value = '';
    }
    
    // 设置其他选项
    editCookieHttpOnly.value = cookie.httpOnly.toString();
    editCookieSameSite.value = cookie.sameSite;
    editCookieSecure.value = cookie.secure.toString();
    
    // 显示模态框
    editCookieModal.style.display = 'flex';
  }

  // 关闭编辑 Cookie 模态框
  function closeEditCookieModal() {
    editCookieModal.style.display = 'none';
    cookieToEdit = null;
  }

  // 编辑 Cookie 模态框事件监听器
  closeEditModal.addEventListener('click', closeEditCookieModal);
  cancelEditCookieBtn.addEventListener('click', closeEditCookieModal);
  window.addEventListener('click', (event) => {
    if (event.target === editCookieModal) {
      closeEditCookieModal();
    }
  });

  // 过期时间按钮事件
  clearEditExpirationBtn.addEventListener('click', () => {
    editCookieExpiration.value = '';
  });

  setEditToTodayBtn.addEventListener('click', () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    editCookieExpiration.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  // 确认编辑
  confirmEditCookieBtn.addEventListener('click', async () => {
    if (!cookieToEdit) return;
    
    try {
      // 构建 Cookie 对象
      const updatedCookie = {
        name: editCookieName.value,
        value: editCookieValue.value,
        path: editCookiePath.value,
        httpOnly: editCookieHttpOnly.value === 'true',
        sameSite: editCookieSameSite.value,
        secure: editCookieSecure.value === 'true'
      };
      
      // 处理过期时间
      if (editCookieExpiration.value) {
        const expirationDate = new Date(editCookieExpiration.value);
        updatedCookie.expirationDate = Math.floor(expirationDate.getTime() / 1000);
      }
      
      // 构建 URL
      const protocol = cookieToEdit.secure ? 'https' : 'http';
      const url = `${protocol}://${cookieToEdit.domain}${cookieToEdit.path}`;
      
      // 调用 chrome.cookies.set API
      await chrome.cookies.set({
        url: url,
        name: updatedCookie.name,
        value: updatedCookie.value,
        path: updatedCookie.path,
        httpOnly: updatedCookie.httpOnly,
        sameSite: updatedCookie.sameSite,
        secure: updatedCookie.secure,
        expirationDate: updatedCookie.expirationDate,
        storeId: cookieToEdit.storeId
      });
      
      // 关闭模态框
      closeEditCookieModal();
      
      // 显示成功提示
      alert('Cookie 已更新');
      
      // 刷新 Cookie 列表
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const domain = new URL(tabs[0].url).hostname;
      const refreshedCookies = await getAllCookies(domain);
      renderCookies(refreshedCookies, tabs[0].id);
    } catch (error) {
      console.error('编辑 Cookie 失败:', error);
      alert('编辑 Cookie 失败: ' + error.message);
    }
  });
});
