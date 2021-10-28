import tmsCoreObj from '@tmsfe/tms-core'; // eslint-disable-line import/no-unresolved

import platformUtils from '../platformUtils';

const { createRequest, getLogManager } = tmsCoreObj;
const AuthScopeAddress = 'scope.address';
const AuthScopeLocation = 'scope.userLocation';

const R = createRequest();
const tmsCore = { getLogManager };

Component({
  properties: {
    // SP的ID
    spId: {
      type: String,
      value: '',
    },

    // 业务ID，比如挪车码，驾照翻译、ETC等
    businessId: {
      type: String,
      value: '',
    },

    buttonText: {
      type: String,
      value: '保存',
    },
  },

  data: {
    name: '',
    phone: '',
    address: '',
    region: [],       // ['北京', '北京', '海淀']
    adCode: '',
    nation: '',       // 国家，只在用户地图选点，通过逆地址解析的情况下才有值
    ifCanSave: false, // 当前所填数据是否合法，通过合法性检查才可以保存
    tipShow: false,   // 是否展示错误提示
    deviceClass: platformUtils.getDeviceClass(), // 机型适配
  },

  logger: null,

  async attached() { // eslint-disable-line require-jsdoc
    // 获取物流地址
    const res = await R.get('user/delivery/get', {});

    if (res.errCode !== 0 || !res.resData.info || res.resData.info.length === 0) {
      return;
    }

    const [info] = res.resData.info;
    const { name } = info;
    const address = info.deliveryAddress;
    const phone = info.mobilePhone;
    const region = [info.province, info.city, info.district];

    this.data.adCode = info.adcode;

    this.setData({
      name,
      phone,
      region,
      address,
    });

    this.setData({
      ifCanSave: this.validate(),
    });

    const sysInfo = wx.getSystemInfoSync();
    const isIPhone = sysInfo.model.search('iPhone') !== -1;
    this.setData({
      iPhoneStyle: isIPhone ? 'iPhoneStyle' : '',
    });
  },

  methods: {
    // 点击获取微信地址薄按钮
    wechatAddressTap() { // eslint-disable-line require-jsdoc
      this.getUserAuth(AuthScopeAddress)
        .then(() => this.chooseWXAddr()) // 获取授权成功（已有授权，或新授权成功），调起用户微信收货地址界面
        .catch((e) => { // 引导用户在设置页授权失败
          if (!e.isFirstAuth && !e.cancel) {
            // e.isFirstAuth 表示用户第一次授权且拒绝了，不作提示
            // e.cancel 表示用户看到了弹窗但拒绝进入设置页，不作提示
            // 其他情况，表示用户进入了设置页但未完成授权，提示
            wx.showToast({ title: '未授权获取微信地址薄', icon: 'none' });
          }
        });
    },

    // 调用接口，显示微信收货地址页面，成功选择地址后填充到当前组件
    // 注意，调用本方法前需保证以获得用户对“收货地址 scope.address”的授权
    chooseWXAddr() { // eslint-disable-line require-jsdoc
      wx.chooseAddress({
        success: (res) => {
          const region = [];
          region[0] = res.provinceName;
          region[1] = res.cityName;
          region[2] = res.countyName;

          this.setData({
            name: res.userName,
            phone: res.telNumber,
          });

          if (!this.regionValidate(region)) {
            wx.showToast({
              title: '地区暂不支持',
              icon: 'none',
            });
            return;
          }

          this.data.region = region;
          this.data.address = res.detailInfo;

          // 与上一步不能合并，需要先设置数值才能进行合法性检查
          this.setData({
            ifCanSave: this.validate(),
          });

          this.getAdCodeByRegion();
        },
      });
    },

    // 点击选取地理位置按钮
    locationTap() { // eslint-disable-line require-jsdoc
      this.getUserAuth(AuthScopeLocation)
        .then(() => this.chooseWXLocation()) // 获取授权成功（已有授权，或新授权成功），调起选取位置界面
        .catch((e) => { // 引导用户在设置页授权失败
          if (!e.isFirstAuth && !e.cancel) {
            // e.isFirstAuth 表示用户第一次授权且拒绝了，不作提示
            // e.cancel 表示用户看到了弹窗但拒绝进入设置页，不作提示
            // 其他情况，表示用户进入了设置页但未完成授权，提示
            wx.showToast({ title: '未授权获取地理位置', icon: 'none' });
          }
        });
    },

    // 调用接口，显示微信选择地理位置页面，成功选择地理位置后填充到当前组件
    // 注意，调用本方法前需保证以获得用户对“地理位置 score.userLocation”的授权
    chooseWXLocation() { // eslint-disable-line require-jsdoc
      wx.chooseLocation({
        success: (res) => {
          // 逆地址解析，获取省市区信息，回填页面
          const lat = res.latitude;
          const lng = res.longitude;
          R.post('basic/lbs/decode', { lat, lng }).then((loc) => {
            if (loc.errCode !== 0 || loc.resData.result.ad_info.nation_code !== '156') {
              wx.showToast({
                title: '地区暂不支持',
                icon: 'none',
              });
              this.log(`逆地址解析失败 ${loc.errCode} ${loc.errMsg}`);
              return;
            }

            const adInfo = loc.resData.result.ad_info;
            const formattedAddress = loc.resData.result.formatted_addresses.recommend;
            const { address } = loc.resData.result;

            this.data.adCode = adInfo.adcode;
            this.data.nation = adInfo.nation;

            const region = [];
            region[0] = adInfo.province;
            region[1] = adInfo.city;
            region[2] = adInfo.district;

            if (!this.regionValidate(region)) {
              wx.showToast({
                title: '地区暂不支持',
                icon: 'none',
              });
              return;
            }

            this.data.region = region;
            this.data.address = `${address}${formattedAddress}`;

            // 与上一步不能合并，需要先设置数值才能进行合法性检查
            this.setData({
              ifCanSave: this.validate(),
            });

            this.getAdCodeByRegion();
          });
        },
      });
    },

    /**
     * 获取用户授权，调用此方法，要么显示微信默认授权界面，要么显示弹窗引导用户进入设置页进行授权
     * 当用户从未进行过某项授权，显示微信默认授权界面；当用户曾经进行过某项授权，弹窗引导用户进入设置页进行授权
     * @param {String} scope 授权项 scope.address/score.userLocation等
     * @returns {Promise<object>} 授权成功时返回resolved Promise，否则返回rejected Promise
     */
    getUserAuth(scope) { // eslint-disable-line require-jsdoc
      return this.everDidAuth(scope) // 先检查是否曾经发起过授权
        .catch(() => this.auth(scope) // 如未发起过授权，向用户请求授权
          .then(() => ({ allow: true })) // 如果成功授权，返回allow true，方便走后续then分支逻辑
          .catch((e) => {
            const res = Object.assign({}, e);
            res.isFirstAuth = true; // 标记是用户第一次授权
            return Promise.reject(res);
          }))
        .then((auth) => { // 曾经发起过授权
          if (auth.allow) { // 已有授权
            return;
          }
          return this.attempToAuthInSetting(scope); // 曾经拒绝过授权，尝试引导用户到设置页完成授权
        });
    },

    /**
     * 检查是否已进行过某种授权
     * @param {String} scope 授权项 scope.address/score.userLocation等
     * @returns {Promise<object>} 进行过授权时返回resolved Promise，未进行过授权返回rejected Promise
     *   当返回resolve Promise时，object.allow表示是否成功完成了授权
     */
    everDidAuth(scope) { // eslint-disable-line require-jsdoc
      return new Promise((resolve, reject) => {
        wx.getSetting({
          success: (data) => {
            if (typeof data.authSetting[scope] === 'undefined') {
              reject(new Error(`never call wx.auth({ scope: ${scope} })`));
            } else {
              resolve({ allow: data.authSetting[scope] });
            }
          },
          fail: reject,
        });
      });
    },

    /**
     * 向用户请求授权，授权成功时返回resolved Promise，授权失败时返回rejected Promise
     * 仅当用户未曾明确拒绝时调用此方法可以正常发起授权
     * @param {String} scope 授权项 scope.address/score.userLocation等
     * @returns {Promise} 授权promise
     */
    auth(scope) { // eslint-disable-line require-jsdoc
      return new Promise((resolve, reject) => {
        wx.authorize({
          scope,
          success: resolve,
          fail: reject,
        });
      });
    },

    /**
     * 弹窗提示用户进入设置页打开某项授权
     * @param {String} scope 授权项 scope.address/score.userLocation等
     * @returns {Promise<object>} 授权成功时返回resolved Promise，否则返回rejected Promise；
     *   对于rejected Promise
     *     如果object.cancel = true，表示用户拒绝进入设置页
     *     如果object.cancel = false，表示用户进入了设置页，但未在设置页完成授权
     */
    attempToAuthInSetting(scope) { // eslint-disable-line require-jsdoc
      return new Promise((resolve, reject) => {
        const scopeName = scope === AuthScopeAddress ? '微信地址薄' : '地理位置';
        wx.showModal({
          title: '',
          content: `您未授权获取${scopeName}，请完成授权，谢谢！`,
          cancelText: '不了',
          confirmText: '去授权',
          confirmColor: '#4875fd',
          success: (res) => {
            const e = new Error();
            if (!res.confirm) { // 用户拒绝去设置页授权
              e.cancel = true;
              reject(e);
              return;
            }
            // 用户点了“去授权”，跳转到设置页并根据设置结果进行下一步操作
            this.goAuthInSetting(scope)
              .then(resolve) // 授权成功
              .catch(() => reject(e)); // 授权失败
          },
        });
      });
    },

    /**
     * 进入设置页打开某项授权，授权成功时返回resolved Promise，否则返回rejected Promise
     * @param {String} scope 授权项 scope.address/score.userLocation等
     * @returns {Promise} 授权promise
     */
    goAuthInSetting(scope) { // eslint-disable-line require-jsdoc
      return new Promise((resolve, reject) => {
        wx.openSetting({
          success: (res) => { // 从设置页回到当前页
            const setting = res.authSetting;
            const auth = setting && setting[scope];
            if (auth) { // 已授权
              resolve();
            } else { // 未授权
              reject(new Error(res));
            }
          },
        });
      });
    },

    bindRegionChange(e) { // eslint-disable-line require-jsdoc
      const region = e.detail.value;

      if (!this.regionValidate(region)) {
        wx.showToast({
          title: '地区暂不支持',
          icon: 'none',
        });

        return;
      }

      this.data.region = region;

      this.setData({
        ifCanSave: this.validate(),
      });

      this.getAdCodeByRegion();
    },

    nameKeyInput(e) { // eslint-disable-line require-jsdoc
      this.data.name = e.detail.value;

      this.setData({
        ifCanSave: this.validate(),
      });
    },

    phoneKeyInput(e) { // eslint-disable-line require-jsdoc
      this.data.phone = e.detail.value;

      this.setData({
        ifCanSave: this.validate(),
      });
    },

    addressKeyInput(e) { // eslint-disable-line require-jsdoc
      this.data.address = e.detail.value;

      this.setData({
        ifCanSave: this.validate(),
      });
    },

    validate() { // eslint-disable-line require-jsdoc
      if (this.data.name === '' || this.data.phone === '' || this.data.address === '' || this.data.adCode === '') {
        return false;
      }

      if (!this.regionValidate(this.data.region)) {
        return false;
      }

      return true;
    },

    // 检查"所在区域"字段是否合法，允许为空
    regionValidate(region) { // eslint-disable-line require-jsdoc
      if (region.length === 0) {
        return true;
      }

      const notSupportProvinces = ['台湾省', '香港特别行政区', '澳门特别行政区'];
      const [province] = region;

      return !notSupportProvinces.includes(province);
    },

    getAdCodeByRegion() { // eslint-disable-line require-jsdoc
      this.setData({
        ifCanSave: false,
      });

      this.setData({
        tipShow: false,
      });

      // 调用地址解析接口，获取adcode
      R.post('basic/lbs/encode', { address: this.data.region.join('') }).then((res) => {
        // 获取adCode失败，清空所在区域字段，提示用户
        if (res.errCode !== 0) {
          this.setData({
            tipShow: true,
          });
          return;
        }

        const { adInfo } = res.resData;
        this.data.adCode = adInfo.adcode;

        this.setData({
          region: this.data.region,
          address: this.data.address,
        });

        this.setData({
          ifCanSave: this.validate(),
        });
      })
        .catch((ex) => {
          this.log(`解析AdCode失败 ${ex}`);
          this.setData({
            tipShow: true,
          });

          this.setData({
            ifCanSave: this.validate(),
          });
        });
    },

    log(...data) { // eslint-disable-line require-jsdoc
      if (!this.logger) {
        const getLogManager = tmsCore?.getLogManager;
        this.logger = getLogManager && getLogManager();
      }
      this.logger && this.logger.info(...data);
    },

    async saveTap() { // eslint-disable-line require-jsdoc
      // 防止用户通过复制粘贴输入错误格式的手机号码
      if (!/^1\d{10}$/.test(this.data.phone)) {
        wx.showToast({
          title: '请输入正确号码',
          icon: 'none',
        });
        return;
      }

      // 保存物流地址
      R.post('user/delivery/set', {
        businessId: this.data.businessId,
        spId: this.data.spId,
        mobilePhone: this.data.phone,
        name: encodeURIComponent(this.data.name),
        country: this.data.nation,
        province: this.data.region[0],
        city: this.data.region[1],
        district: this.data.region[2],
        deliveryAddress: encodeURIComponent(this.data.address),
        adcode: this.data.adCode,
      }).then(() => {
        this.triggerEvent('addrchange', {
          adCode: this.data.adCode,
          name: this.data.name,
          phone: this.data.phone,
          region: this.data.region,
          address: this.data.address,
        });
      });
    },

    tipTap() { // eslint-disable-line require-jsdoc
      this.setData({ tipShow: false });
    },
  },
});
