/* ==========================================================================
   CookieMaster Pro — 界面逻辑
   同一套代码同时服务于 popup（弹窗）与 Chrome 侧边栏两种宿主环境。
   所有面向用户的文案统一走 t()，不要硬编码在代码里。
   ========================================================================== */

// ---------- 国际化 ----------

const LOCALES = window.LOCALES || {};

const CURRENT_LANG = (() => {
  const lang = String(navigator.language || 'en').toLowerCase();
  if (lang.startsWith('zh')) return 'zh-CN';
  return 'en';
})();

function t(key, subs) {
  const dict = LOCALES[CURRENT_LANG] || {};
  let text = dict[key];
  if (text === undefined) text = (LOCALES['en'] || {})[key];
  if (text === undefined) return key;

  if (subs) {
    text = text.replace(/\{(\w+)\}/g, (whole, name) => (
      subs[name] === undefined ? whole : String(subs[name])
    ));
  }
  return text;
}

function applyI18n(root) {
  const scope = root || document;

  scope.querySelectorAll('[data-i18n]').forEach(node => {
    const text = t(node.dataset.i18n);
    if (text !== node.dataset.i18n) node.textContent = text;
  });

  scope.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });

  scope.querySelectorAll('[data-i18n-title]').forEach(node => {
    node.title = t(node.dataset.i18nTitle);
    if (!node.hasAttribute('aria-label')) node.setAttribute('aria-label', node.title);
  });
}

// ---------- 基础工具 ----------

// 常见多级公共后缀，用于准确定位「主域名」
const MULTI_LEVEL_SUFFIXES = new Set([
  'com.cn', 'net.cn', 'org.cn', 'gov.cn', 'edu.cn', 'ac.cn',
  'com.hk', 'com.tw', 'com.mo', 'com.au', 'net.au', 'org.au',
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
  'co.jp', 'ne.jp', 'or.jp', 'co.kr', 'or.kr',
  'com.sg', 'com.my', 'com.br', 'com.mx', 'com.tr', 'com.sa',
  'co.in', 'co.nz', 'co.za'
]);

function getBaseDomain(hostname) {
  if (!hostname) return hostname;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(':')) return hostname;

  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;

  const lastTwo = parts.slice(-2).join('.');
  if (MULTI_LEVEL_SUFFIXES.has(lastTwo)) return parts.slice(-3).join('.');
  return lastTwo;
}

function normalizeDomain(domain) {
  return String(domain || '').replace(/^\./, '').toLowerCase();
}

function scoreCookie(cookie, rawQuery) {
  const query = String(rawQuery || '').trim().toLowerCase();
  if (!query) return 0;

  const domain = normalizeDomain(cookie.domain);
  const name = String(cookie.name || '').toLowerCase();
  const value = String(cookie.value || '').toLowerCase();

  let score = 0;

  if (domain === query || domain.endsWith('.' + query)) score += 100;
  else if (domain.includes(query)) score += 50;

  if (name === query) score += 20;
  else if (name.includes(query)) score += 10;

  if (query.length >= 3 && value.includes(query)) score += 1;

  return score;
}

