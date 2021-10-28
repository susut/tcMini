/**
 * @copyright 2019-present, Tencent, Inc. All rights reserved.
 * @author Fenggang.Sun <fenggangsun@tencent.com>
 * @file 自定义Drawer组件，支持显示区域slot
 */

const Mode = {
  top: 'top',
  right: 'right',
  bottom: 'bottom',
  left: 'left',
};

const DEFAULT = { // 各属性默认值
  cancel: null,
};

Component({
  properties: {
    animation: { // 打开和关闭drawer时是否启用动画
      type: Boolean,
      value: true,
    },

    mode: { // 内容排放模式：left-左对齐，top-顶部对齐，right-右对齐，bottom-底部对齐
      type: String,
      value: Mode.bottom,
    },

    showClose: { // 是否显示关闭按钮，显示关闭按钮时点击mask层不关闭drawer
      type: Boolean,
      value: false,
    },
  },

  data: {
    containerVisible: false, // Drawer容器是否可见，用于实现容器可见性及动画效果
    visible: false, // Drawer内部元素是否可见，用于实现动画效果
    cancel: null, // 点击蒙版区域时回调的方法
  },

  methods: {
    show(options = {}) { // eslint-disable-line require-jsdoc
      if (this.data.visible) {
        return;
      }

      const { cancel } = options || {};
      this.setData({ containerVisible: true, visible: true, cancel: cancel || DEFAULT.cancel });
    },

    hide() { // eslint-disable-line require-jsdoc
      if (this.data.animation) { // 如果动画效果启用，过300ms再更新容器可见性
        this.setData({ visible: false });
        setTimeout(() => {
          this.setData({ containerVisible: false });
        }, 300);
      } else { // 当前动画效果禁用了，立即更新容器可见性
        this.setData({ visible: false, containerVisible: false });
      }
    },

    clickMask() { // eslint-disable-line require-jsdoc
      this.close();
    },

    // 点击关闭
    close() { // eslint-disable-line require-jsdoc
      this.hide();
      const { cancel } = this.data;
      if (typeof cancel === 'function') {
        cancel();
      }
    },

    // 停止冒泡用
    stopPropagation() {}, // eslint-disable-line require-jsdoc
  },
});
