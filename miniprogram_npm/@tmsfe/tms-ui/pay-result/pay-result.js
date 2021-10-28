import Entity from './entity';

Component({
  options: {
    multipleSlots: true, // 启用多slot支持
  },
  data: Entity.data,
  properties: Entity.properties,

  attached() { // eslint-disable-line require-jsdoc
    const { bussinessType, orderId } = this.data;
    Entity.reportAttached(bussinessType, orderId);
    this.setData({ static: Entity.getStaticData(bussinessType) });
    const appShowScene = wx.getStorageSync('appShowScene');
    const { appId, env } = wx.getSystemInfoSync()?.host || {};
    const hostAppId = appId || env || 'unknown';
    Entity.getDynamicData(bussinessType, { appShowScene, hostAppId, ...(this.data.extraConfAttr || {}) })
      .then(dynamic => this.setData(dynamic));
  },

  methods: {
    disableScroll() { // eslint-disable-line require-jsdoc
      return false;
    },

    onBannerUpdate(e) { // eslint-disable-line require-jsdoc
      this.setData({ hasBanner: !!e.detail.state });
    },

    nav() { // eslint-disable-line require-jsdoc
      Entity.nav(this.data.destination);
    },

    tel() { // eslint-disable-line require-jsdoc
      Entity.makePhoneCall(this.data.phone);
    },

    toDetail() { // eslint-disable-line require-jsdoc
      Entity.toDetail(this.data.bussinessType, this.data.orderId);
    },

    toRecharge() { // eslint-disable-line require-jsdoc
      Entity.toRecharge(this.data.bussinessType, this.data.orderId);
    },

    toTarget() { // eslint-disable-line require-jsdoc
      Entity.toTarget(this.data);
    },

    toFuelConsumption() { // eslint-disable-line require-jsdoc
      Entity.toFuelConsumption(this.data.orderId);
    },

    toCommentPage() { // eslint-disable-line require-jsdoc
      Entity.toCommentPage(this.data, (status) => {
        const showCommentEntry = !status;
        this.setData({ showCommentEntry });
        if (showCommentEntry) {
          Entity.reportAction(1, this.data); // 服务评价入口展现上报
        }
      });
    },
  },
});