function escapeHtml(text) {
  return String(text === undefined || text === null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function highlightMatch(text, query) {
  const safe = escapeHtml(text);
  const q = String(query || '').trim();
  if (!q) return safe;

  const safeQuery = escapeHtml(q);
  const index = safe.toLowerCase().indexOf(safeQuery.toLowerCase());
  if (index === -1) return safe;

  return safe.slice(0, index)
    + '<mark>' + safe.slice(index, index + safeQuery.length) + '</mark>'
    + safe.slice(index + safeQuery.length);
}

const SENSITIVE_RE = /session|token|auth|jwt|csrf|leaflow|remember_web|password|passwd|sid/i;
const IMPORTANT_RE = /shared_api_cookie|csrftoken|uid|userid|account/i;

function getCookiePriority(cookie) {
  const name = String(cookie.name || '');
  if (SENSITIVE_RE.test(name)) return 3;
  if (IMPORTANT_RE.test(name)) return 2;
  return 1;
}

function cookieKey(cookie) {
  return [cookie.name, cookie.domain, cookie.path, cookie.storeId || ''].join('|');
}

function cookieUrl(cookie) {
  const domain = normalizeDomain(cookie.domain);
  const protocol = cookie.secure ? 'https' : 'http';
  const path = cookie.path || '/';
  return `${protocol}://${domain}${path.startsWith('/') ? path : '/' + path}`;
}

function formatExpiry(cookie) {
  if (!cookie.expirationDate) return { text: t('badgeSession'), warn: false };

  const diff = cookie.expirationDate * 1000 - Date.now();
  if (diff <= 0) return { text: t('badgeExpired'), warn: true };

  const days = Math.floor(diff / 86400000);
  if (days >= 1) return { text: t('badgeDays', { n: days }), warn: days <= 3 };

  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return { text: t('badgeHours', { n: hours }), warn: true };

  return { text: t('badgeMinutes', { n: Math.max(1, Math.floor(diff / 60000)) }), warn: true };
}

function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------- 安全审计 ----------

// 返回该 Cookie 的风险项（i18n key 数组），空数组表示没有明显问题
function auditCookie(cookie) {
  const risks = [];
  const sensitive = getCookiePriority(cookie) === 3;

  if (sensitive && !cookie.secure) risks.push('riskNoSecure');
  if (cookie.sameSite === 'no_restriction' && !cookie.secure) risks.push('riskSameSiteNone');
  if (sensitive && !cookie.httpOnly) risks.push('riskHttpOnlyOff');

  if (cookie.expirationDate) {
    const days = (cookie.expirationDate * 1000 - Date.now()) / 86400000;
    if (sensitive && days > 180) risks.push('riskSessionLong');
  } else if (sensitive) {
    risks.push('riskNoExpiry');
  }

  return risks;
}

function isRisky(cookie) {
  return auditCookie(cookie).length > 0;
}

// ---------- JWT 与编码解析 ----------

function base64UrlDecode(input) {
  let text = String(input).replace(/-/g, '+').replace(/_/g, '/');
  while (text.length % 4) text += '=';

  const binary = atob(text);
  const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

// 识别 JWT（三段式、首段以 eyJ 开头）并解出头部与载荷
function tryParseJwt(value) {
  const parts = String(value || '').split('.');
  if (parts.length !== 3 || !parts[0].startsWith('eyJ')) return null;

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    if (!payload || typeof payload !== 'object') return null;
    return { header, payload };
  } catch (error) {
    return null;
  }
}

// 只在确实包含百分号转义时才尝试解码
function tryUrlDecode(value) {
  const text = String(value || '');
  if (!/%[0-9A-Fa-f]{2}/.test(text)) return null;

  try {
    const decoded = decodeURIComponent(text.replace(/\+/g, '%20'));
    return decoded === text ? null : decoded;
  } catch (error) {
    return null;
  }
}

function formatJwtPayload(jwt) {
  const payload = jwt.payload;
  const lines = [];

  const stamp = seconds => {
    if (!seconds) return null;
    return new Date(seconds * 1000).toLocaleString();
  };

  const iat = stamp(payload.iat);
  const exp = stamp(payload.exp);
  if (iat) lines.push(`${t('jwtIssued')}: ${iat}`);
  if (exp) lines.push(`${t('jwtExpires')}: ${exp}`);
  if (payload.sub) lines.push(`${t('jwtSubject')}: ${payload.sub}`);
  if (lines.length) lines.push('');

  lines.push(JSON.stringify(payload, null, 2));
  return lines.join('\n');
}

// ---------- 请求代码生成 ----------

function cookieHeaderValue(list) {
  return list.map(c => `${c.name}=${c.value}`).join('; ');
}

function escapeForSingleQuote(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function escapeForDoubleQuote(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildCurl(url, list) {
  const header = escapeForSingleQuote(cookieHeaderValue(list));
  return [
    `curl '${escapeForSingleQuote(url)}' \\`,
    `  -H 'Cookie: ${header}' \\`,
    `  -H 'Accept: */*'`
  ].join('\n');
}

function buildFetch(url, list) {
  const header = escapeForSingleQuote(cookieHeaderValue(list));
  return [
    '// 浏览器安全策略禁止手动设置 Cookie 头，',
    '// 这段代码适合 Node 或同源调试场景参考。',
    `await fetch('${escapeForSingleQuote(url)}', {`,
    `  method: 'GET',`,
    `  credentials: 'include',`,
    `  headers: {`,
    `    'Cookie': '${header}',`,
    `    'Accept': '*/*',`,
    `  },`,
    `});`
  ].join('\n');
}

function buildPython(url, list) {
  const header = escapeForDoubleQuote(cookieHeaderValue(list));
  return [
    'import requests',
    '',
    'headers = {',
    `    "Cookie": "${header}",`,
    `    "Accept": "*/*",`,
    '}',
    '',
    `resp = requests.get("${escapeForDoubleQuote(url)}", headers=headers)`,
    'print(resp.status_code)'
  ].join('\n');
}

const CODE_BUILDERS = { curl: buildCurl, fetch: buildFetch, python: buildPython };

// ---------- 运行环境 ----------

const REPO_URL = 'https://github.com/Black17999/Cookie-master-pro';
const MAX_RENDER = 400;
const SORT_KEYS = ['priority', 'name', 'domain'];

function isExtensionEnv() {
  return typeof chrome !== 'undefined'
    && !!(chrome.cookies && chrome.tabs && chrome.runtime && chrome.runtime.id);
}

async function detectMode() {
  try {
    if (chrome.runtime && chrome.runtime.getContexts) {
      const contexts = await chrome.runtime.getContexts({ contextTypes: ['POPUP'] });
      const selfUrl = location.href.split('#')[0];
      const isPopup = contexts.some(c => (c.documentUrl || '').split('#')[0] === selfUrl);
      if (!isPopup && chrome.sidePanel) return 'panel';
    }
  } catch (error) {
    // 老版本浏览器没有该 API，按弹窗处理
  }
  return 'popup';
}

// ---------- 外观模式 ----------

const THEME_KEY = 'themePreference';
let themePreference = 'auto';

const storage = {
  get(keys) {
    return new Promise(resolve => {
      if (!isExtensionEnv()) return resolve({});
      try {
        chrome.storage.sync.get(keys, data => resolve(data || {}));
      } catch (error) {
        resolve({});
      }
    });
  },
  set(obj) {
    if (!isExtensionEnv()) return;
    try { chrome.storage.sync.set(obj); } catch (error) { /* 忽略 */ }
  }
};

function applyTheme() {
  const root = document.documentElement;
  if (themePreference === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', themePreference);

  document.querySelectorAll('.theme-option').forEach(button => {
    button.classList.toggle('active', button.dataset.theme === themePreference);
  });
}

function setTheme(preference) {
  themePreference = preference;
  applyTheme();
  storage.set({ [THEME_KEY]: preference });
}

// ---------- 状态 ----------

const state = {
  mode: 'popup',
  tab: 'current',
  query: '',
  sort: 'priority',
  filter: 'all',
  selecting: false,
  selected: new Set(),
  collapsed: new Set(),
  expanded: new Set(),
  focusIndex: -1,
  currentDomain: '',
  currentUrl: '',
  currentTabId: null,
  currentCookies: [],
  allCookies: [],
  visible: [],
  preview: false
};

let allCookiesCache = null;
let lastRenderSignature = '';
let undoBuffer = null;
let pendingConfirm = null;
let codeLang = 'curl';

// ---------- DOM ----------

const el = {};

function cacheDom() {
  // 自动缓存所有带 id 的元素，避免手工维护清单时漏项
  document.querySelectorAll('[id]').forEach(node => { el[node.id] = node; });
}

// ---------- Toast ----------

function toast(message, type, action) {
  if (!el.toastHost) return;

  const node = document.createElement('div');
  node.className = `toast ${type || 'ok'}`;

  if (action) {
    const row = document.createElement('div');
    row.className = 'toast-row';

    const text = document.createElement('span');
    text.textContent = message;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'toast-action';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      action.onClick();
      node.remove();
    });

    row.appendChild(text);
    row.appendChild(button);
    node.appendChild(row);
  } else {
    node.textContent = message;
  }

  el.toastHost.appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));

  setTimeout(() => {
    node.classList.remove('show');
    setTimeout(() => node.remove(), 240);
  }, action ? 6500 : 2200);
}

// ---------- 数据层 ----------

async function getAllCookiesEverywhere(forceRefresh) {
  if (!forceRefresh && allCookiesCache) return allCookiesCache;
  allCookiesCache = await chrome.cookies.getAll({});
  return allCookiesCache;
}

async function fetchCurrentSiteCookies() {
  const normalized = normalizeDomain(state.currentDomain);
  const base = getBaseDomain(normalized);
  const all = await getAllCookiesEverywhere();

  return all.filter(cookie => {
    const d = normalizeDomain(cookie.domain);
    return d === normalized || d === base || d.endsWith('.' + base);
  });
}

// ---------- 筛选与排序 ----------

function getSourceCookies() {
  return state.tab === 'current' ? state.currentCookies : state.allCookies;
}

function sortList(list) {
  const sorted = list.slice();

  if (state.sort === 'priority') {
    sorted.sort((a, b) => {
      const diff = getCookiePriority(b) - getCookiePriority(a);
      if (diff !== 0) return diff;
      const da = normalizeDomain(a.domain);
      const db = normalizeDomain(b.domain);
      if (da !== db) return da.localeCompare(db);
      return String(a.name).localeCompare(String(b.name));
    });
    return sorted;
  }

  if (state.sort === 'name') {
    sorted.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return sorted;
  }

  sorted.sort((a, b) => {
    const da = normalizeDomain(a.domain);
    const db = normalizeDomain(b.domain);
    if (da !== db) return da.localeCompare(db);
    return String(a.name).localeCompare(String(b.name));
  });
  return sorted;
}

function getFilteredCookies() {
  let list = getSourceCookies();

  if (state.filter === 'risk') list = list.filter(isRisky);
  if (state.query) list = list.filter(cookie => scoreCookie(cookie, state.query) > 0);

  if (state.query && state.tab === 'all') {
    return list.slice().sort((a, b) => {
      const diff = scoreCookie(b, state.query) - scoreCookie(a, state.query);
      if (diff !== 0) return diff;
      return normalizeDomain(a.domain).localeCompare(normalizeDomain(b.domain));
    });
  }

  return sortList(list);
}

// ---------- 渲染 ----------

function buildBadges(cookie) {
  const badges = [];

  if (cookie.httpOnly) badges.push('<span class="badge">HttpOnly</span>');
  if (cookie.secure) badges.push('<span class="badge">Secure</span>');
  if (cookie.sameSite && cookie.sameSite !== 'unspecified') {
    badges.push(`<span class="badge">SameSite=${escapeHtml(cookie.sameSite)}</span>`);
  }
  if (cookie.hostOnly) badges.push('<span class="badge">HostOnly</span>');

  const expiry = formatExpiry(cookie);
  badges.push(`<span class="badge${expiry.warn ? ' warn' : ''}">${expiry.text}</span>`);

  return badges.join('');
}

// 展开值时附带展示 JWT 载荷 / URL 解码结果
function buildDecodedBlocks(cookie) {
  const blocks = [];
  const jwt = tryParseJwt(cookie.value);

  if (jwt) {
    blocks.push(
      `<div class="decoded-block">
        <div class="decoded-label">${escapeHtml(t('jwtTitle'))}</div>
        <pre>${escapeHtml(formatJwtPayload(jwt))}</pre>
      </div>`
    );
  }

  const decoded = tryUrlDecode(cookie.value);
  if (decoded) {
    blocks.push(
      `<div class="decoded-block">
        <div class="decoded-label">${escapeHtml(t('decodeTitle'))}</div>
        <pre>${escapeHtml(decoded)}</pre>
      </div>`
    );
  }

  return blocks.join('');
}

function buildRiskBlocks(cookie) {
  const risks = auditCookie(cookie);
  if (!risks.length) return '';

  return `<div class="risk-list">${risks
    .map(key => `<div class="risk-item">⚠ ${escapeHtml(t(key))}</div>`)
    .join('')}</div>`;
}

function renderItemHtml(cookie, index) {
  const key = cookieKey(cookie);
  const priority = getCookiePriority(cookie);
  const risky = isRisky(cookie);
  const cls = [
    'cookie-item',
    priority === 3 ? 'sensitive' : priority === 2 ? 'important' : '',
    risky ? 'risky' : '',
    state.selected.has(key) ? 'selected' : '',
    state.focusIndex === index ? 'focused' : ''
  ].filter(Boolean).join(' ');

  const domainLabel = normalizeDomain(cookie.domain) + (cookie.path || '/');
  const expanded = state.expanded.has(key);
  const valueText = cookie.value === '' ? t('emptyValue') : highlightMatch(cookie.value, state.query);

  return `<li class="${cls}" data-index="${index}" data-key="${escapeHtml(key)}">
    <div class="ci-head">
      ${state.selecting ? `<label class="ci-check"><input type="checkbox" data-act="select"${state.selected.has(key) ? ' checked' : ''}></label>` : ''}
      <div class="ci-title">
        ${state.tab === 'all' ? `<span class="ci-domain" title="${escapeHtml(domainLabel)}">${highlightMatch(domainLabel, state.query)}</span>` : ''}
        <span class="ci-name">${highlightMatch(cookie.name, state.query)}</span>
      </div>
      <div class="ci-actions">
        <button type="button" class="mini-btn" data-act="copy">${escapeHtml(t('copy'))}</button>
        <button type="button" class="mini-btn" data-act="edit">${escapeHtml(t('edit'))}</button>
        <button type="button" class="mini-btn danger" data-act="delete">${escapeHtml(t('delete'))}</button>
      </div>
    </div>
    <div class="ci-value${expanded ? ' expanded' : ''}" data-act="toggle">${valueText}</div>
    ${expanded ? buildDecodedBlocks(cookie) : ''}
    <div class="ci-meta">${buildBadges(cookie)}</div>
    ${buildRiskBlocks(cookie)}
  </li>`;
}

function buildListHtml(list) {
  // 按域名分组
  if (state.sort === 'domain') {
    const groups = new Map();
    list.forEach(cookie => {
      const domain = normalizeDomain(cookie.domain);
      if (!groups.has(domain)) groups.set(domain, []);
      groups.get(domain).push(cookie);
    });

    let index = 0;
    let html = '';

    groups.forEach((items, domain) => {
      const collapsed = state.collapsed.has(domain);
      html += `<li class="domain-group" data-group="${escapeHtml(domain)}">
        <span class="dg-name">${collapsed ? '▸' : '▾'} ${escapeHtml(domain)}</span>
        <span class="dg-count">${escapeHtml(t('groupCount', { n: items.length }))}</span>
      </li>`;

      if (collapsed) {
        index += items.length;
        return;
      }

      html += items.map(cookie => renderItemHtml(cookie, index++)).join('');
    });

    return html;
  }

  return list.map((cookie, index) => renderItemHtml(cookie, index)).join('');
}

function computeSignature(filtered) {
  let hash = 2166136261;
  const mix = value => {
    const text = String(value === undefined || value === null ? '' : value);
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  };

  mix(state.tab);
  mix(state.query);
  mix(state.sort);
  mix(state.filter);
  mix(state.selecting ? '1' : '0');
  mix(state.focusIndex);
  mix(state.expanded.size);
  mix(state.collapsed.size);
  mix(state.currentCookies.length);
  mix(state.allCookies.length);

  for (const cookie of filtered) {
    mix(cookie.name);
    mix(cookie.domain);
    mix(cookie.path);
    mix(cookie.value);
  }

  return (hash >>> 0).toString(36);
}

function render(options) {
  const opts = options || {};
  const filtered = getFilteredCookies();
  const signature = computeSignature(filtered);

  if (!opts.force && signature === lastRenderSignature) return;
  lastRenderSignature = signature;

  const scrollTop = opts.resetScroll ? 0 : el.content.scrollTop;

  state.visible = filtered.slice(0, MAX_RENDER);
  el.cookieList.innerHTML = buildListHtml(state.visible);
  bindListEvents();

  updateMeta(filtered.length);
  updateEmptyState(filtered.length);
  updateCountsOnly();
  updateBatchBar();

  el.content.scrollTop = scrollTop;
}

function bindListEvents() {
  el.cookieList.querySelectorAll('.domain-group').forEach(node => {
    node.addEventListener('click', () => {
      const domain = node.dataset.group;
      if (state.collapsed.has(domain)) state.collapsed.delete(domain);
      else state.collapsed.add(domain);
      render({ force: true });
    });
  });

  el.cookieList.querySelectorAll('li[data-index]').forEach(li => {
    const cookie = state.visible[Number(li.dataset.index)];
    if (!cookie) return;

    li.addEventListener('click', event => {
      if (event.target.closest('[data-act]')) return;
      state.focusIndex = Number(li.dataset.index);
    });

    li.querySelectorAll('[data-act]').forEach(node => {
      const act = node.dataset.act;

      if (act === 'select') {
        node.addEventListener('change', event => {
          const key = cookieKey(cookie);
          if (event.target.checked) state.selected.add(key);
          else state.selected.delete(key);
          li.classList.toggle('selected', event.target.checked);
          updateBatchBar();
        });
        return;
      }

      node.addEventListener('click', () => {
        if (act === 'copy') copyValue(node, cookie.value);
        else if (act === 'edit') openEditModal(cookie);
        else if (act === 'delete') requestDelete(cookie);
        else if (act === 'toggle') {
          const key = cookieKey(cookie);
          if (state.expanded.has(key)) state.expanded.delete(key);
          else state.expanded.add(key);
          render({ force: true });
        }
      });
    });
  });
}

function updateMeta(matched) {
  const source = getSourceCookies();
  const parts = [];

  if (state.query) parts.push(t('metaMatched', { n: matched, m: source.length }));
  else parts.push(t('metaTotal', { n: source.length }));

  if (matched > MAX_RENDER) parts.push(t('metaTruncated', { n: MAX_RENDER }));

  const riskyCount = source.filter(isRisky).length;
  if (riskyCount) parts.push(t('metaRisky', { n: riskyCount }));

  el.listMeta.textContent = parts.join(' · ');
}

function updateEmptyState(count) {
  if (count > 0) {
    el.emptyState.hidden = true;
    return;
  }

  el.emptyState.hidden = false;

  if (state.preview) {
    el.emptyTitle.textContent = t('emptyPreviewTitle');
    el.emptyDesc.textContent = t('emptyPreviewDesc');
    return;
  }

  if (state.query || state.filter === 'risk') {
    el.emptyTitle.textContent = t('emptySearchTitle');
    el.emptyDesc.textContent = t('emptySearchDesc', { q: state.query });
    return;
  }

  if (state.tab === 'current') {
    el.emptyTitle.textContent = t('emptySiteTitle');
    el.emptyDesc.textContent = t('emptySiteDesc');
    return;
  }

  el.emptyTitle.textContent = t('emptyAllTitle');
  el.emptyDesc.textContent = t('emptyAllDesc');
}

function updateCountsOnly() {
  el.countCurrent.textContent = state.currentCookies.length;
  el.countAll.textContent = state.allCookies.length;
}

function updateBatchBar() {
  el.normalActions.hidden = state.selecting;
  el.batchActions.hidden = !state.selecting;

  if (state.selecting) {
    el.selectAllBtn.textContent = t('selectAllShown', { n: state.visible.length });
    el.batchDeleteBtn.disabled = state.selected.size === 0;
    el.batchCopyBtn.disabled = state.selected.size === 0;
    el.batchExportBtn.disabled = state.selected.size === 0;
  }

  el.filterBtn.textContent = state.filter === 'risk' ? t('filterRisk') : t('filterAll');
  el.filterBtn.classList.toggle('risk', state.filter === 'risk');
  el.sortBtn.textContent = t(
    state.sort === 'priority' ? 'sortPriority' : state.sort === 'name' ? 'sortName' : 'sortDomain'
  );
  el.sortBtn.classList.toggle('active', state.sort !== 'priority');
  el.selectBtn.classList.toggle('active', state.selecting);
}

// ---------- 复制 / 编辑 / 删除 ----------

function copyValue(button, value) {
  navigator.clipboard.writeText(value)
    .then(() => {
      const original = button.textContent;
      button.textContent = t('copied');
      button.classList.add('done');
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('done');
      }, 1200);
    })
    .catch(() => toast(t('copyFailed'), 'error'));
}

