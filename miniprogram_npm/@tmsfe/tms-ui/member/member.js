import platformUtils from '../platformUtils';
import tmsCore from '@tmsfe/tms-core'; // eslint-disable-line import/no-unresolved

Component({
  properties: {
    // 引用组件的页面/组件是否满足显示该组件的条件。
    meetCondition: {
      type: Boolean,
    },

    // 使用该组件的来源。。
    from: {
      type: String,
      value: 'commonEntry',
    },
  },

  created() { // eslint-disable-line require-jsdoc
    this.render();
  },

  data: {
    canShowEntry: platformUtils.isSinan(), // 仅在出行小程序中展示
    memberType: 1,                  // 用户身份类型。 0 - 普通用户,1 - 会员，2 - 体验会员
  },

  pageLifetimes: {
    show() { // eslint-disable-line require-jsdoc
      this.render();
    },
  },

  methods: {
    /**
     * 渲染组件
     * @returns {void}
     */
    async render() {
      try {
        const member = await this.fetchMemberType();
        const { memberType = 0 } = member;
        const isOpen = true;
        this.setData({ memberType, isOpen });
        this.triggerEvent('updated', { show: isOpen });
      } catch (e) {
        const isOpen = false;
        this.setData({ memberType: 1, isOpen });
        this.triggerEvent('updated', { show: isOpen });
      }
    },

    /**
     * 查询用户身份
     * @returns {Promise<Object>} 用户身份数据
     */
    async fetchMemberType() {
      try {
        const res = await tmsCore.createRequest().get('marketing/member/user/type', {});
        const { errCode, resData = {} } = res || {};
        if (errCode === 0) {
          return resData;
        }

        return Promise.reject(res);
      } catch (e) {
        return Promise.reject(e);
      }
    },

    /**
     * 点击月卡购买入口
     * @returns {void}
     */
    onTapBtn() {
      this.triggerEvent('openBuyPage', {});
      wx.navigateTo({
        url: `/modules/operating/monthlycard/pages/center/center?from=${this.data.from}`,
      });
    },
  },
});
