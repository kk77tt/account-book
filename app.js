'use strict';

(function () {
  var STORAGE_KEY = 'myMoney.entries.v1';
  var BUDGET_KEY = 'myMoney.budgets.v1';
  var THEME_KEY = 'myMoney.theme.v1';
  var CUSTOM = '__custom';
  var THEMES = ['white', 'dark', 'warm', 'matcha', 'ocean', 'lilac'];

  var DEFAULT_CATEGORIES = {
    expense: ['餐饮', '交通', '购物', '娱乐', '居住', '水电', '医疗', '教育', '人情', '其他'],
    income: ['工资', '奖金', '理财', '兼职', '红包', '退款', '其他']
  };

  var CATEGORY_ICONS = {
    餐饮: '🍔',
    交通: '🚗',
    购物: '🛍️',
    娱乐: '🎮',
    居住: '🏠',
    水电: '💡',
    医疗: '💊',
    教育: '📚',
    人情: '🎁',
    工资: '💼',
    奖金: '🎉',
    理财: '📈',
    兼职: '💻',
    红包: '🧧',
    退款: '↩️',
    其他: '🧾'
  };

  var EXPENSE_MOODS = [
    { icon: '😄', label: '开心' },
    { icon: '🙂', label: '还好' },
    { icon: '😅', label: '有点肉疼' },
    { icon: '😭', label: '好心疼' },
    { icon: '😤', label: '后悔剁手' },
    { icon: '🤑', label: '血赚' }
  ];

  var INCOME_MOODS = [
    { icon: '😄', label: '开心' },
    { icon: '😎', label: '稳了' },
    { icon: '🤩', label: '惊喜' },
    { icon: '🤑', label: '血赚' },
    { icon: '😴', label: '平平无奇' }
  ];

  var currentType = 'expense';
  var selectedMood = '';
  var statsMonth = null;
  var selectedDay = null;
  var viewMonth = monthKey(todayStr());
  var animatingMonth = false;
  var entries = loadEntries();
  var budgets = loadBudgets();

  /* ---------- 工具函数 ---------- */

  function formatMoney(n) {
    return '¥' + Number(n).toFixed(2);
  }

  function signMoney(amount, type) {
    return (type === 'expense' ? '-' : '+') + formatMoney(amount);
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function monthKey(dateStr) {
    return dateStr.slice(0, 7);
  }

  function monthLabel(key) {
    var parts = key.split('-');
    return parts[0] + '年' + Number(parts[1]) + '月';
  }

  function shiftMonth(key, delta) {
    var p = key.split('-');
    var y = Number(p[0]);
    var m = Number(p[1]) + delta;
    if (m < 1) {
      m = 12;
      y--;
    }
    if (m > 12) {
      m = 1;
      y++;
    }
    return y + '-' + (m < 10 ? '0' + m : m);
  }

  function dayLabel(dateStr) {
    var p = dateStr.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var week = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return Number(p[1]) + '月' + Number(p[2]) + '日 周' + week;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function categoryIcon(name) {
    return CATEGORY_ICONS[name] || '📌';
  }

  function categoryWithIcon(name) {
    return esc(name) + ' ' + categoryIcon(name);
  }

  /* ---------- 数据存取 ---------- */

  function validEntry(e) {
    return (
      e &&
      typeof e === 'object' &&
      (e.type === 'expense' || e.type === 'income') &&
      typeof e.amount === 'number' &&
      isFinite(e.amount) &&
      e.amount > 0 &&
      typeof e.category === 'string' &&
      e.category.length > 0 &&
      typeof e.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(e.date)
    );
  }

  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list.filter(validEntry) : [];
    } catch (err) {
      return [];
    }
  }

  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (err) {
      toast('保存失败：浏览器存储不可用');
      return false;
    }
  }

  function loadBudgets() {
    try {
      var raw = localStorage.getItem(BUDGET_KEY);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    } catch (err) {
      return {};
    }
  }

  function saveBudgets() {
    try {
      localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
      return true;
    } catch (err) {
      toast('保存失败：浏览器存储不可用');
      return false;
    }
  }

  function latestBudgetValue() {
    var cur = monthKey(todayStr());
    var v = Number(budgets[cur]);
    if (isFinite(v) && v > 0) return String(v);
    var keys = Object.keys(budgets).sort().reverse();
    for (var i = 0; i < keys.length; i++) {
      if (keys[i] > cur) continue;
      var n = Number(budgets[keys[i]]);
      if (isFinite(n) && n > 0) return String(n);
    }
    return '';
  }

  function loadTheme() {
    try {
      var t = localStorage.getItem(THEME_KEY);
      return THEMES.indexOf(t) !== -1 ? t : 'white';
    } catch (err) {
      return 'white';
    }
  }

  function applyTheme(name) {
    if (THEMES.indexOf(name) === -1) name = 'white';
    document.documentElement.setAttribute('data-theme', name);
    try {
      localStorage.setItem(THEME_KEY, name);
    } catch (err) {
      // 忽略存储失败
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var card = getComputedStyle(document.documentElement).getPropertyValue('--card').trim();
      if (card) meta.setAttribute('content', card);
    }
    document.querySelectorAll('.theme-dot').forEach(function (dot) {
      dot.classList.toggle('active', dot.dataset.theme === name);
    });
  }

  function createEntry(data) {
    return {
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
      type: data.type,
      amount: Math.round(data.amount * 100) / 100,
      category: data.category.trim(),
      date: data.date,
      note: (data.note || '').trim(),
      mood: data.mood || ''
    };
  }

  /* ---------- 统计（纯计算） ---------- */

  function computeStats(list) {
    var byCategory = { expense: {}, income: {} };
    var totalIncome = 0;
    var totalExpense = 0;

    list.forEach(function (e) {
      byCategory[e.type][e.category] = (byCategory[e.type][e.category] || 0) + e.amount;
      if (e.type === 'income') totalIncome += e.amount;
      else totalExpense += e.amount;
    });

    function toList(map) {
      return Object.keys(map)
        .map(function (k) {
          return { category: k, amount: Math.round(map[k] * 100) / 100 };
        })
        .sort(function (a, b) {
          return b.amount - a.amount;
        });
    }

    return {
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      balance: Math.round((totalIncome - totalExpense) * 100) / 100,
      expense: toList(byCategory.expense),
      income: toList(byCategory.income)
    };
  }

  function computeMonthlySummary(list) {
    var map = {};
    list.forEach(function (e) {
      var key = monthKey(e.date);
      if (!map[key]) map[key] = { month: key, income: 0, expense: 0 };
      map[key][e.type] += e.amount;
    });

    return Object.keys(map)
      .map(function (k) {
        var m = map[k];
        return {
          month: k,
          income: Math.round(m.income * 100) / 100,
          expense: Math.round(m.expense * 100) / 100,
          balance: Math.round((m.income - m.expense) * 100) / 100
        };
      })
      .sort(function (a, b) {
        return b.month.localeCompare(a.month);
      });
  }

  function computeBudgetSummaries(list, budgetMap, maxMonth) {
    var map = {};
    list.forEach(function (e) {
      var key = monthKey(e.date);
      if (!map[key]) map[key] = { month: key, income: 0, spent: 0 };
      if (e.type === 'income') map[key].income += e.amount;
      else map[key].spent += e.amount;
    });
    Object.keys(budgetMap).forEach(function (k) {
      if (!map[k]) map[k] = { month: k, income: 0, spent: 0 };
    });

    return Object.keys(map)
      .filter(function (k) {
        return !maxMonth || k <= maxMonth;
      })
      .map(function (k) {
        var item = map[k];
        var limit = Number(budgetMap[k]) || 0;
        var income = Math.round(item.income * 100) / 100;
        var spent = Math.round(item.spent * 100) / 100;
        var remain = Math.round((limit - spent) * 100) / 100;
        return {
          month: k,
          income: income,
          spent: spent,
          balance: Math.round((income - spent) * 100) / 100,
          budget: limit > 0 ? Math.round(limit * 100) / 100 : 0,
          remain: remain,
          status: limit > 0 ? (remain >= 0 ? 'ok' : 'over') : 'none'
        };
      })
      .sort(function (a, b) {
        return b.month.localeCompare(a.month);
      });
  }

  /* ---------- 界面渲染 ---------- */

  function $(id) {
    return document.getElementById(id);
  }

  function toast(msg) {
    if (typeof document === 'undefined') return;
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.classList.remove('show');
    }, 1800);
  }

  function flashCard(id) {
    var card = $(id).parentElement;
    card.classList.remove('flash');
    void card.offsetWidth;
    card.classList.add('flash');
  }

  function refreshMood() {
    document.querySelectorAll('.mood-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mood === selectedMood);
    });
    var picked = null;
    var moods = currentType === 'expense' ? EXPENSE_MOODS : INCOME_MOODS;
    moods.forEach(function (m) {
      if (m.icon === selectedMood) picked = m;
    });
    $('moodCurrent').textContent = picked ? picked.icon + ' ' + picked.label : '';
  }

  function fillMoods() {
    var row = $('moodRow');
    row.innerHTML = '';
    var moods = currentType === 'expense' ? EXPENSE_MOODS : INCOME_MOODS;
    moods.forEach(function (m) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mood-btn';
      btn.dataset.mood = m.icon;
      btn.title = m.label;
      btn.textContent = m.icon;
      btn.addEventListener('click', function () {
        selectedMood = selectedMood === m.icon ? '' : m.icon;
        refreshMood();
      });
      row.appendChild(btn);
    });
    refreshMood();
  }

  function sortedEntries() {
    return entries.slice().sort(function (a, b) {
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    });
  }

  function monthOptions() {
    var set = {};
    entries.forEach(function (e) {
      set[monthKey(e.date)] = true;
    });
    return Object.keys(set).sort().reverse();
  }

  function renderAll() {
    renderSummary();
    renderMonthFilter();
    renderList();
    renderStats();
    renderBudget();
  }

  function renderSummary() {
    var now = todayStr();
    var income = 0;
    var expense = 0;
    entries.forEach(function (e) {
      if (monthKey(e.date) !== monthKey(now)) return;
      if (e.type === 'income') income += e.amount;
      else expense += e.amount;
    });
    $('sumIncome').textContent = formatMoney(income);
    $('sumExpense').textContent = formatMoney(expense);
    $('sumBalance').textContent = formatMoney(income - expense);
  }

  function renderMonthFilter() {
    var sel = $('monthFilter');
    var months = monthOptions();
    if (months.indexOf(viewMonth) === -1) months = months.concat([viewMonth]).sort().reverse();
    sel.innerHTML = '';

    months.forEach(function (k) {
      var opt = document.createElement('option');
      opt.value = k;
      opt.textContent = monthLabel(k);
      sel.appendChild(opt);
    });

    sel.value = viewMonth;
  }

  function animateMonthSwitch(direction, apply) {
    var reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      apply();
      return;
    }
    if (animatingMonth) return;
    animatingMonth = true;
    var front = document.querySelector('.flip-front');
    var outClass = direction > 0 ? 'month-out-left' : 'month-out-right';
    var inClass = direction > 0 ? 'month-in-right' : 'month-in-left';
    front.classList.add(outClass);
    setTimeout(function () {
      apply();
      front.classList.remove(outClass);
      front.classList.add(inClass);
      setTimeout(function () {
        front.classList.remove(inClass);
        animatingMonth = false;
      }, 240);
    }, 200);
  }

  function goMonth(delta) {
    animateMonthSwitch(delta, function () {
      viewMonth = shiftMonth(viewMonth, delta);
      selectedDay = null;
      renderMonthFilter();
      renderList();
    });
  }

  function renderList() {
    var month = $('monthFilter').value;
    if (!month) return;
    var list = sortedEntries().filter(function (e) {
      return monthKey(e.date) === month;
    });

    var days = {};
    list.forEach(function (e) {
      if (!days[e.date]) days[e.date] = { items: [], income: 0, expense: 0 };
      days[e.date].items.push(e);
      if (e.type === 'income') days[e.date].income += e.amount;
      else days[e.date].expense += e.amount;
    });
    if (selectedDay && !days[selectedDay]) selectedDay = null;

    var p = month.split('-');
    var year = Number(p[0]);
    var mon = Number(p[1]);
    var daysInMonth = new Date(year, mon, 0).getDate();
    var firstWeekday = (new Date(year, mon - 1, 1).getDay() + 6) % 7;
    var today = todayStr();

    var grid = $('calGrid');
    grid.innerHTML = '';
    var i;
    for (i = 0; i < firstWeekday; i++) {
      var blank = document.createElement('span');
      blank.className = 'cal-cell blank';
      grid.appendChild(blank);
    }
    for (var d = 1; d <= daysInMonth; d++) {
      var dateStr = year + '-' + (mon < 10 ? '0' + mon : mon) + '-' + (d < 10 ? '0' + d : d);
      var day = days[dateStr];
      var has = !!day;
      var kind = has ? (day.income > day.expense ? 'income' : day.expense > day.income ? 'expense' : 'both') : '';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-cell ball' + (has ? ' rec-' + kind : '') + (dateStr === today ? ' today' : '') + (dateStr === selectedDay ? ' selected' : '');
      btn.dataset.date = dateStr;
      btn.textContent = String(d);
      btn.title = dayLabel(dateStr) + (has ? ' · ' + day.items.length + ' 笔 · 收入 ' + formatMoney(day.income) + ' · 支出 ' + formatMoney(day.expense) : ' · 未记录');
      btn.setAttribute('aria-expanded', dateStr === selectedDay ? 'true' : 'false');
      grid.appendChild(btn);
    }

    var recorded = Object.keys(days).length;
    var income = 0;
    var expense = 0;
    list.forEach(function (e) {
      if (e.type === 'income') income += e.amount;
      else expense += e.amount;
    });
    $('listHint').textContent =
      '共 ' + recorded + ' 天有记录 · ' + list.length + ' 笔 · 收入 ' + formatMoney(income) + ' · 支出 ' + formatMoney(expense);
    $('listEmpty').classList.toggle('hidden', recorded > 0);

    renderDayDetail(month, days);
    syncFlip();
  }

  function renderDayDetail(month, days) {
    var box = $('dayDetail');
    if (!selectedDay || selectedDay.slice(0, 7) !== month || !days[selectedDay]) {
      box.classList.add('hidden');
      box.innerHTML = '';
      return;
    }
    var day = days[selectedDay];
    var items = day.items;
    box.classList.remove('hidden');
    box.innerHTML =
      '<div class="day-detail-head">' +
      '<strong>' + dayLabel(selectedDay) + '</strong>' +
      '<span class="day-detail-summary">' + items.length + ' 笔 · 收入 ' + formatMoney(day.income) + ' · 支出 ' + formatMoney(day.expense) + '</span>' +
      '<button type="button" class="day-back">← 返回</button>' +
      '</div>' +
      '<div class="table-wrap"><table class="ledger">' +
      '<thead><tr><th>类型</th><th>分类</th><th>心情</th><th class="num">金额</th><th>备注</th><th></th></tr></thead>' +
      '<tbody id="dayBody"></tbody></table></div>';
    var body = box.querySelector('#dayBody');
    items.forEach(function (e) {
      var tr = document.createElement('tr');
      tr.className = e.type + '-row';
      tr.innerHTML =
        '<td><span class="badge ' + e.type + '">' + (e.type === 'expense' ? '支出' : '收入') + '</span></td>' +
        '<td>' + categoryWithIcon(e.category) + '</td>' +
        '<td class="mood-cell">' + (e.mood ? esc(e.mood) : '<span class="muted">—</span>') + '</td>' +
        '<td class="num ' + e.type + '">' + signMoney(e.amount, e.type) + '</td>' +
        '<td class="note">' + (e.note ? renderNote(e.note, e.id) : '<span class="muted">—</span>') + '</td>' +
        '<td class="op"><button type="button" class="del" data-id="' + esc(e.id) + '">删除</button></td>';
      body.appendChild(tr);
    });
  }

  function renderNote(note, id) {
    if (note.length <= 12) return esc(note);
    return '<button type="button" class="note-toggle" data-id="' + esc(id) + '" title="点击查看完整备注">' + esc(note) + '</button>';
  }

  function openNotePopup(text) {
    $('notePopupText').textContent = text;
    $('notePopup').classList.remove('hidden');
  }

  function closeNotePopup() {
    $('notePopup').classList.add('hidden');
  }

  function syncFlip() {
    $('flipCard').classList.toggle('flipped', !!selectedDay);
  }

  function renderBars(id, list, type) {
    var box = $(id);
    box.innerHTML = '';

    if (!list.length) {
      box.innerHTML = '<p class="muted">暂无' + (type === 'expense' ? '支出' : '收入') + '记录</p>';
      return;
    }

    var total = 0;
    list.forEach(function (item) {
      total += item.amount;
    });
    list.forEach(function (item) {
      var pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
      var row = document.createElement(type === 'expense' ? 'button' : 'div');
      if (type === 'expense') {
        row.type = 'button';
        row.className = 'bar-row bar-detail-trigger';
        row.dataset.category = item.category;
        row.setAttribute('aria-label', '查看 ' + item.category + ' 支出明细');
      } else {
        row.className = 'bar-row';
      }
      row.innerHTML =
        '<span class="bar-head"><span class="bar-name">' + categoryWithIcon(item.category) + '</span>' +
        '<span class="bar-val">' + formatMoney(item.amount) + ' <em>' + pct + '%</em></span></span>' +
        '<span class="bar-track"><i style="width:' + pct + '%"></i></span>';
      box.appendChild(row);
    });
  }

  function openExpenseDetails(category) {
    var items = entries.filter(function (e) {
      return e.type === 'expense' && e.category === category && (statsMonth === 'all' || monthKey(e.date) === statsMonth);
    }).sort(function (a, b) {
      return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    });
    var total = items.reduce(function (sum, e) {
      return sum + e.amount;
    }, 0);

    $('statsPopupTitle').textContent = category + ' ' + categoryIcon(category);
    $('statsPopupMeta').textContent =
      (statsMonth === 'all' ? '全部时间' : monthLabel(statsMonth)) + ' · ' + items.length + ' 笔 · 共 ' + formatMoney(total);

    var list = $('statsDetailList');
    list.innerHTML = '';
    items.forEach(function (e) {
      var row = document.createElement('div');
      row.className = 'stats-detail-row';
      row.innerHTML =
        '<div class="stats-detail-main">' +
        '<span class="stats-detail-date">' + dayLabel(e.date) + '</span>' +
        '<span class="stats-detail-note">' + (e.note ? esc(e.note) : '<span class="muted">无备注</span>') + '</span>' +
        '</div>' +
        '<div class="stats-detail-side">' +
        '<span class="stats-detail-mood">' + (e.mood ? esc(e.mood) : '') + '</span>' +
        '<strong class="expense">' + signMoney(e.amount, e.type) + '</strong>' +
        '</div>';
      list.appendChild(row);
    });
    $('statsPopup').classList.remove('hidden');
    $('statsPopup').querySelector('.stats-popup-close').focus();
  }

  function closeExpenseDetails() {
    $('statsPopup').classList.add('hidden');
  }

  function renderStats() {
    var months = monthOptions();
    if (statsMonth === null || (statsMonth !== 'all' && months.indexOf(statsMonth) === -1)) {
      var cur = monthKey(todayStr());
      statsMonth = months.indexOf(cur) !== -1 ? cur : months.length ? months[0] : 'all';
    }

    var sel = $('statsMonthFilter');
    sel.innerHTML = '';
    var all = document.createElement('option');
    all.value = 'all';
    all.textContent = '全部';
    sel.appendChild(all);
    months.forEach(function (k) {
      var opt = document.createElement('option');
      opt.value = k;
      opt.textContent = monthLabel(k);
      sel.appendChild(opt);
    });
    sel.value = statsMonth;

    var scoped = statsMonth === 'all' ? entries : entries.filter(function (e) {
      return monthKey(e.date) === statsMonth;
    });
    $('statsScope').textContent = statsMonth === 'all' ? '全部时间' : monthLabel(statsMonth);

    var s = computeStats(scoped);
    $('totalIncome').textContent = formatMoney(s.totalIncome);
    $('totalExpense').textContent = formatMoney(s.totalExpense);
    $('totalBalance').textContent = formatMoney(s.balance);
    renderBars('expenseBars', s.expense, 'expense');
    renderBars('incomeBars', s.income, 'income');
  }

  function renderBudget() {
    var cur = monthKey(todayStr());
    var summaries = computeBudgetSummaries(entries, budgets, cur);
    var curItem = null;
    summaries.forEach(function (s) {
      if (s.month === cur) curItem = s;
    });

    $('budgetMonth').textContent = monthLabel(cur);
    var limit = curItem ? curItem.budget : 0;
    var spent = curItem ? curItem.spent : 0;
    $('budgetSpent').textContent = formatMoney(spent);
    $('budgetLimit').textContent = limit > 0 ? formatMoney(limit) : '未设置';

    var bar = $('budgetBar');
    if (limit > 0) {
      var usedPct = Math.round((spent / limit) * 100);
      bar.style.width = Math.min(usedPct, 100) + '%';
      bar.className = spent > limit ? 'over' : spent / limit >= 0.8 ? 'warn' : 'ok';
      var remain = curItem.remain;
      if (remain >= 0) {
        $('budgetRemain').textContent = '剩余 ' + formatMoney(remain) + ' · 已用 ' + usedPct + '%';
        $('budgetRemain').className = 'budget-remain ok';
      } else {
        $('budgetRemain').textContent = '已超出 ' + formatMoney(-remain) + ' · 已用 ' + usedPct + '%';
        $('budgetRemain').className = 'budget-remain over';
      }
    } else {
      bar.style.width = '0%';
      bar.className = '';
      $('budgetRemain').textContent = '还没设置预算，先设定本月消费限额吧';
      $('budgetRemain').className = 'budget-remain';
    }

    var body = $('budgetBody');
    body.innerHTML = '';
    summaries.forEach(function (s) {
      var isCurrent = s.month === cur;
      var statusHtml, diffHtml;
      if (s.status === 'none') {
        statusHtml = '<span class="muted">未设预算</span>';
        diffHtml = '<span class="muted">—</span>';
      } else if (s.status === 'ok') {
        statusHtml = '<span class="badge ok-badge">达标 ✓</span>' + (isCurrent ? ' <span class="muted">进行中</span>' : '');
        diffHtml = '<span class="income">+' + formatMoney(s.remain) + '</span>';
      } else {
        statusHtml = '<span class="badge over-badge">超标 ✗</span>' + (isCurrent ? ' <span class="muted">进行中</span>' : '');
        diffHtml = '<span class="expense">-' + formatMoney(-s.remain) + '</span>';
      }
      var tr = document.createElement('tr');
      tr.className = 'budget-row';
      tr.innerHTML =
        '<td>' + monthLabel(s.month) + '</td>' +
        '<td class="num income">' + formatMoney(s.income) + '</td>' +
        '<td class="num expense">' + formatMoney(s.spent) + '</td>' +
        '<td class="num ' + (s.balance >= 0 ? 'income' : 'expense') + '">' + formatMoney(s.balance) + '</td>' +
        '<td class="num">' + (s.budget > 0 ? formatMoney(s.budget) : '<span class="muted">—</span>') + '</td>' +
        '<td>' + statusHtml + '</td>' +
        '<td class="num">' + diffHtml + '</td>';
      body.appendChild(tr);
    });
    $('budgetEmpty').classList.toggle('hidden', summaries.length > 0);
    body.parentElement.classList.toggle('hidden', summaries.length === 0);
  }

  /* ---------- 交互 ---------- */

  function fillCategories() {
    var sel = $('category');
    sel.innerHTML = '';
    DEFAULT_CATEGORIES[currentType].forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c + ' ' + categoryIcon(c);
      sel.appendChild(opt);
    });
    var custom = document.createElement('option');
    custom.value = CUSTOM;
    custom.textContent = '自定义…';
    sel.appendChild(custom);
    $('customWrap').classList.add('hidden');
    $('customCategory').value = '';
  }

  function switchTab(name) {
    var panels = ['add', 'list', 'stats', 'budget'];
    document.querySelectorAll('.tab').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.tab === name);
    });
    panels.forEach(function (p) {
      var panel = $('panel-' + p);
      var show = p === name;
      panel.classList.toggle('hidden', !show);
      if (show) {
        panel.classList.remove('enter');
        void panel.offsetWidth;
        panel.classList.add('enter');
      }
    });
  }

  function bindEvents() {
    document.querySelectorAll('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(btn.dataset.tab);
      });
    });

    document.querySelectorAll('.type-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        currentType = btn.dataset.type;
        document.querySelectorAll('.type-btn').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        fillCategories();
        selectedMood = '';
        fillMoods();
      });
    });

    $('category').addEventListener('change', function () {
      var custom = $('category').value === CUSTOM;
      $('customWrap').classList.toggle('hidden', !custom);
      if (!custom) $('customCategory').value = '';
    });

    $('entryForm').addEventListener('submit', function (ev) {
      ev.preventDefault();

      var amount = parseFloat($('amount').value);
      if (!amount || !isFinite(amount) || amount <= 0) {
        toast('请输入正确的金额');
        return;
      }

      var category = $('category').value;
      if (category === CUSTOM) {
        category = $('customCategory').value.trim();
        if (!category) {
          toast('请输入自定义分类名称');
          return;
        }
      }

      var date = $('date').value;
      if (!date) {
        toast('请选择日期');
        return;
      }

      var entry = createEntry({
        type: currentType,
        amount: amount,
        category: category,
        date: date,
        note: $('note').value,
        mood: currentType === 'expense' ? selectedMood : ''
      });

      entries.unshift(entry);
      if (!saveEntries()) {
        entries.shift();
        return;
      }

      $('amount').value = '';
      $('note').value = '';
      $('customCategory').value = '';
      $('customWrap').classList.add('hidden');
      $('category').value = DEFAULT_CATEGORIES[currentType][0];
      selectedMood = '';
      refreshMood();
      renderAll();

      flashCard(entry.type === 'expense' ? 'sumExpense' : 'sumIncome');

      var btn = document.querySelector('.submit');
      clearTimeout(bindEvents._savedTimer);
      btn.classList.remove('success', 'income', 'expense');
      void btn.offsetWidth;
      btn.classList.add('success', currentType);
      btn.textContent = '✓ 已记' + (currentType === 'expense' ? '支出' : '收入');
      bindEvents._savedTimer = setTimeout(function () {
        btn.classList.remove('success', 'income', 'expense');
        btn.textContent = '保存账目';
      }, 900);

      toast((currentType === 'expense' ? '💸 已记支出 ' : '💰 已记收入 ') + signMoney(entry.amount, entry.type) + '（' + entry.category + '）' + (entry.mood ? ' ' + entry.mood : ''));
    });

    $('monthFilter').addEventListener('change', function () {
      var next = this.value;
      if (next === viewMonth) return;
      animateMonthSwitch(next > viewMonth ? 1 : -1, function () {
        viewMonth = next;
        selectedDay = null;
        renderList();
      });
    });

    $('monthPrev').addEventListener('click', function () {
      goMonth(-1);
    });

    $('monthNext').addEventListener('click', function () {
      goMonth(1);
    });

    var swipeX = null;
    var swipeY = null;
    $('flipScene').addEventListener('touchstart', function (ev) {
      var t = ev.changedTouches[0];
      swipeX = t.clientX;
      swipeY = t.clientY;
    }, { passive: true });
    $('flipScene').addEventListener('touchend', function (ev) {
      if (swipeX === null) return;
      var t = ev.changedTouches[0];
      var dx = t.clientX - swipeX;
      var dy = t.clientY - swipeY;
      swipeX = null;
      swipeY = null;
      if (Math.abs(dx) < 50) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.2) return;
      if (selectedDay) return;
      if (dx < 0) goMonth(1);
      else goMonth(-1);
    }, { passive: true });

    var wheelTimer = null;
    $('flipScene').addEventListener('wheel', function (ev) {
      if (selectedDay) return;
      var dx = ev.deltaX;
      var dy = ev.deltaY;
      if (Math.abs(dx) < 30) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.2) return;
      var now = Date.now();
      if (wheelTimer && now - wheelTimer < 500) return;
      wheelTimer = now;
      ev.preventDefault();
      if (dx > 0) goMonth(1);
      else goMonth(-1);
    }, { passive: false });

    $('statsMonthFilter').addEventListener('change', function () {
      statsMonth = this.value;
      renderStats();
    });

    $('expenseBars').addEventListener('click', function (ev) {
      var trigger = ev.target.closest('.bar-detail-trigger');
      if (!trigger) return;
      openExpenseDetails(trigger.dataset.category);
    });

    document.querySelectorAll('.theme-dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        if (dot.dataset.theme === document.documentElement.getAttribute('data-theme')) return;
        applyTheme(dot.dataset.theme);
        renderStats();
        toast('主题已切换');
      });
    });

    $('budgetForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var val = parseFloat($('budgetInput').value);
      if (!val || !isFinite(val) || val <= 0) {
        toast('请输入正确的预算金额');
        return;
      }
      var cur = monthKey(todayStr());
      budgets[cur] = Math.round(val * 100) / 100;
      if (!saveBudgets()) return;
      renderBudget();
      toast('本月预算已设为 ' + formatMoney(budgets[cur]));
    });

    $('calGrid').addEventListener('click', function (ev) {
      var ball = ev.target.closest('.ball');
      if (!ball) return;
      selectedDay = selectedDay === ball.dataset.date ? null : ball.dataset.date;
      renderList();
    });

    $('dayDetail').addEventListener('click', function (ev) {
      if (ev.target.closest('.day-back')) {
        selectedDay = null;
        renderList();
        return;
      }
      var noteBtn = ev.target.closest('.note-toggle');
      if (noteBtn) {
        openNotePopup(noteBtn.textContent);
        return;
      }
      var btn = ev.target.closest('.del');
      if (!btn) return;
      if (!window.confirm('确定删除这条记录吗？')) return;
      entries = entries.filter(function (e) {
        return e.id !== btn.dataset.id;
      });
      saveEntries();
      renderAll();
      toast('已删除');
    });

    $('notePopup').addEventListener('click', function (ev) {
      if (ev.target === this || ev.target.closest('.popup-close')) closeNotePopup();
    });

    $('statsPopup').addEventListener('click', function (ev) {
      if (ev.target === this || ev.target.closest('.popup-close')) closeExpenseDetails();
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        closeNotePopup();
        closeExpenseDetails();
      }
    });
  }

  function init() {
    $('today').textContent = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    applyTheme(loadTheme());
    $('date').value = todayStr();
    $('budgetInput').value = latestBudgetValue();
    fillCategories();
    fillMoods();
    $('moodWrap').classList.remove('hidden');
    bindEvents();
    renderAll();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      DEFAULT_CATEGORIES: DEFAULT_CATEGORIES,
      CUSTOM: CUSTOM,
      loadEntries: loadEntries,
      saveEntries: saveEntries,
      loadBudgets: loadBudgets,
      saveBudgets: saveBudgets,
      THEMES: THEMES,
      createEntry: createEntry,
      computeStats: computeStats,
      computeMonthlySummary: computeMonthlySummary,
      computeBudgetSummaries: computeBudgetSummaries,
      EXPENSE_MOODS: EXPENSE_MOODS,
      INCOME_MOODS: INCOME_MOODS,
      dayLabel: dayLabel,
      shiftMonth: shiftMonth,
      formatMoney: formatMoney,
      validEntry: validEntry
    };
  }
})();
