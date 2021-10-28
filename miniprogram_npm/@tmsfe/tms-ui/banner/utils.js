import tmsCore from '@tmsfe/tms-core'; // eslint-disable-line import/no-unresolved
import platformUtils from '../platformUtils';

let appShowScene = -1; // app onShow场景值

/**
 * 获取app onShow场景值
 * @returns {Number} 场景值
 */
const getAppShowScene = () => {
  if (appShowScene > 0) return appShowScene;
  const options = wx.getEnterOptionsSync && wx.getEnterOptionsSync();
  appShowScene = options?.scene || -1;
  return appShowScene;
};

const clearAppShowScene = () => appShowScene = -1; // eslint-disable-line require-jsdoc

/**
 * 获取banner数据
 * @param {Object} param 通用参数
 * @param {String} param.holderCode banner ID
 * @param {String} param.province 省 deprecated 使用extendAttrs代替
 * @param {String} param.city 市 deprecated 使用extendAttrs代替
 * @param {Array<String>} param.channelIds 车辆渠道
 * @param {Object} extendParam 扩展参数
 * @returns {Array<Object>} banner数据
 */
const getBannerListData = async (param, extendParam = {}) => {
  const appShowScene = getAppShowScene(); // app onShow场景值
  const { appId, env } = platformUtils.getSystemInfo()?.host || {};
  const hostAppId = appId || env || 'unknown'; // 宿主App信息
  const extendAttrs = { ...param, ...(extendParam || {}), appShowScene, hostAppId };
  return tmsCore.createRequest().post('marketing/banner/list', {
    ...param, extendAttrs: JSON.stringify(extendAttrs),
  })
    .then((d) => {
      const list = d.resData || [];
      return list.filter((banner) => {
        const { mpPath = '', redirectType, mpAppID = '' } = banner;
        // 跳转目标非当前小程序页面
        if (redirectType !== 0 || (mpAppID && mpAppID !== platformUtils.getAppId())) return true;
        return tmsCore.isAppPageExist(mpPath);
      });
    });
};

module.exports = {
  clearAppShowScene,
  getAppId: platformUtils.getAppId,
  getAppShowScene,
  getBannerListData,
  getDeviceClass: platformUtils.getDeviceClass,
};
