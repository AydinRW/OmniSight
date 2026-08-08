(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.I18n = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STRINGS = {
    zh: {
      appTitle: 'OmniSight · 线性日历',
      langToggle: '切换语言',
      langTarget: 'EN',
      langZh: '中文',
      langEn: 'English',
      menuOptions: '选项',
      menuSettings: '设置',
      menuHelp: '帮助',
      menuComingSoon: '即将推出',
      menuAbout: '关于 OmniSight',
      menuHelpGuide: '使用教程',
      aboutText: 'OmniSight 线性日历 v1.0.0\nby Aydin',
      helpSections: [
        {
          title: '一、创建事项（拖拽绘制）',
          lines: [
            '单击任意有效日期格：生成单日虚线草稿条；按住鼠标横向拖拽：生成跨天草稿条（可跨月）。',
            '按住 Ctrl 并多次单击：可追加多条独立的单日草稿条。',
            '拖拽时预览条右端会实时显示跨越天数；松开鼠标后草稿保留，双击草稿条或点击顶部【添加】按钮，填写名称、备注、颜色后确认即可创建。',
            '按 Esc 或点击页面空白处可取消全部草稿。'
          ]
        },
        {
          title: '二、跨天条目编辑',
          lines: [
            '鼠标悬停任意事项横条：可查看完整名称、备注与日期范围。',
            '双击横条：进入编辑弹窗，可修改名称、备注、颜色；编辑弹窗底部可用「− 天数 ＋」调整跨天长度（最少 1 天）。',
            '按住左键拖动横条：整条平移（可跨月、跨年）。',
            '右键横条：可删除单条或整条事项；跨天 ≥5 天的事项长条末尾会显示天数标注。'
          ]
        },
        {
          title: '三、批量操作',
          lines: [
            '点击顶部【批量删除】：进入多选模式，单击横条可选中/取消选中；点击【删除】一次性删除所有选中事项；点击【取消】退出且不删除。',
            '点击顶部【批量新增】：打开周期事项表单，按起始/结束日期与重复间隔天数批量生成周期事项。'
          ]
        },
        {
          title: '四、周期事项',
          lines: [
            '填写事项名称、起始年月日、结束年月日与重复间隔天数（N≥1），系统会从起始日期起每隔 N 天生成一个单日事项，直到结束日期。',
            '生成的条目保持系列关联：右键任意一条可选择「删除整条序列」；双击编辑时选择「整条周期序列」可统一修改名称与颜色。'
          ]
        },
        {
          title: '五、其他功能',
          lines: [
            '顶部 ◀ ▶ 切换年份，各年份数据相互独立。',
            '菜单栏【设置】可一键切换中英文界面；【帮助】可随时查看本教程。',
            '颜色面板提供「最近使用」与 5 组预设色板，点击色块即可快速取色。'
          ]
        }
      ],
      add: '添加',
      newItem: '批量新增',
      batchDelete: '批量删除',
      done: '删除',
      cancel: '取消',
      ok: '确定',
      opFail: '操作失败：',
      hint: '拖拽可绘制事项；Ctrl+单击多选；Esc 取消草稿；双击编辑；右键删除。',
      dataDirPrefix: '数据目录：',
      addTitle: (p) => '添加事项（' + p.n + ' 条草稿）',
      confirmAdd: '确认添加',
      fieldName: '事项名称',
      fieldNotes: '备注',
      fieldColor: '横条颜色',
      pickColor: '选择颜色',
      namePlaceholderAdd: '例如：和派大星一起去抓水母～',
      nameRequired: '请填写事项名称',
      recentLabel: '最近使用',
      newItemTitle: '新建周期事项',
      fieldStart: '起始年月日',
      fieldEnd: '结束年月日',
      fieldInterval: '重复间隔天数',
      namePlaceholderNew: '例如：和派大星一起发呆',
      dateRequired: '请填写起始/结束日期',
      endBeforeStart: '结束日期不能早于起始日期',
      intervalInvalid: '重复间隔天数须为大于等于 1 的整数',
      generate: '生成事项',
      editTitle: '编辑事项',
      save: '保存',
      scope: '修改范围',
      scopeSingle: '仅此条',
      scopeSeries: '整条周期序列',
      confirmTitle: '确认操作',
      okDelete: '确定删除',
      deleteSeriesConfirm: '确定删除整条周期序列？将删除该系列在全部年份中生成的所有事项。',
      ctxEdit: '编辑…',
      ctxDelete: '删除',
      ctxDeleteItem: '删除整条事项',
      ctxDeleteThis: '删除此条',
      ctxDeleteSeries: '删除整条序列',
      weekday: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      month: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    },
    en: {
      appTitle: 'OmniSight · Linear Calendar',
      langToggle: 'Switch Language',
      langTarget: '中文',
      langZh: '中文',
      langEn: 'English',
      menuOptions: 'Options',
      menuSettings: 'Settings',
      menuHelp: 'Help',
      menuComingSoon: 'Coming soon',
      menuAbout: 'About OmniSight',
      menuHelpGuide: 'User Guide',
      aboutText: 'OmniSight Linear Calendar v1.0.0\nby Aydin',
      helpSections: [
        {
          title: '1. Creating Events (Drag to Draw)',
          lines: [
            'Click any valid date cell to create a single-day dashed draft; drag horizontally to create a cross-day draft (months can be crossed).',
            'Hold Ctrl and click multiple cells to append several independent single-day drafts.',
            'While dragging, the right end of the preview shows the total day count live; after releasing, the draft stays. Double-click the draft bar or press the top "Add" button, fill in name / notes / color, and confirm.',
            'Press Esc or click blank space to discard all drafts.'
          ]
        },
        {
          title: '2. Editing Cross-Day Events',
          lines: [
            'Hover any event bar to preview its full name, notes, and date range.',
            'Double-click a bar to edit its name, notes, and color; at the bottom of the edit dialog you can use "− days ＋" to adjust the span (minimum 1 day).',
            'Drag a bar to move the whole event (across months and years).',
            'Right-click a bar to delete a single event or the whole item; events spanning 5 or more days show a day-count label at their end.'
          ]
        },
        {
          title: '3. Batch Operations',
          lines: [
            'Click the top "Batch Delete" button to enter multi-select mode: click bars to select/deselect; click "Delete" to remove all selected events at once; click "Cancel" to exit without deleting.',
            'Click the top "Batch Add" button to open the recurring-event form and generate periodic events by start/end date and repeat interval.'
          ]
        },
        {
          title: '4. Recurring Events',
          lines: [
            'Enter the event name, start date, end date, and repeat interval (N ≥ 1). The app generates one single-day event every N days from the start date through the end date.',
            'Generated items stay linked as a series: right-click any of them to "Delete entire series", or double-click and choose "Entire series" to edit name and color for all.'
          ]
        },
        {
          title: '5. Other Features',
          lines: [
            "Use the ◀ ▶ arrows at the top to switch years; each year's data is stored independently.",
            'The "Settings" menu toggles the UI language (中文 / English); "Help" opens this guide anytime.',
            'The color panel offers "Recently Used" colors and 5 preset palettes — click any swatch to pick a color quickly.'
          ]
        }
      ],
      add: 'Add',
      newItem: 'Batch Add',
      batchDelete: 'Batch Delete',
      done: 'Delete',
      cancel: 'Cancel',
      ok: 'OK',
      opFail: 'Operation failed: ',
      hint: 'Drag to draw; Ctrl+click multi-select; Esc discards drafts; double-click edits; right-click deletes.',
      dataDirPrefix: 'Data folder: ',
      addTitle: (p) => 'Add Event (' + p.n + (p.n === 1 ? ' draft' : ' drafts') + ')',
      confirmAdd: 'Confirm Add',
      fieldName: 'Event Name',
      fieldNotes: 'Notes',
      fieldColor: 'Bar Color',
      pickColor: 'Pick a color',
      namePlaceholderAdd: 'e.g., Go jellyfishing with Patrick~',
      nameRequired: 'Please enter the event name',
      recentLabel: 'Recently Used',
      newItemTitle: 'New Recurring Event',
      fieldStart: 'Start Date',
      fieldEnd: 'End Date',
      fieldInterval: 'Repeat Interval (days)',
      namePlaceholderNew: 'e.g., Space out with Patrick',
      dateRequired: 'Please enter the start and end dates',
      endBeforeStart: 'The end date cannot be earlier than the start date',
      intervalInvalid: 'Repeat interval must be an integer greater than or equal to 1',
      generate: 'Generate Events',
      editTitle: 'Edit Event',
      save: 'Save',
      scope: 'Apply To',
      scopeSingle: 'This item only',
      scopeSeries: 'Entire series',
      confirmTitle: 'Confirm',
      okDelete: 'Delete',
      deleteSeriesConfirm: 'Delete the entire recurring series? This removes all of its events across every year.',
      ctxEdit: 'Edit…',
      ctxDelete: 'Delete',
      ctxDeleteItem: 'Delete Event',
      ctxDeleteThis: 'Delete this item',
      ctxDeleteSeries: 'Delete entire series',
      weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    }
  };

  let current = 'zh';

  function setLang(lang) {
    current = lang === 'en' ? 'en' : 'zh';
  }

  function getLang() {
    return current;
  }

  function t(key, params) {
    let s = STRINGS[current][key];
    if (s === undefined) s = STRINGS.zh[key];
    if (typeof s === 'function') s = s(params || {});
    if (params) {
      for (const k in params) s = s.replace('{' + k + '}', params[k]);
    }
    return s;
  }

  return { setLang, getLang, t };
});
