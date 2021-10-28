/**
 * @copyright 2019-present, Tencent, Inc. All rights reserved.
 * @author Fenggang.Sun <fenggangsun@tencent.com>
 * @file 自定义Modal组件，支持显示区域slot
 */

const DEFAULT = { // 各属性默认值
  title: '',
  content: '',
  showCancel: true,
  cancelText: '取消',
  cancelColor: '#000000',
  confirmText: '确定',
  confirmColor: '#576B95',
  success: null,
  complete: null,
};

/**
 * 判定是否有效颜色色值
 * @param {String} color 颜色色值
 * @returns {Boolean} 是否有效颜色色值
 */
const isValidColor = color => /^#?([a-f0-9]{6}|[a-f0-9]{3})$/.test(color);

/**
 * 格式化颜色色值，将色值处理为有效的色值
 * @param {String} color 颜色色值
 * @returns {String} 格式化处理后的有效的颜色色值
 */
const formatColor = (color) => {
  if (isValidColor(color)) {
    return (color[0] === '#' ? color : `#${color}`).toUpperCase();
  }
  return '';
};

Component({
  options: {
    multipleSlots: true,
  },

  properties: {
    customConfirm: { // 是否自定义确认按钮
      type: Boolean,
      value: false,
    },
  },

  /**
   * 组件的初始数据
   */
  data: {
    visible: false, // Modal是否可见
    title: DEFAULT.title, // 提示的标题
    content: DEFAULT.content, // 提示的内容
    showCancel: DEFAULT.showCancel, // 是否显示取消按钮
    cancelText: DEFAULT.cancelText, // 取消按钮的文字，最多 4 个字符
    cancelColor: DEFAULT.cancelColor, // 取消按钮的文字颜色，必须是 16 进制格式的颜色字符串
    confirmText: DEFAULT.confirmText, // 确认按钮的文字，最多 4 个字符
    confirmColor: DEFAULT.confirmColor, // 确认按钮的文字颜色，必须是 16 进制格式的颜色字符串
    success: DEFAULT.success,
    complete: DEFAULT.complete,
  },


  /**
   * 组件的方法列表
   */
  methods: {
    show(options = {}) { // eslint-disable-line require-jsdoc
      if (this.data.visible) {
        return;
      }
      const getNonEmptyVal = (a, b) => a || b; // eslint-disable-line require-jsdoc
      const {
        title, content, showCancel, cancelText, cancelColor, confirmText, confirmColor,
        success, complete,
      } = options || {};
      this.setData({
        visible: true,
        title: getNonEmptyVal(title, DEFAULT.title),
        content: getNonEmptyVal(content, DEFAULT.content),
        showCancel: typeof showCancel === 'undefined' ? DEFAULT.showCancel : !!showCancel,
        cancelText: typeof cancelText === 'string' ? cancelText.substring(0, 4) : DEFAULT.cancelText,
        cancelColor: getNonEmptyVal(formatColor(cancelColor), DEFAULT.cancelColor),
        confirmText: typeof confirmText === 'string' ? confirmText.substring(0, 4) : DEFAULT.confirmText,
        confirmColor: getNonEmptyVal(formatColor(confirmColor), DEFAULT.confirmColor),
        success: getNonEmptyVal(success, DEFAULT.success),
        complete: getNonEmptyVal(complete, DEFAULT.complete),
      });
    },

    hide() { // eslint-disable-line require-jsdoc
      this.setData({ visible: false });
    },

    onCancel() { // eslint-disable-line require-jsdoc
      this.onSuccess(false);
    },

    onConfirm() { // eslint-disable-line require-jsdoc
      this.onSuccess(true);
    },

    onSuccess(confirm = false) { // eslint-disable-line require-jsdoc
      if (!this.data.visible) return;

      this.hide();

      const { success, complete } = this.data;
      if (typeof success === 'function') {
        success({ confirm });
      }
      if (typeof complete === 'function') {
        complete({ confirm, success: true, errMsg: 'ok' });
      }
    },
  },
});