let cookieToEdit = null;

function openEditModal(cookie) {
  cookieToEdit = cookie;

  el.editCookieName.value = cookie.name;
  el.editCookieValue.value = cookie.value;
  el.editCookiePath.value = cookie.path || '/';
  el.editCookieExpiration.value = formatDateTime(cookie.expirationDate);
  el.editCookieHttpOnly.value = String(!!cookie.httpOnly);
  el.editCookieSameSite.value = cookie.sameSite || 'unspecified';
  el.editCookieSecure.value = String(!!cookie.secure);

  openModal('editCookieModal');
}

async function confirmEdit() {
  if (!cookieToEdit) return;

  const value = el.editCookieValue.value;
  if (!value) {
    toast(t('errValueRequired'), 'error');
    return;
  }

  const params = {
    url: cookieUrl(cookieToEdit),
    name: cookieToEdit.name,
    value,
    path: el.editCookiePath.value || '/',
    httpOnly: el.editCookieHttpOnly.value === 'true',
    sameSite: el.editCookieSameSite.value,
    secure: el.editCookieSecure.value === 'true'
  };

  if (params.sameSite === 'no_restriction' && !params.secure) {
    params.secure = true;
    el.editCookieSecure.value = 'true';
  }

  const expiration = el.editCookieExpiration.value;
  if (expiration) params.expirationDate = Math.floor(new Date(expiration).getTime() / 1000);
  if (cookieToEdit.storeId) params.storeId = cookieToEdit.storeId;

  try {
    await chrome.cookies.set(params);
    closeModal('editCookieModal');
    toast(t('updated'));
    await refreshAll();
  } catch (error) {
    toast(t('updateFailed', { msg: error.message }), 'error');
  }
}

