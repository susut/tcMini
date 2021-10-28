import platformUtils from '../platformUtils';

const HideFavoriteSceneList = [1001, 1089, 1103, 1104, 1168]; // 不展示“添加到我的小程序引导”的场景值
const UserCloseFavoriteKey = 'favorite_closed'; // 存储用户是否关闭过该提示信息的标志位
const ArrowWidth = 10; // 箭头宽度

Component({
  properties: {
    // 用于区分是否已展示过添加小程序引导到key
    key: {
      type: String,
    },
    // 引导蓝样式模式
    mode: {
      type: String, // 支持bubble/line，默认为line
    },
    // 容器背景色，防止页面滑动时透出页面颜色
    wrapBgColor: {
      type: String,
      value: '#fff',
    },
    // 边框颜色
    borderColor: {
      type: String,
      value: 'rgba(100, 133, 193, 0.3)',
    },
    // 背景色
    bgColor: {
      type: String,
      value: '#eff6ff',
    },
    // 文字颜色
    color: {
      type: String,
      value: '#6485c1',
    },
    // 下拉时背景色，在IOS上生效
    pullDownBgColor: {
      type: String,
      value: 'transparent',
    },
    // 文案
    content: {
      type: String,
      value: platformUtils.isSinan() ? '添加到我的小程序，下拉微信首页就能找到' : '添加到我的小程序, 下次打开更方便',
    },
    // 副文案
    subContent: {
      type: String,
      value: '',
    },
    // 是否滚动
    floating: {
      type: Boolean,
      value: false,
    },
    // 关闭图标
    closeIconType: {
      type: String,
      value: '',
    },
    // 气泡模式下顶部尖角类型，支持 black white
    bubbleArrowType: {
      type: String,
      value: 'black',
    },
    // 气泡模式添加按钮的样式全文
    bubbleButtonStyle: {
      type: String,
      value: '',
    },
  },

  data: {
    // 动画数据
    animationData: {},
    // 隐藏后取消占位
    show: true,
    // 是否出行服务
    isSinan: platformUtils.isSinan(),
    // 是否显示动画
    showAni: true,
    // 是否显示引导
    showGuide: false,
  },

  rendered: false,

  pageLifetimes: {
    show() { // eslint-disable-line require-jsdoc
      if (this.rendered) {
        this.render();
      }
    },
  },

  ready() { // eslint-disable-line require-jsdoc
    this.render();
  },

  methods: {
    /**
     * 渲染组件
     * @returns {void}
     */
    render() {
      const launchParam = { scene: 0 };
      let hasClosed = false;

      try {
        // 小程序启动参数
        const options = wx.getEnterOptionsSync && wx.getEnterOptionsSync();
        launchParam.scene = options?.scene || 0;
        // 用户是否曾经关闭过该提示信息
        const key = this.data.key ? `${UserCloseFavoriteKey}_${this.data.key}` : UserCloseFavoriteKey;
        hasClosed = wx.getStorageSync(key);
      } catch (e) {
        hasClosed = true;
      }

      // 展示添加小程序提示
      if (!(hasClosed || HideFavoriteSceneList.includes(launchParam.scene))) {
        // 渲染箭头，需要将箭头定位在"..."正下方
        this.renderArrow();
        // 显示添加小程序提示
        this.show();
        this.rendered = true;
      } else {
        this.hide();
      }
    },

    /**
     * 展示'添加到小程序'提示
     * @returns {void}
     */
    show() {
      // 创建动画
      const animationData = this.createAnimation('84rpx', 1);
      this.setData({ animationData }, () => setTimeout(() => this.triggerEvent('display-changed', true), 210));
    },

    /**
     * 隐藏'添加到小程序'提示
     * @returns {void}
     */
    hide() {
      // 创建动画
      const animationData = this.createAnimation('0rpx', 0);
      this.setData({ animationData }, () => {
        this.setData({ show: false });
        this.triggerEvent('display-changed', false);
      });
    },

    /**
     * 手动关闭引导条
     * @returns {void}
     */
    close() {
      this.hide();
      // 设置引导条已经展示过
      try { // 消除异常情况下的线上告警
        const key = this.data.key ? `${UserCloseFavoriteKey}_${this.data.key}` : UserCloseFavoriteKey;
        wx.setStorageSync(key, true);
      } catch (_) {}
    },

    /**
     * 创建展开和隐藏动画
     * @param {Number} hieght 高度
     * @param {Number} opacity 透明度
     * @returns {Animation} 动画
     */
    createAnimation(hieght, opacity) {
      const animation = wx.createAnimation({
        duration: 200,
        timingFunction: 'ease-in-out',
      });
      animation.height(hieght).opacity(opacity)
        .step();

      return animation.export();
    },

    /**
     * 渲染箭头
     * @returns {void}
     */
    renderArrow() {
      let menuRectInfo = { left: 0, width: 88 };

      try {
        // 获取胶囊区域位置信息
        // 从告警信息看，即使方法调用成功，返回值也有可能是undefined，因此做一下兼容
        menuRectInfo = wx.getMenuButtonBoundingClientRect() || menuRectInfo;
      } catch (e) {

      }

      const { width } = menuRectInfo;
      let { left } = menuRectInfo;
      // 获取胶囊位置失败 | 接口返回数据异常时，使用默认值
      if (left <= 0) {
        left = '80.9%';
      } else {
        left = left - (ArrowWidth / 3) + (width / 4);
      }

      this.setData({ arrowLeft: left });
    },

    /**
     * 显示添加到我的小程序引导
     * @returns {void}
     */
    showGuide() {
      this.setData({ showAni: false, showGuide: true });
    },

    /**
     * 隐藏添加到我的小程序引导
     * @returns {void}
     */
    hideGuide() {
      this.setData({ showAni: true, showGuide: false });
    },

    /**
     * 禁止滚动
     * @returns {void}
     */
    disableScroll() {
      return false;
    },
  },
});
