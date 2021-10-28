import tmsCoreObj from '@tmsfe/tms-core'; // eslint-disable-line import/no-unresolved
import { clearAppShowScene, getAppId, getDeviceClass, getBannerListData } from './utils';

const { getLocationManager, getReporter } = tmsCoreObj;
const Loc = getLocationManager();
const Report  = getReporter().report;
Component({
  properties: {
    // 要展示的渠道ID
    // 以逗号分割的渠道号列表
    channelIds: {
      type: String,
      value: '',
    },
    // banner数据
    bannerId: {
      type: String,
      value: '',
    },
    display: { // display模式，支持block/inline
      type: String,
      value: 'block',
    },
    width: { // banner宽度，单位：rpx
      type: Number,
      value: 670,
    },
    height: { // banner高度，单位：rpx
      type: Number,
      value: 168,
    },
    borderRadius: { // banner圆角，单位：rpx
      type: Number,
      value: 8,
    },
    borderRadiusImg: { // banner圆角图片，仅当display=inline时使用
      type: String,
      value: 'https://static.img.tai.qq.com/mp/components/banner/radius.png',
    },
    indicatorPos: { // 指示器横向位置，center/left/right，默认center
      type: String,
      value: 'center',
    },
    indicatorPosHor: { // 指示器距离横向边缘位置，仅indicatorPos=left/right时有效
      type: Number,
      value: 28,
    },
    indicatorPosVer: { // 指示器距离纵向边缘位置
      type: Number,
      value: 10,
    },
    marginTop: {
      type: Number,
      value: 0,
    },
    marginBottom: {
      type: Number,
      value: 0,
    },
    backgroundColor: {
      type: String,
      value: '#eee',
    },
    cityInfo: { // 城市信息
      type: Object,
    },
    customCity: { // 是否自定义城市信息
      type: Boolean,
      value: false,
    },
    extraParam: { // 附加信息
      type: Object,
      value: {},
    },
  },

  observers: {
    'bannerId, channelIds, cityInfo'(id) { // eslint-disable-line require-jsdoc
      // 没有指定id,不加载
      if (!id) {
        return;
      }

      this.renderBanner(id);
    },
  },

  data: {
    deviceClass: getDeviceClass(),
    currentIndex: 0, // 当前banner索引
    duration: 600,
    autoplay: true,
    circular: true,
    interval: 3000,
    banners: [],
    rendered: false,
  },

  loading: false, // banner是否加载中
  lastParam: {},
  validChannel: [], // 要展示的渠道号的banner

  displayReported: {}, // 记录banner展示（I016）是否已经上报过

  lifetimes: {
    created() { // eslint-disable-line require-jsdoc
      // 某些情况下，displayReported为空，需要初始化时显示对displayReported进行赋值
      this.displayReported = {};
      this.validChannel = [];
      this.renderBanner(this.data.bannerId);
      wx.onAppHide(clearAppShowScene);
    },
  },

  pageLifetimes: {
    show() { // eslint-disable-line require-jsdoc
      this.setData({ autoplay: true });
      this.displayReported = {}; // 清除上报数据，以保证banner展示时再次上报

      const { rendered, banners, bannerId } = this.data;
      if (rendered) {
        if (banners.length === 0) { // 如果之前未请求到数据，页面onShow时重试一次
          this.renderBanner(bannerId);
        } else if (banners.length === 1) { // 已经成功渲染banner，且只有一个banner，再次上报该banner展示
          this.reportBannerDisplay(banners[0], 0);
        } // 如果banner大于1个，不应该此时处理数据上报，应该在change中进行上报
      }
    },
    hide() { // eslint-disable-line require-jsdoc
      this.setData({ autoplay: false });
    },
  },

  methods: {
    async renderBanner(holderCode) { // eslint-disable-line require-jsdoc
      if (!holderCode || (this.loading && !this.data.customCity)) {
        return;
      }

      const { channelIds } = this.data;
      await new Promise((r) => {
        this.validChannel =  channelIds.split(',').filter(i => i);
        // 此处设置autoplay为false是为了防止banner更新时闪烁
        this.setData({
          currentIndex: 0,
          autoplay: false,
        }, r);
      });

      this.loading = true;
      this.getLocation()
        .then((loc) => {
          const { province, cityName } = loc;
          const {
            province: lastProvince, cityName: lastCity, channelIds: lastIds, holderCode: lastCode,
          } = this.lastParam || {};
          // 恢复banner自动轮播设置
          this.setData({ autoplay: true });
          if (province === lastProvince && cityName === lastCity
            && holderCode === lastCode && channelIds === lastIds) {
            this.loading = false;
            return;
          }
          this.lastParam = { province, cityName, holderCode, channelIds };
          this.loadBannerWithLoc(loc, holderCode);
        })
        .catch(() => {
          this.lastParam = {};
          this.updateData([]);
          if (!this.data.customCity) {
            // 监听授权状态变化
            Loc.onLocStatusChange(() => this.renderBanner(holderCode));
          }
        });
    },

    loadBannerWithLoc(loc, holderCode) { // eslint-disable-line require-jsdoc
      const param = {
        holderCode,
        province: loc.province,
        city: loc.cityName,
        channelIds: this.validChannel,
      };
      return getBannerListData(param, this.data.extraParam)
        .catch(() => {
          this.lastParam = {};
          return [];
        })
        .then((banners) => {
          const { province, cityName } = this.lastParam || {};
          if (loc.province !== province || loc.cityName !== cityName) return;
          this.updateData(banners);
          if (Array.isArray(banners) && banners.length > 0) { // 第一个banner已经展示，进行数据上报
            this.reportBannerDisplay(banners[0], 0);
          }
        });
    },

    updateData(banners = this.data.banners) { // eslint-disable-line require-jsdoc
      this.loading = false;
      this.setData({ banners, rendered: true, autoplay: true });
      this.triggerEvent('updated', { state: banners.length > 0 ? 1 : 0 });
    },

    // 点击banner事件
    onBannerClick(e) { // eslint-disable-line require-jsdoc
      const bannerId = e.currentTarget.dataset.id;
      this.triggerEvent('banner-click', bannerId);

      const bannerList = this.data.banners;
      const bannerIndex = bannerList.findIndex(b => b?.ID === bannerId);
      const banner = bannerList[bannerIndex];

      if (!banner) return;

      this.report({
        27: 'I017',
        35: this.data.bannerId,
        36: banner.ID,
        37: `${bannerIndex}`,
        38: `${banner.redirectType}`,
        39: encodeURIComponent(banner.mpPath || banner.toURL),
      });

      // 判断是否可以跳转小程序页面
      // 判断条件：1、跳转目标为小程序页面；2、配置了页面地址；3、配置的地址在小程序中有对应的页面
      if (banner.redirectType === 0 && banner.mpPath) {
        if (banner.mpAppID && banner.mpAppID !== getAppId()) { // 打开其他小程序
          wx.navigateToMiniProgram({
            appId: banner.mpAppID,
            path: banner.mpPath,
          });
        } else {
          wx.navigateTo({ url: banner.mpPath });
        }
        return;
      }

      // 判断是否可以跳转公众号/h5页面
      if (banner.toURL) {
        const url = encodeURIComponent(banner.toURL);
        const title = encodeURIComponent(banner.shareTitle);
        const image = encodeURIComponent(banner.shareImgURL);
        const routerPath = '/modules/x/webcontainer/webcontainer';
        wx.navigateTo({ url: `${routerPath}?url=${url}&title=${title}&image=${image}` });
        return;
      }
    },

    change(e) { // eslint-disable-line require-jsdoc
      const { current: currentIndex, source } = e.detail;
      if (!source) {
        return;
      }
      const banner = this.data.banners[currentIndex];
      this.setData({ currentIndex });
      this.triggerEvent('banner-change', banner?.ID);
      this.reportBannerDisplay(banner, currentIndex);
    },

    // banner展示数据上报
    reportBannerDisplay(banner, currentIndex) { // eslint-disable-line require-jsdoc
      // 如果已经上报过，直接返回，不重复上报
      if (!banner || !banner.ID || this.displayReported[banner.ID]) {
        return;
      }
      this.displayReported[banner.ID] = true; // 记录为已上报过
      this.report({
        27: 'I016',
        35: this.data.bannerId,
        36: banner.ID,
        37: `${currentIndex}`,
        38: `${banner.redirectType}`,
        39: encodeURIComponent(banner.mpPath || banner.toURL),
      });
    },

    report(reportData) { // eslint-disable-line require-jsdoc
      Report({
        ...reportData,
        14: reportData[14] || '5',
        26: reportData[26] || (reportData[27] && reportData[27][0]) || 'I',
      });
    },

    /**
     * 获取用户位置。
     * 1、如果指定使用自定义城市信息，直接返回用户当前位置信息
     * 2、其他场景均获取用户真实位置
     * @returns {Promise<Object>} 用户位置信息
     */
    getLocation() { // eslint-disable-line require-jsdoc
      const { customCity, cityInfo } = this.data;
      if (customCity) {
        return !(cityInfo?.cityName || cityInfo?.city)
          ? Promise.reject(cityInfo)
          : Promise.resolve(cityInfo);
      }

      return Loc.getLocationDetailSilent();
    },
  },
});