// 统一的自定义确认框，替代浏览器原生 confirm
function openConfirm(options) {
  el.deleteMessage.textContent = options.message;
  el.deleteTarget.textContent = options.detail || '';
  pendingConfirm = options.onConfirm;
  openModal('deleteConfirmModal');
}

function runConfirm() {
  const action = pendingConfirm;
  pendingConfirm = null;
  closeModal('deleteConfirmModal');
  if (action) action();
}

async function removeCookies(list) {
  let ok = 0;
  for (const cookie of list) {
    try {
      const params = { url: cookieUrl(cookie), name: cookie.name };
      if (cookie.storeId) params.storeId = cookie.storeId;
      await chrome.cookies.remove(params);
      ok++;
    } catch (error) {
      // 单条失败不中断整批
    }
  }
  return ok;
}

async function restoreCookies(list) {
  let ok = 0;
  for (const cookie of list) {
    try {
      const params = {
        url: cookieUrl(cookie),
        name: cookie.name,
        value: cookie.value,
        path: cookie.path || '/',
        secure: !!cookie.secure,
        httpOnly: !!cookie.httpOnly,
        sameSite: cookie.sameSite || 'unspecified'
      };
      if (params.sameSite === 'no_restriction') params.secure = true;
      if (cookie.expirationDate) params.expirationDate = cookie.expirationDate;
      if (cookie.storeId) params.storeId = cookie.storeId;

      const result = await chrome.cookies.set(params);
      if (result) ok++;
    } catch (error) {
      // 忽略
    }
  }
  return ok;
}

