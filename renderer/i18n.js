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
      aboutText: 'OmniSight 线性日历 v1.0.0\nby Aydin',
      add: '添加',
      newItem: '新建事项',
      batchDelete: '批量删除',
      done: '完成',
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
      namePlaceholderAdd: '例如：项目周报',
      nameRequired: '请填写事项名称',
      recentLabel: '最近使用',
      newItemTitle: '新建周期事项',
      fieldStart: '起始年月日',
      fieldEnd: '结束年月日',
      fieldInterval: '重复间隔天数',
      namePlaceholderNew: '例如：每日晨会',
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
      aboutText: 'OmniSight Linear Calendar v1.0.0\nby Aydin',
      add: 'Add',
      newItem: 'New Event',
      batchDelete: 'Batch Delete',
      done: 'Done',
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
      namePlaceholderAdd: 'e.g., Project Report',
      nameRequired: 'Please enter the event name',
      recentLabel: 'Recently Used',
      newItemTitle: 'New Recurring Event',
      fieldStart: 'Start Date',
      fieldEnd: 'End Date',
      fieldInterval: 'Repeat Interval (days)',
      namePlaceholderNew: 'e.g., Daily Standup',
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
