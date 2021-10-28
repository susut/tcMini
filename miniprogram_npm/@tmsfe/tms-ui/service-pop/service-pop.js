/**
 * @copyright 2020-present, Tencent, Inc. All rights reserved.
 * @author: gaoyanli <gaoyanli@tencent.com>
 * @file 客服弹窗
 */

import tmsCoreObj from '@tmsfe/tms-core'; // eslint-disable-line import/no-unresolved

import platformUtils from '../platformUtils';

const { getReporter } = tmsCoreObj;
const Report = getReporter().report;
Component({
  properties: {
    page: {
      type: String,
      value: '',
    },
    fswinConfParam: {
      type: Object,
      value: {},
    },
  },

  data: {
    showPop: false,
  },

  lifetimes: {
    attached() { // eslint-disable-line
      this.registerCaptureListener();
    },
  },

  pageLifetimes: {
    show() { // eslint-disable-line
      this.registerCaptureListener();
    },

    hide() { // eslint-disable-line
      this.unregisterCaptureListener();
    },
  },

  methods: {
    /**
     * 注册截屏监听
     * @returns {void}
     */
    registerCaptureListener() {
      if (this.registeredCaptureListener) return;
      this.registeredCaptureListener = true;
      if (!wx.onUserCaptureScreen) return;

      wx.onUserCaptureScreen(() => {
        const { model } = platformUtils.getSystemInfo();
        if (String(model).search('iPhone') > -1) {
          const timeShow = setTimeout(() => {
            this.setData({ showPop: true });
            clearTimeout(timeShow);
          }, 0);
        } else {
          this.setData({ showPop: true });
        }
        Report({ 26: 'SV', 27: 'SV001', 38: this.data.fswinConfParam, 39: this.data.page, 40: 'showPop' });
        this.onTimeoutHide(5000);
        this.triggerEvent('on-capture-screen', {});
      });
    },

    /**
     * 取消截屏监听
     * @returns {void}
     */
    unregisterCaptureListener() {
      this.registeredCaptureListener = false;
      if (wx.offUserCaptureScreen) {
        wx.offUserCaptureScreen();
        this.triggerEvent('off-capture-screen', {});
      }
    },

    /**
     * 关闭客服引导气泡
     * @returns {void}
     */
    close() {
      this.setData({ showPop: false });
    },

    /**
     * 点击联系客服
     * @returns {void}
     */
    onClickFeedBack() {
      this.onTimeoutHide(0);
      Report({ 26: 'SV', 27: 'SV002', 38: this.data.fswinConfParam, 39: this.data.page, 40: 'clickFeedBack' });
    },

    /**
     * 点击常见问题
     * @returns {void}
     */
    onClickProblem() {
      this.onTimeoutHide(0);
      if (platformUtils.isSinan()) {
        wx.navigateTo({ url: '/modules/me/pages/faq/index' });
      } else {
        wx.navigateTo({ url: '/modules/marketing/faq2/help' });
      }
      Report({ 26: 'SV', 27: 'SV003', 38: this.data.fswinConfParam, 39: this.data.page, 40: 'clickProblem' });
    },

    /**
     * 关闭客服引导
     * @param {Number} time 关闭客服引导的延迟时间，单位：毫秒
     * @returns {void}
     */
    onTimeoutHide(time) {
      const timeHide = setTimeout(() => {
        this.setData({ showPop: false });
        clearTimeout(timeHide);
      }, time);
    },
  },
});