function offerUndo(list) {
  if (!list.length) return;

  undoBuffer = list.slice();
  clearTimeout(undoBuffer.__timer);

  const timer = setTimeout(() => { undoBuffer = null; }, 6500);
  undoBuffer.__timer = timer;

  toast(
    list.length === 1 ? t('deletedToast') : t('batchDeleted', { n: list.length }),
    'ok',
    {
      label: t('undo'),
      onClick: async () => {
        const restore = undoBuffer || list;
        undoBuffer = null;
        clearTimeout(timer);
        const ok = await restoreCookies(restore);
        await refreshAll();
        toast(ok === 1 ? t('undoneOne') : t('undoSite', { n: ok }));
      }
    }
  );
}

function requestDelete(cookie) {
  openConfirm({
    message: t('deleteConfirm'),
    detail: `${cookie.name}  ·  ${normalizeDomain(cookie.domain)}${cookie.path || '/'}`,
    onConfirm: async () => {
      const count = await removeCookies([cookie]);
      if (count) {
        offerUndo([cookie]);
        await refreshAll();
      }
    }
  });
}

// ---------- 批量操作 ----------

function getSelectedCookies() {
  return state.visible.filter(cookie => state.selected.has(cookieKey(cookie)));
}

function toggleSelectionMode(on) {
  state.selecting = on;
  if (!on) state.selected.clear();
  render({ force: true });
}

function selectAllVisible() {
  const allSelected = state.visible.length > 0
    && state.visible.every(cookie => state.selected.has(cookieKey(cookie)));

  if (allSelected) state.selected.clear();
  else state.visible.forEach(cookie => state.selected.add(cookieKey(cookie)));

  render({ force: true });
}

async function batchDelete() {
  const list = getSelectedCookies();
  if (!list.length) return;

  openConfirm({
    message: t('batchDeleteConfirm', { n: list.length }),
    onConfirm: async () => {
      const count = await removeCookies(list);
      state.selected.clear();
      if (count) {
        offerUndo(list);
        await refreshAll();
      }
    }
  });
}

function batchCopy() {
  const list = getSelectedCookies();
  if (!list.length) return;

  const text = list.map(c => `${c.name}=${c.value}`).join('; ');
  navigator.clipboard.writeText(text)
    .then(() => toast(t('batchCopied', { n: list.length })))
    .catch(() => toast(t('copyFailed'), 'error'));
}

function batchExport() {
  const list = getSelectedCookies();
  if (!list.length) return;
  el.exportMeta.textContent = t('exportMeta', { n: list.length, m: '' });
  batchExportList = list;
  openModal('exportModal');
}

let batchExportList = null;

// ---------- 代码生成 ----------

function currentCodeUrl() {
  return el.codeUrl.value.trim() || state.currentUrl || `https://${state.currentDomain || 'example.com'}`;
}

function refreshCode() {
  const list = getFilteredCookies();
  const builder = CODE_BUILDERS[codeLang] || buildCurl;

  el.codeOutput.textContent = list.length
    ? builder(currentCodeUrl(), list)
    : '';
  el.codeMeta.textContent = t('metaTotal', { n: list.length });
}

function openCodeModal() {
  el.codeUrl.value = state.currentUrl || `https://${state.currentDomain || ''}`;
  document.querySelectorAll('.code-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.lang === codeLang);
  });
  refreshCode();
  openModal('codeModal');
}

function copyCode() {
  const text = el.codeOutput.textContent;
  if (!text) return;

  navigator.clipboard.writeText(text)
    .then(() => toast(t('codeDone')))
    .catch(() => toast(t('copyFailed'), 'error'));
}

// ---------- 模态框 ----------

function openModal(id) {
  const node = document.getElementById(id);
  if (!node) return;
  node.hidden = false;
  document.body.classList.add('modal-open');
}

function closeModal(id) {
  const node = document.getElementById(id);
  if (!node) return;
  node.hidden = true;

  if (!document.querySelector('.modal:not([hidden])')) {
    document.body.classList.remove('modal-open');
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal:not([hidden])').forEach(node => { node.hidden = true; });
  document.body.classList.remove('modal-open');

  if (state.selecting) toggleSelectionMode(false);
}

function bindModalBasics() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal(modal.id);
    });
    modal.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(modal.id));
    });
  });
}

// ---------- 添加 Cookie ----------

function validateAddForm() {
  let valid = true;

  const name = el.cookieName.value.trim();
  if (!name) {
    el.nameError.textContent = t('errNameRequired');
    valid = false;
  } else if (/[;\n]/.test(name)) {
    el.nameError.textContent = t('errNameInvalid');
    valid = false;
  } else if (name.length > 256) {
    el.nameError.textContent = t('errNameTooLong');
    valid = false;
  } else {
    el.nameError.textContent = '';
  }

  const value = el.cookieValueText.value.trim();
  if (!value) {
    el.valueError.textContent = t('errValueRequired');
    valid = false;
  } else if (new Blob([value]).size > 4096) {
    el.valueError.textContent = t('errValueTooLong');
    valid = false;
  } else {
    el.valueError.textContent = '';
  }

  const expiration = el.cookieExpiration.value;
  if (expiration && new Date(expiration) < new Date()) {
    el.valueError.textContent = t('errExpirationPast');
    valid = false;
  }

  el.confirmAddCookieBtn.disabled = !valid;
  return valid;
}

