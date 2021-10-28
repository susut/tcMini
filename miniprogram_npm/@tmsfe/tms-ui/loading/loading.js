/**
 * @copyright 2019-present, Tencent, Inc. All rights reserved.
 * @author: Fenggang.Sun <fenggangsun@tencent.com>
 * @file 加载中组件
 */

const modePropClassMap = {
  fullScreen: 'full-screen',
  toast: 'toast',
};

Component({
  properties: {
    size: { // 图标大小：default-默认，small-小
      type: String,
      value: 'default',
    },

    text: { // 显示的文字，默认'正在加载'
      type: String,
      value: '正在加载',
    },

    mode: { // 模式：inline-行内元素（默认），fullScreen-全屏，toast-Toast
      type: String,
      value: 'inline',
      observer(val, oldVal) { // eslint-disable-line require-jsdoc
        if (val !== oldVal) {
          this.setModeClassName(val);
        }
      },
    },

    direction: { // 图标和文字的排列方向：horizontal-水平（默认），vertical-竖直
      type: String,
      value: 'horizontal',
    },

    mask: { // 是否显示遮罩层，仅当mode为toast时此属性生效。显示遮罩层时，用户无法触控遮罩层遮住的元素
      type: Boolean,
      value: true,
    },
  },

  data: {
    modeClassName: '', // 模式的样式名，可能值有full-screen, toast, ''
  },

  attached() { // eslint-disable-line require-jsdoc
    this.setModeClassName(this.data.mode);
  },

  methods: {
    setModeClassName(mode) { // eslint-disable-line require-jsdoc
      if (mode === 'fullScreen' || mode === 'toast') {
        this.setData({ modeClassName: modePropClassMap[mode] || '' });
      } else {
        this.setData({ modeClassName: '' });
      }
    },
  },
});
