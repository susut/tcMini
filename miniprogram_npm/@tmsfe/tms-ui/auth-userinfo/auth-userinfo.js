const DEFAULT_USERINFO = {
  nickName: '微信用户',
  avatarUrl: 'https://thirdwx.qlogo.cn/mmopen/vi_32/POgEwh4mIHO4nibH0KlMECNjjGxQUq24ZEaGT4poC6icRiccVGKSyXwibcPq4BWmiaIGuG1icwxaQX6grC9VemZoJ8rg/132',
  gender: 0,
  country: '',
  province: '',
  city: '',
  language: '',
};

Component({
  properties: {
    showUserInfoModal: {
      type: Boolean,
      value: false,
    },

    customUI: {
      type: Boolean,
      value: false,
    },

    useDesc: {
      type: String,
      value: '',
    },
  },

  methods: {
    /**
     * 获取用户信息，兼容getUserProfile、getUserInfo接口
     * @returns {void}
     */
    getUserInfo() {
      if (this.gettingUserInfo) return;
      this.gettingUserInfo = true;

      const success = (res) => { // eslint-disable-line require-jsdoc
        this.triggerEvent('auth-changed', { cancel: false, userInfo: res.userInfo || DEFAULT_USERINFO }); // 兼容老代码
        this.triggerEvent('getUserInfo', { success: true, userInfo: res.userInfo || DEFAULT_USERINFO, error: null });
      };
      const fail = (e) => { // eslint-disable-line require-jsdoc
        this.triggerEvent('auth-changed', { cancel: true, userInfo: DEFAULT_USERINFO, error: e }); // 兼容老代码
        this.triggerEvent('getUserInfo', { success: false, userInfo: DEFAULT_USERINFO, error: e });
      };
      const complete = () => this.gettingUserInfo = false; // eslint-disable-line require-jsdoc

      if (wx.getUserProfile) { // 使用最新接口
        wx.getUserProfile({ success, fail, complete, desc: this.data.useDesc || '提供更好的出行服务' });
      } else { // 使用老接口
        wx.getUserInfo({ success, fail, complete });
      }
    },
  },
});