async function confirmAdd() {
  if (!validateAddForm()) return;

  const cookie = {
    name: el.cookieName.value.trim(),
    value: el.cookieValueText.value.trim(),
    httpOnly: el.cookieHttpOnly.value === 'true',
    sameSite: el.cookieSameSite.value,
    secure: el.cookieSecure.value === 'true'
  };

  if (cookie.sameSite === 'no_restriction' && !cookie.secure) {
    cookie.secure = true;
    el.cookieSecure.value = 'true';
  }

  const expiration = el.cookieExpiration.value;
  if (expiration) cookie.expirationDate = Math.floor(new Date(expiration).getTime() / 1000);

  const url = state.currentUrl
    || `https://${normalizeDomain(state.currentDomain)}/`;

  if (!state.currentDomain) {
    toast(t('noUrl'), 'error');
    return;
  }

  try {
    const params = Object.assign({ url, path: '/' }, cookie);
    await chrome.cookies.set(params);
    closeModal('addCookieModal');
    toast(t('added'));
    await refreshAll();
  } catch (error) {
    toast(t('addFailed', { msg: error.message }), 'error');
  }
}

// ---------- 导入 ----------

function parseCookieText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      const rows = Array.isArray(data) ? data : [data];
      const parsed = rows
        .filter(row => row && row.name)
        .map(row => ({
          name: row.name,
          value: String(row.value === undefined || row.value === null ? '' : row.value),
          domain: row.domain,
          path: row.path || '/',
          secure: !!row.secure,
          httpOnly: !!row.httpOnly,
          sameSite: row.sameSite,
          expirationDate: row.expirationDate
        }));
      if (parsed.length) return parsed;
    } catch (error) {
      // 继续尝试其他格式
    }
  }

  if (trimmed.includes('\t')) {
    const rows = [];
    trimmed.split('\n').forEach(line => {
      if (!line.trim() || line.startsWith('#')) return;
      const parts = line.split('\t');
      if (parts.length >= 7) {
        rows.push({
          domain: parts[0].trim(),
          path: parts[2].trim() || '/',
          secure: parts[3].trim().toUpperCase() === 'TRUE',
          expirationDate: Number(parts[4]) > 0 ? Number(parts[4]) : undefined,
          name: parts[5].trim(),
          value: parts[6].trim()
        });
      }
    });
    if (rows.length) return rows;
  }

  return trimmed
    .split(';')
    .map(segment => {
      const index = segment.indexOf('=');
      if (index === -1) return null;
      return { name: segment.slice(0, index).trim(), value: segment.slice(index + 1).trim() };
    })
    .filter(row => row && row.name);
}

async function importCookieList(cookies, fallbackUrl) {
  let ok = 0;
  let fail = 0;

  for (const cookie of cookies) {
    let url = fallbackUrl;

    if (cookie.domain) {
      const domain = normalizeDomain(cookie.domain);
      const path = cookie.path || '/';
      url = `http${cookie.secure ? 's' : ''}://${domain}${path.startsWith('/') ? path : '/' + path}`;
    }

    if (!url || !/^https?:/i.test(url)) { fail++; continue; }

    const params = {
      url,
      name: cookie.name,
      value: cookie.value,
      path: cookie.path || '/',
      secure: !!cookie.secure,
      httpOnly: !!cookie.httpOnly,
      sameSite: cookie.sameSite || 'unspecified'
    };

    if (params.sameSite === 'no_restriction') params.secure = true;
    if (cookie.expirationDate) params.expirationDate = cookie.expirationDate;

    try {
      const result = await chrome.cookies.set(params);
      if (result) ok++;
      else fail++;
    } catch (error) {
      fail++;
    }
  }

  return { ok, fail };
}

async function confirmImport() {
  const mode = document.querySelector('input[name="importMode"]:checked').value;
  const url = el.importUrl.value.trim();

  const finish = async text => {
    const cookies = parseCookieText(text);
    if (!cookies.length) {
      toast(t('noParsed'), 'error');
      return;
    }

    const result = await importCookieList(cookies, url);
    closeModal('importModal');
    toast(t('importDone', {
      ok: result.ok,
      fail: result.fail ? t('importFailPart', { n: result.fail }) : ''
    }), result.ok ? 'ok' : 'error');
    await refreshAll();
  };

  if (mode === 'text') {
    await finish(el.cookieValue.value);
    return;
  }

  const file = el.fileInput.files[0];
  if (!file) {
    toast(t('selectFileFirst'), 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = event => finish(event.target.result);
  reader.onerror = () => toast(t('readFileFailed'), 'error');
  reader.readAsText(file);
}

// ---------- 导出 ----------

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportFileName(ext) {
  const base = state.tab === 'all'
    ? 'all-sites'
    : (state.currentDomain || 'cookies').replace(/[^\w.-]/g, '_');
  return `${base}-cookies.${ext}`;
}

function doExport(format) {
  const list = batchExportList || getFilteredCookies();
  batchExportList = null;

  if (!list.length) {
    toast(t('nothingToExport'), 'error');
    return;
  }

  if (format === 'header') {
    downloadFile(exportFileName('txt'), list.map(c => `${c.name}=${c.value}`).join('; '));
    toast(t('exportHeaderDone', { n: list.length }));
  } else if (format === 'json') {
    downloadFile(exportFileName('json'), JSON.stringify(list, null, 2));
    toast(t('exportJsonDone', { n: list.length }));
  } else {
    const lines = ['# Netscape HTTP Cookie File', ''];
    list.forEach(c => {
      lines.push([
        c.domain,
        c.hostOnly ? 'FALSE' : 'TRUE',
        c.path || '/',
        c.secure ? 'TRUE' : 'FALSE',
        c.expirationDate ? Math.floor(c.expirationDate) : 0,
        c.name,
        c.value
      ].join('\t'));
    });
    downloadFile(exportFileName('txt'), lines.join('\n'));
    toast(t('exportNetscapeDone', { n: list.length }));
  }

  closeModal('exportModal');
}

// ---------- 设置 ----------

async function uploadToApi() {
  const apiUrl = el.apiInput.value.trim();
  if (!apiUrl) {
    toast(t('apiRequired'), 'error');
    return;
  }

  const list = getFilteredCookies();
  if (!list.length) {
    toast(t('nothingToUpload'), 'error');
    return;
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list)
    });
    toast(t('uploadDone', { n: res.status }));
  } catch (error) {
    toast(t('uploadFailed', { msg: error.message }), 'error');
  }
}

function clearCurrentSiteCookies() {
  const list = state.currentCookies;
  if (!list.length) {
    toast(t('noCookies'), 'error');
    return;
  }

  openConfirm({
    message: t('clearSiteConfirm', { n: list.length }),
    onConfirm: async () => {
      const count = await removeCookies(list);
      closeModal('settingsModal');
      if (count) offerUndo(list);
      await refreshAll();
      if (state.currentTabId) chrome.tabs.reload(state.currentTabId);
    }
  });
}

// ---------- 刷新 ----------

