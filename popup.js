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

  let score = 0;

  if (domain === query || domain.endsWith('.' + query)) score += 100;
  else if (domain.includes(query)) score += 50;

  if (name === query) score += 20;
  else if (name.includes(query)) score += 10;

  // value 可能长达 4KB，整体 toLowerCase 是搜索路径上最贵的一步
  // （「全部 Cookie」几千条时，这一行就是搜索长任务的主要来源）。
  // 只有 domain/name 都没命中、且查询词足够长（短词在 value 里误匹配率太高）时才查 value；
  // 域名或名称已命中时，用户已经能找到这条，value 里的匹配不再影响排序。
  if (!score && query.length >= 3) {
    const value = String(cookie.value || '').toLowerCase();
    if (value.includes(query)) score += 1;
  }

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

// SameSite 的接口枚举值换成界面上的可读写法
const SAMESITE_LABEL = { no_restriction: 'None', lax: 'Lax', strict: 'Strict' };

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

// 徽章上的文字尽量短（中文长句在 11px 下几乎无法辨读），完整说明放进 title
// 徽章文字必须让没接触过 Cookie 的人也能读懂。
// ⚠️ 别为了省地方缩成「399 天」「1 小时」——新手根本不知道那是在说什么；
// 悬浮提示里再补上具体到分钟的时刻，想查确切时间的人也有得查。
function formatExpiry(cookie) {
  if (!cookie.expirationDate) {
    return { text: t('badgeSession'), full: t('badgeSessionFull'), warn: false };
  }

  const when = formatExpiryDate(cookie.expirationDate);
  const diff = cookie.expirationDate * 1000 - Date.now();

  if (diff <= 0) {
    return { text: t('badgeExpired'), full: t('badgeExpiredAt', { date: when }), warn: true };
  }

  const days = Math.floor(diff / 86400000);
  if (days >= 1) {
    return { text: t('badgeDaysFull', { n: days }), full: t('badgeExpiresAt', { date: when }), warn: days <= 3 };
  }

  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) {
    return { text: t('badgeHoursFull', { n: hours }), full: t('badgeExpiresAt', { date: when }), warn: true };
  }

  const minutes = Math.max(1, Math.floor(diff / 60000));
  return { text: t('badgeMinutesFull', { n: minutes }), full: t('badgeExpiresAt', { date: when }), warn: true };
}

