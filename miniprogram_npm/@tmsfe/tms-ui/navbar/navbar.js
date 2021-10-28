/**
 * @copyright 2019-present, Tencent, Inc. All rights reserved.
 * @author Judisonli <judisonli@tencent.com>
 * @file 自定义导航栏组件，支持显示区域slot, 支持设置标题，支持返回上一级页面
 */

import { getNavBarConfigData, getHomePath } from './utils';

/**
 * 调整透明度值，保证其值合法且精度合理
 * @param {Number} opacity 透明度
 * @returns {Number} 处理后的透明度
 */
const adjustOpacity = (opacity) => {
  if (opacity > 1) return 1;
  if (opacity < 0) return 0;
  return Math.round(opacity * 100) / 100; // 保留必要精度（2位小数）
};

Component({
  options: {
    multipleSlots: true,
  },

  properties: {
    styleName: { // 样式风格
      type: String,
      value: 'dark', // 只支持dark和light两种
    },

    float: { // 是否浮动于普通文档流中
      type: Boolean,
    },

    title: { // 导航栏标题
      type: String,
      value: '',
    },

    frontColor: { // 导航栏标题颜色
      type: String,
      value: '#333',
    },

    backgroundColor: { // 导航栏背景色
      type: String,
      value: '#fff',
    },

    containerBgColor: { // 导航栏容器背景色
      type: String,
      value: 'transparent',
    },

    enableHomeNav: { // 是否启用首页导航功能
      type: Boolean,
      value: false,
    },

    customContent: { // 是否自定义导航栏内元素
      type: Boolean,
      value: false,
    },

    customHomeBtn: { // 是否使用自定义slot配置Home按钮
      type: Boolean,
      value: false,
    },

    customHomeEvent: { // 是否自定义首页按钮事件，仅当customHomeBtn=false时生效
      type: Boolean,
      value: false,
    },

    customBackBtn: { // 是否使用自定义slot配置返回按钮
      type: Boolean,
      value: false,
    },

    customBackEvent: { // 是否自定义返回按钮事件，仅当customBackBtn=false时生效
      type: Boolean,
      value: false,
    },

    backBtnVisible: { // 返回按钮是否可见，customBackBtn时需要传递此参数
      type: Boolean,
      value: true,
    },

    customTitle: { // 是否使用自定义slot配置标题
      type: Boolean,
      value: false,
    },

    customBackground: { // 是否自定义导航栏样式
      type: Boolean,
      value: false,
    },

    gradient: { // 是否应用默认的渐变效果
      type: Boolean,
      value: false,
    },

    // 页面上划偏移量scrollTop
    // 使用默认导航栏样式时需传入此值，才能保证导航栏背景色的正常变化
    pageScrollTop: {
      type: Number,
      value: 0,
    },
  },

  observers: {
    /**
     * 监听页面滚动值变化，更新导航栏样式
     * @param {Number} val 页面滚动偏移量
     * @returns {Undefined} undefined
     */
    pageScrollTop(val) {
      if (!this.data.customBackground) {
        this.updateNavOnPageScroll(val);
      }
    },
  },

  data: {
    showBackBtn: false,
    backType: '', // 返回按钮类型，可取值有：mp 返回其他小程序，app 返回APP，其他 返回当前小程序其他页面
    showHomeBtn: false,
    borderBottom: 'none', // 底部边框样式
    bgOpacity: 1,
  },

  headerHeight: 0,
  pageScrollTop: 0,
  updateNavOnPageScrollTimer: null,
  homePageIndex: -1,
  currentPageIndex: -1,

  created() { // eslint-disable-line require-jsdoc
    this.headerHeight = 0;
    this.pageScrollTop = 0;
    this.updateNavOnPageScrollTimer = null;
    this.homePageIndex = -1;
    this.currentPageIndex = -1;
    this.hasPrevPage = false;
  },

  attached() { // eslint-disable-line require-jsdoc
    const config = getNavBarConfigData();
    this.headerHeight = config.navBarHeight + config.statusBarHeight + 560;
    if (!this.data.customBackground) {
      this.updateDefaultNav(this.data.pageScrollTop);
    }

    const pages = getCurrentPages() || [];
    this.hasPrevPage = pages.length > 1;
    const appShowScene = wx.getStorageSync('appShowScene');

    let showHomeBtn = appShowScene !== 1168; // 1168 在非微信app端内打开小程序
    if (showHomeBtn) { // 场景符合home展示条件时，再看是否需要展示home按钮
      this.currentPageIndex = pages.length - 1;
      pages.some((page, index) => {
        const pagePath = String(page && page.route);
        const homePath = getHomePath();
        if (homePath === pagePath || homePath === `/${pagePath}`) {
          this.homePageIndex = index;
          return true;
        }
        return false;
      });
      showHomeBtn = this.currentPageIndex > 0 || this.homePageIndex === -1;
    }

    this.updateBackBtn(appShowScene);
    const { enable, navBarHeight, statusBarHeight } = config;
    this.setData(
      { ...{ enable, navBarHeight, statusBarHeight }, showHomeBtn },
      () => this.triggerEvent('navBarAttached', { ...this.data, ...config, showHomeBtn }),
    );
  },

  pageLifetimes: {
    show() { // eslint-disable-line require-jsdoc
      // 在部分情况下，需要重新渲染返回按钮
      const { customBackBtn, showBackBtn } = this.data;
      // 以满足以下条件时，重新渲染返回按钮
      // 1. 使用默认的返回按钮（非自定义模式）
      // 2. 原先返回按钮不可见，有可能现在变为可见
      if (!customBackBtn && !showBackBtn) {
        this.updateBackBtn();
      }
    },
  },

  methods: {
    /**
     * 更新返回按钮（可见性，点击响应）
     * @param {Number} appShowScene app onShow 场景值
     * @returns {Undefined} undefined
     */
    updateBackBtn(appShowScene) {
      // 使用方自定义返回按钮，组件内不作干预
      if (this.data.customBackBtn) return;

      // 当前页不是底页，可以正常返回上一页
      if (this.hasPrevPage) { // 有“上一页”
        this.setData({ showBackBtn: true, backType: '' });
        return;
      }

      // 判定是否可以返回到其他小程序
      const latestShowScene = appShowScene || wx.getStorageSync('appShowScene');
      if (latestShowScene === 1037) { // 1037 小程序打开小程序
        this.setData({ showBackBtn: true, backType: 'mp' });
        return;
      }
      // else 其他情况下，维持现状不变，包括返回到小程序等情况
    },

    navBack() { // eslint-disable-line require-jsdoc
      const { backType } = this.data;
      this.triggerEvent('tapBtn', { name: 'back', target: backType || 'self' }); // 抛出点击事件
      if (backType === 'mp') return; // 返回到其他小程序，使用原生组件能力，此处直接退出
      if (this.data.customBackEvent) return; // 自定义返回事件处理，直接退出

      wx.navigateBack(); // 默认行为，返回到上一页
    },

    navHome() { // eslint-disable-line require-jsdoc
      this.triggerEvent('tapBtn', { name: 'home' }); // 抛出点击事件
      if (this.data.customHomeEvent) return; // 自定义home事件处理，直接退出

      if (this.homePageIndex > -1) {
        wx.navigateBack({ delta: this.currentPageIndex - this.homePageIndex });
      } else if (this.currentPageIndex <= 0) {
        wx.redirectTo({ url: getHomePath() });
      } else {
        wx.reLaunch({ url: getHomePath() });
      }
    },

    navBarTouchHandler(e) { // eslint-disable-line require-jsdoc
      this.triggerEvent('navBarTouch', { eventInfo: e, data: this.data });
    },

    /**
     * 页面滚动时，修改背景色
     * 此方法进行优化处理，避免过多setData
     * @param {Number} pageScrollTop 页面滚动偏移量
     * @returns {Undefined} undefined
     */
    updateNavOnPageScroll(pageScrollTop) {
      if (this.data.customBackground) return;

      this.pageScrollTop = pageScrollTop; // 只记录最新的pageScrollTop

      // 如果已经存在更新背景色的定时任务，退出当前处理，等待定时任务执行即可
      if (this.updateNavOnPageScrollTimer) return;

      // 启动一个定时任务，30ms后再更新背景色
      this.updateNavOnPageScrollTimer = setTimeout(() => {
        clearTimeout(this.updateNavOnPageScrollTimer);
        this.updateNavOnPageScrollTimer = null;
        this.updateDefaultNav(this.pageScrollTop);
      }, 30);
    },

    updateDefaultNav(pageScrollTop) { // eslint-disable-line require-jsdoc
      const navBarOpacity = adjustOpacity(((pageScrollTop * 2) / this.headerHeight) * 3);
      const bgOpacity = adjustOpacity(navBarOpacity * 2);
      const borderBottomColorNum = parseInt((1 - navBarOpacity) * 255, 10);
      const borderBottom = `1rpx solid rgba(${borderBottomColorNum},${borderBottomColorNum},${borderBottomColorNum},${navBarOpacity / 10})`;
      this.setData({ bgOpacity, borderBottom });
    },
  },
});