async function refreshAll() {
  const current = await fetchCurrentSiteCookies();
  const all = await getAllCookiesEverywhere(true);

  const seen = new Map();
  current.forEach(c => seen.set(cookieKey(c), c));
  state.currentCookies = Array.from(seen.values());

  // 清掉已消失条目的选择状态，避免计数虚高
  const alive = new Set(all.map(cookieKey));
  state.selected.forEach(key => { if (!alive.has(key)) state.selected.delete(key); });
  state.selected = new Set([...state.selected].filter(key => alive.has(key)));

  state.allCookies = all;
  render();
}

// ---------- 同步当前标签页 ----------

async function syncCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];

  if (tab && tab.url && /^https?:/i.test(tab.url)) {
    state.currentUrl = tab.url;
    state.currentDomain = new URL(tab.url).hostname;
    state.currentTabId = tab.id;
    el.siteInfo.textContent = state.currentDomain;
    return;
  }

  state.currentUrl = '';
  state.currentDomain = '';
  state.currentTabId = tab ? tab.id : null;
  el.siteInfo.textContent = t('restrictedPage');
}

function openRepo() {
  if (isExtensionEnv()) chrome.tabs.create({ url: REPO_URL });
  else window.open(REPO_URL, '_blank', 'noopener');
}

// ---------- 事件绑定 ----------

function bindEvents() {
  el.tabCurrent.addEventListener('click', () => switchTab('current'));
  el.tabAll.addEventListener('click', () => switchTab('all'));

  el.searchInput.addEventListener('input', () => {
    state.query = el.searchInput.value;
    el.searchClear.hidden = !state.query;
    render({ resetScroll: true });
  });

  el.searchClear.addEventListener('click', () => {
    el.searchInput.value = '';
    state.query = '';
    el.searchClear.hidden = true;
    el.searchInput.focus();
    render({ resetScroll: true });
  });

  el.sortBtn.addEventListener('click', () => {
    state.sort = SORT_KEYS[(SORT_KEYS.indexOf(state.sort) + 1) % SORT_KEYS.length];
    render({ resetScroll: true });
  });

  el.filterBtn.addEventListener('click', () => {
    state.filter = state.filter === 'risk' ? 'all' : 'risk';
    render({ resetScroll: true });
  });

  el.selectBtn.addEventListener('click', () => toggleSelectionMode(!state.selecting));
  el.exitSelectBtn.addEventListener('click', () => toggleSelectionMode(false));
  el.selectAllBtn.addEventListener('click', selectAllVisible);

  el.batchCopyBtn.addEventListener('click', batchCopy);
  el.batchExportBtn.addEventListener('click', batchExport);
  el.batchDeleteBtn.addEventListener('click', batchDelete);

  el.addCookieBtn.addEventListener('click', () => {
    if (!state.currentDomain) {
      toast(t('noUrl'), 'error');
      return;
    }
    el.cookieName.value = '';
    el.cookieValueText.value = '';
    el.cookieExpiration.value = formatDateTime(Math.floor(Date.now() / 1000) + 86400 * 30);
    el.cookieHttpOnly.value = 'false';
    el.cookieSameSite.value = 'lax';
    el.cookieSecure.value = 'false';
    el.nameError.textContent = '';
    el.valueError.textContent = '';
    el.confirmAddCookieBtn.disabled = true;
    openModal('addCookieModal');
    el.cookieName.focus();
  });

  el.codeBtn.addEventListener('click', openCodeModal);
  el.codeUrl.addEventListener('input', refreshCode);
  el.copyCodeBtn.addEventListener('click', copyCode);

  document.querySelectorAll('.code-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      codeLang = tab.dataset.lang;
      document.querySelectorAll('.code-tab').forEach(item => {
        item.classList.toggle('active', item === tab);
      });
      refreshCode();
    });
  });

  el.exportBtn.addEventListener('click', () => {
    const list = getFilteredCookies();
    el.exportMeta.textContent = t('exportMeta', {
      n: list.length,
      m: state.query ? t('exportFiltered') : ''
    });
    batchExportList = null;
    openModal('exportModal');
  });

  el.importBtn.addEventListener('click', () => {
    el.importUrl.value = state.currentUrl || '';
    openModal('importModal');
  });

  el.settingsBtn.addEventListener('click', () => openModal('settingsModal'));
  el.githubBtn.addEventListener('click', openRepo);
  el.aboutRepoBtn.addEventListener('click', openRepo);

  document.querySelectorAll('.theme-option').forEach(button => {
    button.addEventListener('click', () => {
      setTheme(button.dataset.theme);
      toast(button.dataset.theme === 'auto'
        ? t('themeFollowed')
        : t('themeSwitched', { mode: button.textContent }));
    });
  });

  el.saveApiBtn.addEventListener('click', () => {
    storage.set({ apiUrl: el.apiInput.value.trim() });
    toast(t('save'));
  });

  el.uploadBtn.addEventListener('click', uploadToApi);
  el.clearBtn.addEventListener('click', clearCurrentSiteCookies);

  document.querySelectorAll('.export-option').forEach(btn => {
    btn.addEventListener('click', () => doExport(btn.dataset.format));
  });

  document.querySelectorAll('input[name="importMode"]').forEach(radio => {
    radio.addEventListener('change', event => {
      const isText = event.target.value === 'text';
      el.textImportArea.hidden = !isText;
      el.fileImportArea.hidden = isText;
    });
  });

  el.selectFileBtn.addEventListener('click', () => el.fileInput.click());
  el.fileInput.addEventListener('change', () => {
    const file = el.fileInput.files[0];
    el.fileName.textContent = file ? file.name : t('noFile');
  });
  el.confirmImportBtn.addEventListener('click', confirmImport);

  el.cookieName.addEventListener('input', validateAddForm);
  el.cookieValueText.addEventListener('input', validateAddForm);
  el.cookieExpiration.addEventListener('change', validateAddForm);
  el.cookieSameSite.addEventListener('change', () => {
    if (el.cookieSameSite.value === 'no_restriction' && el.cookieSecure.value === 'false') {
      el.cookieSecure.value = 'true';
      toast(t('samesiteSecureHint'));
    }
    validateAddForm();
  });

  el.clearExpiration.addEventListener('click', () => { el.cookieExpiration.value = ''; validateAddForm(); });
  el.setToToday.addEventListener('click', () => {
    el.cookieExpiration.value = formatDateTime(Math.floor(Date.now() / 1000) + 3600);
  });
  el.confirmAddCookieBtn.addEventListener('click', confirmAdd);

  el.clearEditExpiration.addEventListener('click', () => { el.editCookieExpiration.value = ''; });
  el.setEditToToday.addEventListener('click', () => {
    el.editCookieExpiration.value = formatDateTime(Math.floor(Date.now() / 1000) + 86400 * 30);
  });
  el.editCookieSameSite.addEventListener('change', () => {
    if (el.editCookieSameSite.value === 'no_restriction' && el.editCookieSecure.value === 'false') {
      el.editCookieSecure.value = 'true';
      toast(t('samesiteSecureHint'));
    }
  });
  el.confirmEditCookieBtn.addEventListener('click', confirmEdit);
  el.confirmDeleteBtn.addEventListener('click', runConfirm);

  // 全局快捷键
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeAllModals();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      el.searchInput.focus();
      el.searchInput.select();
      return;
    }

    // 弹窗打开时不处理列表快捷键
    if (document.querySelector('.modal:not([hidden])')) return;
    if (event.target.matches('input, textarea, select')) return;

    const list = state.visible;
    if (!list.length) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const start = state.focusIndex < 0 ? (step > 0 ? -1 : list.length) : state.focusIndex;
      state.focusIndex = Math.min(list.length - 1, Math.max(0, start + step));
      render({ force: true });
      const node = el.cookieList.querySelector(`li[data-index="${state.focusIndex}"]`);
      if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
      return;
    }

    if (state.focusIndex < 0 || state.focusIndex >= list.length) return;
    const cookie = list[state.focusIndex];

    if (event.key === 'Enter') {
      event.preventDefault();
      openEditModal(cookie);
    } else if (event.key === 'Delete') {
      event.preventDefault();
      requestDelete(cookie);
    }
  });
}