// 给人看的时刻（datetime-local 那种带 T 的格式是给输入框用的）
function formatExpiryDate(ts) {
  const d = new Date(ts * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
const THEME_CYCLE = ['auto', 'light', 'dark'];
const THEME_LABEL_KEY = { auto: 'themeAuto', light: 'themeLight', dark: 'themeDark' };
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

function themeLabel(preference) {
  return t(THEME_LABEL_KEY[preference] || 'themeAuto');
}

function applyTheme() {
  const root = document.documentElement;
  if (themePreference === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', themePreference);

  // 顶栏按钮：图标随模式切换，提示语写明「点击后切到哪个模式」
  if (el.themeBtn) {
    el.themeBtn.dataset.themeMode = themePreference;
    const nextTheme = THEME_CYCLE[(THEME_CYCLE.indexOf(themePreference) + 1) % THEME_CYCLE.length];
    el.themeBtn.title = t('themeSwitchTitle', { mode: themeLabel(themePreference), next: themeLabel(nextTheme) });
    el.themeBtn.setAttribute('aria-label', el.themeBtn.title);
  }
  if (el.themeStateText) {
    el.themeStateText.textContent = t('themeCurrent', { mode: themeLabel(themePreference) });
  }
}

function setTheme(preference, silent) {
  themePreference = preference;
  applyTheme();
  storage.set({ [THEME_KEY]: preference });
  if (!silent) toast(t('themeSwitched', { mode: themeLabel(preference) }));
}

// 单键循环：跟随系统 → 浅色 → 深色 → 跟随系统，1 次点击完成切换
function cycleTheme() {
  const next = THEME_CYCLE[(THEME_CYCLE.indexOf(themePreference) + 1) % THEME_CYCLE.length];
  setTheme(next);
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

// 纯函数：把「全部 Cookie」按当前网站筛一遍，不再自己去拉数据
function filterCurrentSite(all) {
  const normalized = normalizeDomain(state.currentDomain);
  if (!normalized) return [];

  const base = getBaseDomain(normalized);
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
    const label = SAMESITE_LABEL[cookie.sameSite] || cookie.sameSite;
    badges.push(`<span class="badge">SameSite=${escapeHtml(label)}</span>`);
  }
  if (cookie.hostOnly) badges.push('<span class="badge">HostOnly</span>');

  // 分区 Cookie（CHIPS）：同名 Cookie 在不同顶级站点下可以有不同的值，
  // 这是「插件看到的值和 F12 不一样」的常见原因之一，必须标出来。
  if (cookie.partitionKey) {
    const site = cookie.partitionKey.topLevelSite || '';
    badges.push(`<span class="badge partition" title="${escapeHtml(t('badgePartitionTitle', { site }))}">${escapeHtml(t('badgePartition'))}</span>`);
  }
  if (cookie.storeId && cookie.storeId !== '0') {
    badges.push(`<span class="badge">Store ${escapeHtml(String(cookie.storeId))}</span>`);
  }

  const expiry = formatExpiry(cookie);
  badges.push(`<span class="badge${expiry.warn ? ' warn' : ''}" title="${escapeHtml(expiry.full)}">${escapeHtml(expiry.text)}</span>`);

  return badges.join('');
}

// 卡片上的作用域标注：domain + path。
// 同名 Cookie 常常只在 path（或 domain）上不同、值却完全不同，
// 不把 path 显示出来就无从分辨，这正是「和 F12 对不上」的根因之一。
function scopeLabel(cookie) {
  const domain = normalizeDomain(cookie.domain);
  const path = cookie.path || '/';
  return state.tab === 'all' ? `${domain}${path}` : path;
}

function scopeTitle(cookie, dupCount) {
  const domain = normalizeDomain(cookie.domain);
  const path = cookie.path || '/';
  if (dupCount > 1) return t('dupNameHint', { n: dupCount, domain, path });
  return `${domain}${path}`;
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

function renderItemHtml(cookie, index, dupCount) {
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

  const expanded = state.expanded.has(key);
  const valueText = cookie.value === '' ? t('emptyValue') : highlightMatch(cookie.value, state.query);
  const duplicated = dupCount > 1;

  // 作用域只在「有信息量」时出现：
  // 当前网站视图下，根路径且同名的独苗就不展示了——满屏的「/」只会制造噪音；
  // 一旦出现同名或非根路径（真正的歧义来源），它就立刻显形。
  const showScope = state.tab === 'all' || duplicated || (cookie.path || '/') !== '/';

  return `<li class="${cls}" data-index="${index}" data-key="${escapeHtml(key)}">
    <div class="ci-head">
      ${state.selecting ? `<label class="ci-check"><input type="checkbox" data-act="select"${state.selected.has(key) ? ' checked' : ''}></label>` : ''}
      <div class="ci-title">
        <span class="ci-name">${highlightMatch(cookie.name, state.query)}</span>
        ${showScope ? `<span class="ci-scope${duplicated ? ' dup' : ''}" title="${escapeHtml(scopeTitle(cookie, dupCount))}">${highlightMatch(scopeLabel(cookie), state.query)}</span>` : ''}
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

// 统计同名 Cookie：同名的必须在界面上能被区分出来，否则用户会拿错那条去和 F12 对比
function countNames(list) {
  const counts = new Map();
  list.forEach(cookie => counts.set(cookie.name, (counts.get(cookie.name) || 0) + 1));
  return counts;
}

function buildListHtml(list) {
  const nameCounts = countNames(list);

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

      html += items.map(cookie => renderItemHtml(cookie, index++, nameCounts.get(cookie.name))).join('');
    });

    return html;
  }

  return list.map((cookie, index) => renderItemHtml(cookie, index, nameCounts.get(cookie.name))).join('');
}

function computeSignature(visible) {
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

  // 只对真正会被画出来的那批条目算指纹（列表上限 MAX_RENDER）。
  // 旧写法会把全部 Cookie（可能上万条）逐字符哈希一遍，纯属白烧 CPU。
  for (const cookie of visible) {
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
  const visible = filtered.slice(0, MAX_RENDER);
  const signature = computeSignature(visible);

  if (!opts.force && signature === lastRenderSignature) return;
  lastRenderSignature = signature;

  const scrollTop = opts.resetScroll ? 0 : el.content.scrollTop;

  state.visible = visible;
  el.cookieList.classList.remove('is-skeleton');
  el.cookieList.innerHTML = buildListHtml(visible);

  updateMeta(filtered, visible);
  updateEmptyState(filtered.length);
  updateCountsOnly();
  updateBatchBar();

  el.content.scrollTop = scrollTop;
}

// 列表事件全部委托到 <ul> 上一次绑定。
// 旧写法给每个元素单独挂监听器，400 条 × 5 个交互点 ≈ 1600 次绑定，是打开时的主要开销之一。
// 「当前项」只是卡片上的一个视觉状态，所以只换 class、不重建整张列表。
// ⚠️ 旧写法改了 state.focusIndex 却完全不重渲染，于是橙色环要等到下一次
// 无关的刷新（通常是站点自己写 Cookie）才补上——用户看到的就是「点了要等十几秒才亮」。
function focusItem(index, scroll) {
  if (state.focusIndex !== index) {
    state.focusIndex = index;

    el.cookieList.querySelectorAll('li[data-index].focused').forEach(node => node.classList.remove('focused'));
    const node = el.cookieList.querySelector(`li[data-index="${index}"]`);
    if (node) node.classList.add('focused');

    // 让渲染指纹与 DOM 保持一致，否则下一次 render 会因签名相同而整体跳过
    lastRenderSignature = computeSignature(state.visible);
  }

  if (scroll) {
    const node = el.cookieList.querySelector(`li[data-index="${index}"]`);
    if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
  }
}

function onListClick(event) {
  const group = event.target.closest('.domain-group');
  if (group) {
    const domain = group.dataset.group;
    if (state.collapsed.has(domain)) state.collapsed.delete(domain);
    else state.collapsed.add(domain);
    render({ force: true });
    return;
  }

  const li = event.target.closest('li[data-index]');
  if (!li) return;

  const cookie = state.visible[Number(li.dataset.index)];
  if (!cookie) return;

  const action = event.target.closest('[data-act]');

  if (!action || action.dataset.act === 'select') {
    if (!action) focusItem(Number(li.dataset.index));
    return;
  }

  switch (action.dataset.act) {
    case 'copy':
      copyValue(action, cookie.value);
      break;
    case 'edit':
      openEditModal(cookie);
      break;
    case 'delete':
      requestDelete(cookie);
      break;
    case 'toggle': {
      const key = cookieKey(cookie);
      if (state.expanded.has(key)) state.expanded.delete(key);
      else state.expanded.add(key);
      render({ force: true });
      break;
    }
    default:
      break;
  }
}

function onListChange(event) {
  const input = event.target.closest('input[data-act="select"]');
  if (!input) return;

  const li = input.closest('li[data-index]');
  const cookie = li && state.visible[Number(li.dataset.index)];
  if (!cookie) return;

  const key = cookieKey(cookie);
  if (input.checked) state.selected.add(key);
  else state.selected.delete(key);

  li.classList.toggle('selected', input.checked);
  updateBatchBar();
}

function updateMeta(filtered, visible) {
  const source = getSourceCookies();
  const parts = [];

  if (state.query) parts.push(t('metaMatched', { n: filtered.length, m: source.length }));
  else parts.push(t('metaTotal', { n: source.length }));

  if (filtered.length > visible.length) parts.push(t('metaTruncated', { n: MAX_RENDER }));

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

  // 非 host-only 的 Cookie 必须把 domain 显式带回去，
  // 否则 chrome.cookies.set 会按 url 推断成 host-only，把 .example.com 悄悄降级成 example.com
  if (!cookieToEdit.hostOnly) params.domain = normalizeDomain(cookieToEdit.domain);

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

// 统一的自定义确认框，替代浏览器原生 confirm。
// options: { title, message, detail, confirmLabel, danger, onConfirm }
function openConfirm(options) {
  const isDanger = options.danger !== false;

  el.confirmTitle.textContent = options.title || t('deleteTitle');
  el.deleteMessage.textContent = options.message;
  el.deleteTarget.textContent = options.detail || '';
  el.deleteTarget.hidden = !options.detail;

  el.confirmDeleteBtn.textContent = options.confirmLabel || t('delete');
  el.confirmDeleteBtn.classList.toggle('danger', isDanger);
  el.confirmDeleteBtn.classList.toggle('primary', !isDanger);

  pendingConfirm = options.onConfirm;
  openModal('deleteConfirmModal');
}

function runConfirm() {
  const action = pendingConfirm;
  pendingConfirm = null;
  closeModal('deleteConfirmModal');
  if (action) action();
}

// 批量 Cookie 操作按小批次并发执行。
// chrome.cookies 每条的 set/remove 都是一次独立 IPC，串行 for-await 在 100 条时
// 就是 0.5~1.5 秒的无反馈卡顿（批量删除、导入、撤销恢复都走这条路）。
// 每批 10 条并发：既把 IPC pipeline 打满，又不至于把扩展进程一下堵死。
const IPC_BATCH_SIZE = 10;

// worker(item) 返回 Promise，resolve 为 truthy 计成功；reject 或 falsy 计失败，单条失败不中断整批。
async function runBatched(list, worker) {
  let ok = 0;
  for (let i = 0; i < list.length; i += IPC_BATCH_SIZE) {
    const batch = list.slice(i, i + IPC_BATCH_SIZE);
    const results = await Promise.all(batch.map(item => worker(item).then(
      success => (success ? 1 : 0),
      () => 0
    )));
    results.forEach(n => { ok += n; });
  }
  return ok;
}

async function removeCookies(list) {
  return runBatched(list, cookie => {
    const params = { url: cookieUrl(cookie), name: cookie.name };
    if (cookie.storeId) params.storeId = cookie.storeId;
    return chrome.cookies.remove(params);
  });
}

async function restoreCookies(list) {
  return runBatched(list, cookie => {
    const params = {
      url: cookieUrl(cookie),
      name: cookie.name,
      value: cookie.value,
      path: cookie.path || '/',
      secure: !!cookie.secure,
      httpOnly: !!cookie.httpOnly,
      sameSite: cookie.sameSite || 'unspecified'
    };
    if (!cookie.hostOnly) params.domain = normalizeDomain(cookie.domain);
    if (params.sameSite === 'no_restriction') params.secure = true;
    if (cookie.expirationDate) params.expirationDate = cookie.expirationDate;
    if (cookie.storeId) params.storeId = cookie.storeId;

    return chrome.cookies.set(params);
  });
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
  const tasks = [];
  let invalid = 0;

  // 先把每条导入项翻译成 chrome.cookies.set 的参数，URL 不合法的直接计失败，
  // 剩下的交给 runBatched 并发写入。
  for (const cookie of cookies) {
    let url = fallbackUrl;

    if (cookie.domain) {
      const domain = normalizeDomain(cookie.domain);
      const path = cookie.path || '/';
      url = `http${cookie.secure ? 's' : ''}://${domain}${path.startsWith('/') ? path : '/' + path}`;
    }

    if (!url || !/^https?:/i.test(url)) { invalid++; continue; }

    const params = {
      url,
      name: cookie.name,
      value: cookie.value,
      path: cookie.path || '/',
      secure: !!cookie.secure,
      httpOnly: !!cookie.httpOnly,
      sameSite: cookie.sameSite || 'unspecified'
    };

    if (cookie.domain && cookie.hostOnly === false) params.domain = normalizeDomain(cookie.domain);
    if (params.sameSite === 'no_restriction') params.secure = true;
    if (cookie.expirationDate) params.expirationDate = cookie.expirationDate;

    tasks.push(params);
  }

  const ok = await runBatched(tasks, params => chrome.cookies.set(params));
  return { ok, fail: invalid + (tasks.length - ok) };
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

function apiTargetHost(url) {
  try { return new URL(url).host; } catch (error) { return ''; }
}

// 只允许 https；本机回环地址（localhost / 127.0.0.1）额外放行明文 http，
// 方便对接本地的小服务。其余明文地址一律拒绝——那等于把登录态裸奔在网上。
function isApiUrlAllowed(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    if (parsed.protocol !== 'http:') return false;
    return /^(localhost|127(\.\d{1,3}){3}|\[::1\])$/i.test(parsed.hostname);
  } catch (error) {
    return false;
  }
}

function updateApiTargetInfo() {
  if (!el.apiTargetInfo) return;

  const url = el.apiInput.value.trim();
  if (!url) {
    el.apiTargetInfo.textContent = '';
    return;
  }

  if (!isApiUrlAllowed(url)) {
    el.apiTargetInfo.textContent = t('apiInsecure');
    return;
  }

  el.apiTargetInfo.textContent = t('apiTarget', { host: apiTargetHost(url) });
}

async function testApiConnection() {
  const apiUrl = el.apiInput.value.trim();
  if (!apiUrl) {
    toast(t('apiRequired'), 'error');
    return;
  }
  if (!isApiUrlAllowed(apiUrl)) {
    toast(t('apiInsecure'), 'error');
    return;
  }

  const started = Date.now();
  try {
    const res = await fetch(apiUrl, { method: 'HEAD', cache: 'no-store' });
    toast(t('apiTestDone', { code: res.status, ms: Date.now() - started }));
  } catch (error) {
    toast(t('apiTestFailed', { msg: error.message }), 'error');
  }
}

async function postToApi(apiUrl) {
  const list = getFilteredCookies();
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

function uploadToApi() {
  const apiUrl = el.apiInput.value.trim();
  if (!apiUrl) {
    toast(t('apiRequired'), 'error');
    return;
  }
  if (!isApiUrlAllowed(apiUrl)) {
    toast(t('apiInsecure'), 'error');
    return;
  }

  const list = getFilteredCookies();
  if (!list.length) {
    toast(t('nothingToUpload'), 'error');
    return;
  }

  // 发出去的是登录态，必须先让用户看清「多少条、发到哪台主机」
  openConfirm({
    title: t('uploadTitle'),
    message: t('uploadConfirm', { n: list.length, host: apiTargetHost(apiUrl) }),
    detail: apiUrl,
    confirmLabel: t('uploadConfirmBtn'),
    danger: true,
    onConfirm: () => postToApi(apiUrl)
  });
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
  // getAll({}) 是唯一一次跨进程大对象传输。
  // 旧代码在刷新时对同一份数据连续读了两次（先读缓存再强制重读），
  // 这是侧边栏滑入时出现长任务、也就是「卡几下」的主因之一，现已合并为一次。
  const all = await getAllCookiesEverywhere(true);

  state.allCookies = all;
  state.currentCookies = filterCurrentSite(all);

  // 清掉已消失条目的选择状态，避免计数虚高
  const alive = new Set(all.map(cookieKey));
  state.selected = new Set([...state.selected].filter(key => alive.has(key)));

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

  let searchTimer = null;

  el.searchInput.addEventListener('input', () => {
    state.query = el.searchInput.value;
    el.searchClear.hidden = !state.query;

    // 输入防抖：连敲 6 个字只重建一次列表。
    // 旧写法每敲一个字都整表重建，实测 6 次输入累计 300ms+，全是长任务。
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => render({ resetScroll: true }), 100);
  });

  el.searchClear.addEventListener('click', () => {
    clearTimeout(searchTimer);
    el.searchInput.value = '';
    state.query = '';
    el.searchClear.hidden = true;
    el.searchInput.focus();
    render({ resetScroll: true });
  });

  // 列表事件一次性委托绑定，条目再多也不增加监听器
  el.cookieList.addEventListener('click', onListClick);
  el.cookieList.addEventListener('change', onListChange);

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

  // 外观：顶栏单键循环 + 设置面板里的同一个入口
  el.themeBtn.addEventListener('click', cycleTheme);
  el.themeCycleBtn.addEventListener('click', cycleTheme);

  el.saveApiBtn.addEventListener('click', () => {
    storage.set({ apiUrl: el.apiInput.value.trim() });
    toast(t('save'));
    updateApiTargetInfo();
  });

  el.apiInput.addEventListener('input', updateApiTargetInfo);
  el.testApiBtn.addEventListener('click', testApiConnection);
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

    // 在搜索框里按 ↓ / ↑ 直接进入列表导航
    if (event.target === el.searchInput && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      if (!state.visible.length) return;
      event.preventDefault();
      focusItem(event.key === 'ArrowDown' ? 0 : state.visible.length - 1, true);
      return;
    }

    if (event.target.matches('input, textarea, select')) return;

    const list = state.visible;
    if (!list.length) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const start = state.focusIndex < 0 ? (step > 0 ? -1 : list.length) : state.focusIndex;
      focusItem(Math.min(list.length - 1, Math.max(0, start + step)), true);
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

// 标签页下方的滑动指示条：切换时平滑移动，而不是「这条灭那条亮」的硬跳
function updateTabIndicator() {
  if (!el.tabIndicator) return;

  const active = state.tab === 'all' ? el.tabAll : el.tabCurrent;
  if (!active || !active.offsetWidth) return;

  el.tabIndicator.style.width = `${active.offsetWidth - 16}px`;
  el.tabIndicator.style.transform = `translateX(${active.offsetLeft + 8}px)`;
}

function switchTab(tab) {
  state.tab = tab;
  state.focusIndex = -1;
  el.tabCurrent.classList.toggle('active', tab === 'current');
  el.tabAll.classList.toggle('active', tab === 'all');
  updateTabIndicator();
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

  const list = [
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

  // 本地性能压测钩子：直接打开 popup.html 时加 ?stress=N 可补 N 条合成 Cookie，
  // 用来在真机上量首次渲染/重渲染耗时。扩展环境下不会走到这里。
  const stress = Number(new URLSearchParams(location.search).get('stress') || 0);
  if (stress > 0) {
    const names = ['session_id', 'csrf_token', 'user_pref', 'analytics_id', '_ga', 'ab_test', 'cart_token', 'locale', 'timezone', 'experiment'];
    const paths = ['/', '/api', '/settings'];
    for (let i = 0; i < stress; i++) {
      list.push(mk('.github.com', paths[i % paths.length], `${names[i % names.length]}${i}`,
        `v${i}-${'x'.repeat(40 + (i % 60))}`,
        {
          secure: i % 2 === 0,
          httpOnly: i % 4 === 0,
          sameSite: i % 5 === 0 ? 'no_restriction' : 'lax',
          hostOnly: i % 7 === 0,
          expirationDate: now + 86400 * (1 + (i % 400))
        }));
    }
  }

  return list;
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
  el.aboutVersion.textContent = '—';
  el.aboutMode.textContent = t('previewSite');
  applyTheme();
  updateApiTargetInfo();

  el.loader.hidden = true;
  el.app.hidden = false;

  switchTab('current');
}

// ---------- 初始化 ----------

// 侧边栏是从右侧滑出来的，这段动画里主线程一忙，用户看到的就是「卡几下」。
// 对策：外壳先上屏、列表用骨架占位，把「拉数据 + 建列表」这两件重活推迟到动画结束之后。
const PANEL_SETTLE_MS = 170;
const SKELETON_ROWS = 4;

function showSkeleton() {
  el.cookieList.classList.add('is-skeleton');
  el.cookieList.innerHTML = Array.from({ length: SKELETON_ROWS }, () => `
    <li class="skeleton-item" aria-hidden="true">
      <div class="sk-line sk-a"></div>
      <div class="sk-line sk-b"></div>
      <div class="sk-line sk-c"></div>
      <div class="sk-tags"><span></span><span></span><span></span></div>
    </li>`).join('');
}

function afterPanelOpen() {
  if (state.mode !== 'panel') return Promise.resolve();
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, PANEL_SETTLE_MS)));
  });
}

async function init() {
  // 界面文案语言与 <html lang> 保持一致：屏幕阅读器、浏览器翻译、
  // 密码管理器的表单识别都读这个属性，写死 zh-CN 会让英语用户被误判成中文页面。
  document.documentElement.lang = CURRENT_LANG;

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
  updateApiTargetInfo();

  const manifest = chrome.runtime.getManifest();
  el.aboutVersion.textContent = `v${manifest.version}`;
  el.aboutMode.textContent = state.mode === 'panel' ? t('modePanel') : t('modePopup');

  // 外壳立即上屏（骨架比转圈更能撑住滑入动画），重活留到动画结束之后
  el.loader.hidden = true;
  el.app.hidden = false;
  if (state.mode === 'panel') showSkeleton();
  // 指示条的对齐要读 offsetWidth（强制布局），放进 rAF：这一帧本来就要布局，等于白捡
  requestAnimationFrame(updateTabIndicator);

  await syncCurrentTab();
  await afterPanelOpen();
  await refreshAll();
  el.cookieList.classList.remove('is-skeleton');
  requestAnimationFrame(updateTabIndicator);

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

    // 侧边栏被拖宽/收窄后，指示条要跟着重新对齐
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateTabIndicator, 120);
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