function switchTab(tab) {
  state.tab = tab;
  state.focusIndex = -1;
  el.tabCurrent.classList.toggle('active', tab === 'current');
  el.tabAll.classList.toggle('active', tab === 'all');
  render({ resetScroll: true });
}

// ---------- 预览模式 ----------

function previewCookies() {
  const now = Math.floor(Date.now() / 1000);
  const mk = (domain, path, name, value, extra) => Object.assign({
    domain, path, name, value,
    secure: false, httpOnly: false, sameSite: 'lax', hostOnly: false,
    session: false, storeId: '0'
  }, extra || {});

  return [
    mk('.github.com', '/', 'user_session', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3OTk5OTk5OTl9.signature', { secure: true, httpOnly: true, expirationDate: now + 86400 * 12 }),
    mk('.github.com', '/', 'logged_in', 'yes', { secure: true, httpOnly: true, expirationDate: now + 86400 * 360 }),
    mk('.github.com', '/', '_gh_sess', 'U2FsdGVkX1%2B7xk9QmZ4pLd2vR8tN3wYc%3D', { secure: true, httpOnly: true }),
    mk('.github.com', '/', 'preferred_color_mode', 'dark', { secure: true, expirationDate: now + 86400 * 200 }),
    mk('.google.com', '/', 'SID', 'g.a000qQhXk2vL9pRt', { secure: true, httpOnly: true, sameSite: 'no_restriction', expirationDate: now + 86400 * 180 }),
    mk('.google.com', '/', 'HSID', 'A7xK2mQ9pLr4', { secure: true, httpOnly: true, sameSite: 'no_restriction', expirationDate: now + 86400 * 180 }),
    mk('.google.com', '/', 'NID', '524=Xk9pQm2vLrT8w', { secure: true, httpOnly: true, expirationDate: now + 86400 * 45 }),
    mk('mail.google.com', '/mail', 'csrf_token', 'aB3xK9pQm2vLrT8wZ', { expirationDate: now + 3600 * 5 }),
    mk('.taobao.com', '/', '_tb_token_', 'e37be5f8a91c', { httpOnly: true, expirationDate: now + 86400 * 30 }),
    mk('.taobao.com', '/', 'cookie2', '1f4a9c2e8b7d6035', { httpOnly: true, sameSite: 'unspecified', expirationDate: now + 86400 * 30 }),
    mk('.bilibili.com', '/', 'buvid3', 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890', { sameSite: 'unspecified', expirationDate: now + 86400 * 90 }),
    mk('.bilibili.com', '/', 'b_nut', '1699999999', { sameSite: 'unspecified' }),
    mk('.example.com', '/', 'theme', 'light', { expirationDate: now + 86400 * 400 })
  ];
}

async function initPreview() {
  state.preview = true;
  allCookiesCache = previewCookies();

  state.currentDomain = 'github.com';
  state.currentUrl = 'https://github.com/Black17999';
  state.currentCookies = allCookiesCache.filter(
    c => normalizeDomain(c.domain).endsWith('github.com')
  );
  state.allCookies = allCookiesCache;

  el.siteInfo.textContent = `${t('previewSite')} · github.com`;
  el.aboutInfo.textContent = t('emptyPreviewDesc');

  el.loader.hidden = true;
  el.app.hidden = false;

  switchTab('current');
}

// ---------- 初始化 ----------

async function init() {
  cacheDom();
  applyI18n();
  bindModalBasics();
  bindEvents();

  if (!isExtensionEnv()) {
    await initPreview();
    return;
  }

  state.mode = await detectMode();
  document.body.classList.toggle('mode-panel', state.mode === 'panel');
  document.body.classList.toggle('mode-popup', state.mode === 'popup');

  applyTheme();
  const settings = await storage.get([THEME_KEY, 'apiUrl']);
  if (settings[THEME_KEY]) {
    themePreference = settings[THEME_KEY];
    applyTheme();
  }
  if (settings.apiUrl) el.apiInput.value = settings.apiUrl;

  const manifest = chrome.runtime.getManifest();
  el.aboutInfo.textContent = t('aboutLine', {
    v: manifest.version,
    mode: state.mode === 'panel' ? t('modePanel') : t('modePopup')
  });

  await syncCurrentTab();
  await refreshAll();

  el.loader.hidden = true;
  el.app.hidden = false;

  let changeTimer = null;
  chrome.cookies.onChanged.addListener(() => {
    allCookiesCache = null;
    clearTimeout(changeTimer);
    changeTimer = setTimeout(() => {
      refreshAll().catch(() => { /* 忽略瞬时错误 */ });
    }, 250);
  });

  // 侧边栏是常驻的：切换标签页时自动跟随到新网站的 Cookie
  if (state.mode === 'panel') {
    let switchTimer = null;
    const scheduleSwitch = () => {
      clearTimeout(switchTimer);
      switchTimer = setTimeout(() => {
        syncCurrentTab().then(refreshAll).catch(() => { /* 忽略瞬时错误 */ });
      }, 200);
    };

    chrome.tabs.onActivated.addListener(scheduleSwitch);
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.url) scheduleSwitch();
    });
  }
}

init().catch(error => {
  console.error('[CookieMaster Pro] 初始化失败:', error);
  const loader = document.getElementById('loader');
  if (loader) {
    loader.innerHTML = `<p class="loader-text">${escapeHtml(t('initFailed'))}${escapeHtml(error.message)}</p>`;
  }
});
