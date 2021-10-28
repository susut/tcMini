import { R as Request, g as getLogManager, a as getRealtimeLogManager, m as md5 } from './request-0bccd371.js';
import { g as getEnvInfo, a as getAuthInfo, s as setAuthInfo, i as isAppPageExist, b as setEnvInfo, c as setAppPagePaths } from './env-612e2703.js';
import { callCloudFunc } from './cloudService.js';

/**
 * @copyright 2020-present, Tencent, Inc. All rights reserved.
 * @author Fenggang.Sun <fenggangsun@tencent.com>
 * @file 快速上报数据，不处理过多逻辑，保证快速上报
 */
let simulatedUserIdCache; // 模拟用户id在内存里的缓存

/**
 * @class FastReport
 * @classdesc 快速上报模块，不依赖用户标识和位置
 */

class FastReport {
  /**
   * @memberof FastReport
   * @description 快速上报
   * @param {Object} param 埋点数据
   * @param {Boolean} simulatedUserId 是否上报模拟用户Id
   * @param {Number} simulatedUserIdIndex 上报模拟用户ID时放在哪个字段
   * @param {Boolean} reportShowScene 是否上报小程序onShow场景值
   * @param {Boolean} appVer 是否上报小程序版本
   * @returns {Promsie} 返回上报结果
   */
  static report(param, simulatedUserId = true, simulatedUserIdIndex = 40, reportShowScene = true, appVer = true) {
    var _data$;

    if (!(param !== null && param !== void 0 && param[27])) return Promise.reject('invalid report param');
    const data = new Array(41);
    const env = getEnvInfo();
    Object.keys(param).forEach(key => {
      const valType = typeof param[key];
      if (valType === 'string') data[key] = param[key];else if (valType === 'object') data[key] = JSON.stringify(param[key]);else data[key] = String(param[key]);
    });
    data[9] = '2';
    appVer && !data[10] && (data[10] = env.appVersion);
    if (!data[26]) data[26] = (_data$ = data[27]) === null || _data$ === void 0 ? void 0 : _data$[0];
    data[28] = env.client;

    if (reportShowScene && !data[29]) {
      const appShowScene = wx.getStorageSync('appShowScene');
      if (appShowScene) data[29] = String(appShowScene);
    }

    if (simulatedUserId && !data[simulatedUserIdIndex]) {
      data[simulatedUserIdIndex] = FastReport.getSimulatedUserId();
    }

    return new Request().post('basic/event/upload', {
      batch: [data]
    }).catch(() => null);
  }
  /**
   * @memberof FastReport
   * @description 获取模拟的用户身份标识
   * @returns {String} 用户的临时标识
   */


  static getSimulatedUserId() {
    // 优先使用内存级缓存
    if (simulatedUserIdCache) return simulatedUserIdCache;
    const key = 'SimulatedUserKey'; // 读取本地缓存记录的值

    simulatedUserIdCache = wx.getStorageSync(key);
    if (simulatedUserIdCache) return simulatedUserIdCache; // 生成新的值

    const nonce = Math.random().toString(36).substr(2, 10);
    simulatedUserIdCache = `${Date.now()}_${nonce}`;
    wx.setStorage({
      key,
      data: simulatedUserIdCache
    });
    return simulatedUserIdCache;
  }

}

/**
 * 小程序云控配置实现
 */
/**
 * getConfig 批量拉取配置
 * @description 拉取运营平台上的配置内容。关于运营平台的具体用法，参见{@link https://iwiki.woa.com/pages/viewpage.action?pageId=527948584}
 * @category 配置相关
 * @example <caption>拉取单个配置</caption>
 * const cfg = await app.tms.getConfig('/${client}/violation/subscribe', {}, { title: '当前城市不支持订阅'})
 * console.log(cfg); // 成功则返回服务端存储的配置，失败返回默认值
 * @example <caption>批量拉取配置</caption>
const cfgs = await app.tms.getConfig([
  '/${client}/home/service',
  '/${client}/home/navbar',
], {}, [
  [
    { caption: '违章代缴', icon: 'violation.png' }
  ],
  { title: '晚上好，欢迎~' }
]);
console.log(cfgs); // 成功则返回服务端存储的配置，失败返回默认值
 * @param {String|Array} configPath 配置路径，单个路径或配置路径数组，支持替换${client}为当前小程序。例如在出行小程序，${client}会变替换为sinan
 * @param {Object} extendAttr 扩展属性，传给配置服务用于检索哪个版本的配置适用于当前用户。
 * @param {Object} [defaultCfg] 默认配置，请求失败返回默认值。
 * @returns {Promise<Object|Array<Object>>}
 * 有默认值时，请求失败返回默认值。无默认值时，请求失败返回Promise.reject
 */

function getConfig(configPath, extendAttr = {}, defaultCfg) {
  if (Array.isArray(configPath)) {
    // 复数形式
    if (defaultCfg) {
      // 有默认值
      if (!Array.isArray(defaultCfg) || configPath.length !== defaultCfg.length) {
        throw new Error('配置路径和默认值的数组长度不一致');
      }
    }
  }

  const configPaths = Array.isArray(configPath) ? configPath : [configPath];
  const defaultCfgs = defaultCfg && (Array.isArray(defaultCfg) ? defaultCfg : [defaultCfg]) || null;
  const {
    client
  } = getEnvInfo();
  configPaths.forEach((path, index) => {
    configPaths[index] = path.replace(/\$\{client\}/, client);
  });
  const extendAttrs = typeof extendAttr === 'string' ? extendAttr : JSON.stringify(extendAttr);
  const api = new Request();
  return api.post('marketing/config', {
    extendAttrs,
    configPaths
  }).then((res = {}) => {
    const {
      resData
    } = res || {};

    if (resData && resData.length > 0) {
      const parsed = configPaths.map((path, index) => {
        const found = resData.find(cfg => cfg.configPath === path);

        if (found) {
          return JSON.parse(found.configValue);
        }

        if (defaultCfgs && defaultCfgs[index]) {
          return defaultCfgs[index];
        }

        return {}; // 没找到配置，返回一个空对象
      });

      if (Array.isArray(configPath)) {
        return parsed;
      }

      return parsed[0];
    }

    if (defaultCfgs) {
      return Array.isArray(configPath) ? defaultCfgs : defaultCfgs[0];
    }

    return Promise.reject(new Error(`获取${configPaths.join(',')}配置失败，接口调用出错，${JSON.stringify(res)}`));
  }).catch(e => {
    if (defaultCfgs) {
      return Promise.resolve(Array.isArray(configPath) ? defaultCfgs : defaultCfgs[0]);
    }

    return Promise.reject(new Error(`获取${configPaths.join(',')}配置失败，接口调用出错，${JSON.stringify(e)}`));
  });
}

var configApi = {
  getConfig
};

/**
 * 本文件负责对小程序调用wx同步方法的管理
 */
let systemInfo = null; // 系统信息。

let launchOptions = null; // 启动参数

let accountInfo = null; // 小程序账号信息

/**
 * 获取系统信息。同wx.getSystemInfoSync
 * @returns {Object} 系统信息
 */

const getSystemInfoSync = () => {
  if (systemInfo) {
    return systemInfo;
  }

  try {
    systemInfo = wx.getSystemInfoSync();
    return systemInfo;
  } catch (_) {
    return {};
  }
};
/**
 * 重置系统信息，仅用于单元测试
 * @returns {undefined}
 */


const resetSystemInfoSync = () => {
  systemInfo = null;
};
/**
 * 获取启动参数。同wx.getLaunchOptionsSync
 * @returns {Object} 启动参数
 */


const getLaunchOptionsSync = () => {
  if (launchOptions) {
    return launchOptions;
  }

  try {
    launchOptions = wx.getLaunchOptionsSync();
    return launchOptions;
  } catch (_) {
    return {};
  }
};
/**
 * 获取客户端平台。同wx.getSystemInfoSync().platform
 * @returns {String} 平台名称
 */


const getPlatform = () => {
  const UNKNOWN = 'unknown';

  try {
    const systemInfo = getSystemInfoSync();
    const {
      platform
    } = systemInfo;
    return platform || UNKNOWN;
  } catch (_) {
    return UNKNOWN;
  }
};
/**
 * 获取字符串类型的启动参数
 * @returns {String} 序列化的参数字符串
 */


const getLaunchParamOfString = () => {
  try {
    const options = getLaunchOptionsSync() || {};
    return JSON.stringify(options);
  } catch (_) {
    return '';
  }
};
/**
 * @description 获取小程序账号信息
 * @returns {Object} 小程序账号信息,返回内容同wx.getAccountInfoSync()
 */


const getAccountInfoSync = () => {
  if (accountInfo) {
    return accountInfo;
  }

  try {
    accountInfo = wx.getAccountInfoSync();
    return accountInfo;
  } catch (_) {
    return {};
  }
};
var syncApi = {
  getPlatform,
  getSystemInfoSync,
  getLaunchOptionsSync,
  getLaunchParamOfString,
  resetSystemInfoSync,
  getAccountInfoSync
};

/**
 * @copyright 2021-present, Tencent, Inc. All rights reserved.
 * @author Davislu <davislu@tencent.com>
 * @brief navigator provides some function to navigate pages in miniprogram.
 *
 */

/**
 * DEFN 空方法
 * @private
 * @returns {undefined} 无返回值
 */
const DEFN = () => {};
/**
 * navigateToWebview 方法 跳转到小程序的 web-view 容器打开 H5
 * @param {object} setting 配置信息
 * @param {string} setting.url 需要跳转的 H5 连接
 * @param {function} setting.complete 跳转成功后的回调函数
 * @param {function} setting.message 用于获取 H5 中的 postMessage 的数据
 * @param {object} setting.share 页面分享信息
 * @param {string} setting.share.title 页面分享标题
 * @param {string} setting.share.image 页面分享图片
 * @param {string} setting.share.disable 是否禁用页面分享
 * @param {object} setting.navbar 页面导航栏设置
 * @param {string} setting.navbar.frontColor 导航栏字体颜色
 * @param {string} setting.navbar.backgroundColor 导航栏背景颜色
 * @returns {undefined} 无返回值
*/


const navigateToWebview = ({
  url: webUrl,
  complete = DEFN,
  message = DEFN,
  share = {},
  navbar = {}
}) => {
  const page = '/modules/x/webcontainer/webcontainer';
  let query = `url=${encodeURIComponent(webUrl)}`;

  if (share.disable) {
    query += '&disableShare=true';
  } else if (share.title) {
    const image = share.image ? `&image=${encodeURIComponent(share.image)}` : '';
    query += `&title=${encodeURIComponent(share.title)}${image}`;
  }

  if (navbar.frontColor) query += `&navbarFront=${navbar.frontColor}`;
  if (navbar.backgroundColor) query += `&navbarBg=${navbar.backgroundColor}`;
  const url = `${page}${/\?/.test(page) ? '&' : '?'}${query}`;
  const navSetting = {
    url,
    complete
  };
  navSetting.events = {
    onMessage: message
  };
  wx.navigateTo(navSetting);
};

var nav = {
  navigateToWebview
};

/* eslint-disable require-jsdoc */

/**
 * Copyright 2017-present, Tencent, Inc.
 * All rights reserved.
 *
 * @desc: 自定义事件机制
 * @author: kexinwu@tencent.com
 *
 */

/**
 * EventDispatcher 类 事件监听器
 * @class EventDispatcher
 * @classdesc 用于统一维护小程序的事件
 */
class EventDispatcher {
  constructor() {
    this.handlers = [];
  }
  /**
   * @memberof EventDispatcher
   * @param {String} type 事件名
   * @param {Function} handler 事件处理函数
   * @returns {Function} handler 事件处理函数
   */


  bind(type, handler) {
    if (typeof this.handlers[type] === 'undefined') {
      this.handlers[type] = [];
    }

    this.handlers[type].push(handler);
  }
  /**
   * @memberof EventDispatcher
   * @param       {String} type 事件名
   * @param       {Function} handler 事件处理函数
   * @returns     {Function} handler 事件处理函数
   */


  bindOnce(type, handler) {
    if (typeof this.handlers[type] === 'undefined') {
      this.handlers[type] = [];
    }

    const isBinded = this.handlers[type].length === 0;

    if (isBinded) {
      this.handlers[type].push(handler);
    }
  }
  /**
   * @memberof EventDispatcher
   * @param {String} type 事件名
   * @returns {Void} 无返回值
   */


  remove(type) {
    this.handlers[type] = [];
  }
  /**
   * @memberof EventDispatcher
   * @param       {String} type 事件名
   * @param       {Function} handler 事件处理函数
   * @returns {Void} 无返回值
   */


  unbind(type, handler) {
    if (this.handlers[type] instanceof Array) {
      const handlers = this.handlers[type];
      let i = 0;
      const l = handlers.length;

      for (; i < l; i += 1) {
        if (handlers[i] === handler) {
          break;
        }
      }

      handlers.splice(i, 1);
    }
  }
  /**
   * @memberof EventDispatcher
   * @param  {Object} evt 事件描述
   * @param  {String} evt.type 事件类型
   * @returns     {Function} handler 事件处理函数
   */


  dispatch(evt) {
    if (this.handlers[evt.type] instanceof Array) {
      const handlers = this.handlers[evt.type];
      handlers.forEach(handler => handler(evt));
    }
  }

}

const R$1 = new Request();
const E = new EventDispatcher();
const LocCache = {}; // 位置信息缓存

const EventName = 'loc_status_changed';
const CityChangeEventName = 'loc_city_changed'; // 用户城市变化事件名

const LocationScopeKey = 'scope.userLocation';
const LocationType = 'gcj02'; // 获取经纬度时的坐标名称

let getLocPromise = null;
let getPoiInfoPromise = null;
let getLocationStatus = true; // 获取位置成功失败状态

let userLocation = null; // 用户手动选择的位置信息（切换城市后的位置信息）

let cityTheUserAt = ''; // 用户所在的城市

let getSettingPromise = null; // 获取授权设置promise

/**
 * @param {string} type 定位类型
 * @returns {promise} 获取的定位结果
 */

const getLocation = (type = LocationType) => new Promise((resolve, reject) => {
  wx.getLocation({
    type: type || LocationType,
    success: resolve,
    fail: reject
  });
});
/**
 * @param {string} scopeKey 授权项
 * @returns {promise} 授权页操作状态
 */


const openSetting = (scopeKey = LocationScopeKey) => new Promise((resolve, reject) => {
  // 打开设置页
  wx.openSetting({
    success: res => {
      // 从authSetting中获取用户的授权结果
      const {
        authSetting
      } = res;
      const authResult = authSetting[scopeKey]; // 已经打开授权

      if (authResult) {
        resolve();
        return;
      } // 未打开授权


      reject(res);
    },
    fail: reject
  });
});
/**
 * getTextByReason 获取提示语文案
 * @param {*} locationEnabled 是否开启位置授权
 * @param {*} isSysAndWechatAllowedGetLoc 是否开启微信位置授权
 * @returns {object} 提示语文案
 */


const getTextByReason = (locationEnabled, isSysAndWechatAllowedGetLoc) => {
  const authLevelName = locationEnabled ? '微信' : '系统';
  const confirmText = isSysAndWechatAllowedGetLoc ? '去开启' : '好的';
  return {
    authLevelName,
    confirmText
  };
};
/**
 * 获取小程序权限相关的设置
 * @param {String} scopeKey scope名称
 * @returns {promise} 设置项
 */


const getSetting = (scopeKey = LocationScopeKey) => {
  if (getSettingPromise) {
    return getSettingPromise;
  }

  getSettingPromise = new Promise((resolve, reject) => {
    wx.getSetting({
      success: ({
        authSetting = {}
      }) => {
        resolve(authSetting[scopeKey]);
        getSettingPromise = null;
      },
      fail: (err = {}) => {
        getSettingPromise = null;
        const {
          errMsg = ''
        } = err || {}; // wx.getSetting接口没有响应时errMsg

        const reason = 'getSetting:fail data no response'; // 部分机型上，wx.getSetting接口没有响应，此时，当做位置开关是打开的来处理

        if (errMsg.indexOf(reason) > -1) {
          resolve(true);
          return;
        } // 其他情况，返回失败原因。


        reject(err);
      }
    });
  });
  return getSettingPromise;
};
/**
 * @function
 * @description 获取设备系统信息
 * @returns      {Object} 设备系统信息
 */


const getSystemInfo$1 = () => {
  try {
    const sys = wx.getSystemInfoSync() || {}; // 方便开发时调试

    if (sys.platform === 'devtools') {
      sys.locationEnabled = true;
      sys.locationAuthorized = true;
    }

    return sys;
  } catch (_) {
    return {};
  }
};
/**
 * @function
 * @description 格式化城市编码
 * @param       {String} cityCode 城市编码，以国家编码开始
 * @param       {String} nationCode 国家编码
 * @returns      {String} 去掉国家编码后的城市编码
 */


const formatCityCode = (cityCode, nationCode) => {
  let code = cityCode;

  if (cityCode.startsWith(nationCode)) {
    code = cityCode.substr(nationCode.length);
  }

  return code;
};
/**
 * @description 更新获取位置状态
 * @param {Boolean} status 成功true或失败false
 * @returns {void}
 */


const updateLocStatus = async status => {
  if (status && !getLocationStatus) {
    let isAuthed = false;

    try {
      isAuthed = await getSetting();
      getLocationStatus = true;
    } catch (_) {}

    if (isAuthed !== false) {
      E.dispatch({
        type: EventName
      });
      return;
    }

    const timer = setTimeout(() => {
      updateLocStatus(status);
      clearTimeout(timer);
    }, 200);
  } else {
    getLocationStatus = status;
  }
};
/**
 * 格式化poi数据
 * @param {Object} geo 逆地址解析接口返回的数据
 * @returns {object} 格式化后的poi结果
 */


const formatPoi = (geo = {}) => {
  const {
    pois = [],
    address_reference: addressRefer
  } = geo;

  if (pois.length) {
    return pois[0];
  }

  if (addressRefer && addressRefer.landmark_l2) {
    return addressRefer.landmark_l2;
  }

  return {};
};
/**
 * @class Location
 * @classdesc 用于统一维护小程序的位置状态
 */


class Location {
  // 默认位置信息
  static locForNoAuth = {
    province: '广东省',
    cityCode: '440300',
    cityName: '深圳市',
    latitude: 22.54286,
    longitude: 114.05956
  };
  /**
   * @description 获取用户选择的城市位置信息 或者 用户真实的位置信息（这个方法说明有问题）
   * @memberof Location
   * @param {Boolean} showModalWhenCloseAuth 没有授权时是否展示授权弹窗
   * @returns {Promise} 用户位置信息
   */

  static async getMergedLocation(showModalWhenCloseAuth = true) {
    const c1 = Location.getUserLocation(); // 优先用户选择的城市

    if (c1) {
      return c1;
    }

    return await Location.getLocationDetail(showModalWhenCloseAuth);
  }
  /**
   * @description 获取用户手动选择的位置信息
   * @memberof Location
   * @returns {Null|LOC} 返回用户位置信息
   * @example
   * <caption>LOC类型示例</caption>
   * {
   *   province: '北京市',
   *   cityName: '北京市',
   *   cityCode: '100100',
   *   latitude: 325.255333,
   *   longitude: 116.2545454,
   *   adCode: 1212144,
   * }
   */


  static getUserLocation() {
    return userLocation;
  }
  /**
   * @description 设置用户位置（小程序生命周期内有效）
   * @memberof Location
   * @static
   * @param {Object} loc 用户手动选择的位置
   * @params {String} loc.province 省份
   * @params {String} loc.cityName 城市
   * @params {String} loc.cityCode citycode
   * @params {Number} loc.latitude 纬度
   * @params {Number} loc.longitude 经度
   * @params {Number} loc.adCode adCode
   * @returns {Void} 无返回值
   * @example
   * <caption>loc类型示例</caption>
   * {
   *   province: '北京市',
   *   cityName: '北京市',
   *   cityCode: '100100',
   *   latitude: 325.255333,
   *   longitude: 116.2545454,
   *   adCode: 1212144,
   * }
   */


  static setUserLocation(loc) {
    if (!loc || typeof loc !== 'object') {
      return;
    } // 如果城市发生变化，派发事件


    const {
      cityName: curCityName
    } = loc;

    if (curCityName && cityTheUserAt !== curCityName) {
      cityTheUserAt = curCityName;
      userLocation = loc;
      E.dispatch({
        type: CityChangeEventName
      });
    }
  }
  /**
   * @description
   * 以静默方式获取用户位置(经纬度)，说明如下：<br>
   * 1、从未授权情况下 | 用户删除小程序之后调用该方法不会弹微信自带的授权弹窗；<br>
   * 2、拒绝授权后，调用该方法不会弹窗提示用户去授权（wx.showModal）；<br>
   * @memberof Location
   * @param {String} type 非必填。坐标类型，默认'gcj02'
   * @returns {Promise<LOC|ERR>} 返回位置信息
   * @example
   * <caption>LOC类型示例</caption>
   * {
   *    latitude: 33.253321,
   *    longitude: 115.2444,
   * }
   * @example
   * <caption>ERR类型示例</caption>
   * {
   *   err,
   *   unAuthed: true,
   *   locationScopeStatus: false
   * }
   */


  static async getLocationSilent(type = LocationType) {
    let err = null;
    let locationScopeStatus;

    try {
      locationScopeStatus = await getSetting(); // 用户已授权. locationScopeStatus = true

      if (locationScopeStatus) {
        return Location.getLocation(false, type);
      }
    } catch (ex) {
      err = ex;
    }

    updateLocStatus(false); // 用户关闭了授权. locationScopeStatus = false
    // 用户未授权过(删除小程序之后再次打开小程序). locationScopeStatus = undefined

    return Promise.reject({
      err,
      unAuthed: true,
      locationScopeStatus
    });
  }
  /**
   * @description 以静默方式获取用户详细位置(经纬度，poi信息， 省市信息)，说明如下：<br>
   * 1、从未授权情况下 | 用户删除小程序之后调用该方法不会弹微信自带的授权弹窗；<br>
   * 2、拒绝授权后，调用该方法不会弹窗提示用户去授权（wx.showModal）；<br>
   * @memberof Location
   * @param {Number} getPoi 是否获取详细poi信息， 0 - 不获取(不返回poi字段)， 1 - 获取(返回poi字段)
   * @param {String} type 非必填。坐标类型，默认'gcj02'
   * @returns {Promise<LOC|ERR>} 返回对象
   * @example
   * <caption>LOC类型示例</caption>
   * {
   *   cityName: '北京市',
   *   cityCode: '100100',
   *   latitude: 325.255333,
   *   longitude: 116.2545454,
   *   adCode: 1212144,
   *   poi: {
   *     id: '1114545554511',
   *     title: '腾讯北京总部大厦',
   *     address : '北京市海淀区东北旺西路',
   *   }
   * }
   * @example
   * <caption>ERR类型示例</caption>
   * {
   *   err,
   *   unAuthed: true,
   *   locationScopeStatus: false
   * }
   */


  static getLocationDetailSilent(getPoi = 0, type = LocationType) {
    return Location.getLocationSilent(type).then(res => Location.getPoiInfo(res.latitude, res.longitude, getPoi)).catch(err => Promise.reject(err));
  }
  /**
   * @description 获取位置(经纬度)
   * @memberof Location
   * @param {boolean} showModalWhenCloseAuth 获取位置时，如果用户关闭了位置授权，是否弹窗提示用户打开授权
   * @param {string}  type 坐标类型
   * @param {string}  content 弹窗内容
   * @param {boolean} showCancel 是否显示取消按钮
   * @returns {Promise<LOC|ERR>} 返回对象
   * @example
   * <caption>LOC类型示例</caption>
   * {
   *   cityName: '北京市',
   *   cityCode: '100100',
   *   latitude: 325.255333,
   *   longitude: 116.2545454,
   *   adCode: 1212144,
   *   poi: {
   *     id: '1114545554511',
   *     title: '腾讯北京总部大厦',
   *     address : '北京市海淀区东北旺西路',
   *   }
   * }
   * @example
   * <caption>ERR类型示例</caption>
   * {
   *   err,
   *   unAuthed: true,
   *   locationScopeStatus: false
   * }
   */


  static getLocation(showModalWhenCloseAuth = false, type = LocationType, content = '', showCancel = true) {
    // 正在获取位置，返回正在进行中的Promise对象
    if (getLocPromise) {
      return getLocPromise;
    } // 上一次获取位置结束，进行新的获取位置逻辑处理


    getLocPromise = new Promise((resolve, reject) => {
      getLocation(type).then(res => {
        getLocPromise = null;
        updateLocStatus(true);
        resolve(res);
      }).catch((err = {}) => {
        getLocPromise = null;
        updateLocStatus(false);
        const errMsg = err.errMsg || '';
        const {
          locationEnabled,
          locationAuthorized
        } = getSystemInfo$1(); // 系统位置定位开关打开 && 允许微信使用位置定位能力开关打开

        if (locationEnabled && locationAuthorized) {
          if (errMsg.search(/auth [deny|denied]|authorize/) < 0) {
            reject(err);
            return;
          }
        }

        if (!showModalWhenCloseAuth) {
          const rejectData = { ...err,
            unAuthed: true
          };
          reject(rejectData);
          return;
        } // 控制地理位置开关的名称(系统控制的开关，还是微信层面的开关)


        const isSysAndWechatAllowedGetLoc = locationEnabled && locationAuthorized;
        const {
          authLevelName,
          confirmText
        } = getTextByReason(locationEnabled, isSysAndWechatAllowedGetLoc);
        wx.showModal({
          confirmText,
          title: `未开启${authLevelName}位置信息权限`,
          content: content || `开启${authLevelName}位置信息权限\n体验更顺畅的出行服务`,
          showCancel: showCancel && isSysAndWechatAllowedGetLoc,
          confirmColor: '#4875fd',
          success: res => {
            // 用户拒绝去授权
            if (!res.confirm || !locationEnabled || !locationAuthorized) {
              const rejectData = { ...err,
                unAuthed: true
              };
              return reject(rejectData);
            } // 用户同意去打开授权(只是打开小程序设置页，用户不一定打开了位置授权，所以需要重新进行获取位置)


            openSetting().then(() => {
              resolve(Location.getLocation());
            }).catch(err => {
              const rejectData = { ...err,
                unAuthed: true
              };
              reject(rejectData);
            });
          }
        });
      });
    });
    return getLocPromise;
  }
  /**
   * @function
   * @memberof Location
   * @description 获取城市名称、城市编码
   * @param       {Number} lat 纬度
   * @param       {Number} lng 经度
   * @param       {Number} getPoi 是否获取详细poi信息， 0 - 不获取， 1 - 获取
   * @returns      {Promise<POI>} 返回poi信息
   * @example
   * <caption>POI示例</caption>
   * {
   *   cityName: '北京市',
   *   cityCode: '100100',
   *   province: '北京市',
   *   latitude: 325.255333,
   *   longitude: 116.2545454,
   *   adCode: 1212144,
   *   poi: {
   *     id: '1114545554511',
   *     title: '腾讯北京总部大厦',
   *     address : '北京市海淀区东北旺西路',
   *   }
   * }
   */


  static getPoiInfo(lat, lng, getPoi = 0) {
    // 优先查询缓存中是否有位置信息，如果有直接返回
    // 以‘纬度-经度-是否获取poi信息的标识为属性名存储位置信息
    const cacheName = `${lat}-${lng}-${getPoi}`; // 命中缓存

    if (LocCache[cacheName]) {
      return Promise.resolve(LocCache[cacheName]);
    } // 正在请求中，直接返回


    if (getPoiInfoPromise) {
      return getPoiInfoPromise;
    }

    getPoiInfoPromise = R$1.post('basic/lbs/decode', {
      lat,
      lng,
      getPoi
    }).then(res => {
      const {
        errCode,
        resData = {}
      } = res;

      if (errCode === 0) {
        const {
          result = {}
        } = resData;
        const {
          ad_info: adInfo = {}
        } = result;
        const loc = {
          province: adInfo.province,
          cityName: adInfo.city,
          adCode: adInfo.adcode,
          cityCode: formatCityCode(adInfo.city_code, adInfo.nation_code),
          latitude: lat,
          longitude: lng
        };
        getPoiInfoPromise = null;

        if (getPoi === 0) {
          // 缓存位置信息
          LocCache[cacheName] = loc;
          return loc;
        }

        loc.adCode = adInfo.adcode;
        loc.poi = formatPoi(result); // 缓存位置信息

        LocCache[cacheName] = loc;
        return loc;
      }

      getPoiInfoPromise = null;
      return Promise.reject(res);
    }).catch(err => {
      getPoiInfoPromise = null;
      return Promise.reject(err);
    });
    return getPoiInfoPromise;
  }
  /**
   * @function
   * @memberof Location
   * @description 获取位置、城市信息
   * @param       {Boolean} showModalWhenCloseAuth 获取位置时，如果用户关闭了位置授权，是否弹窗提示用户打开授权
   * @param       {String}  type 坐标类型
   * @param       {String}  content 弹窗内容
   * @param       {Number}  getPoi 是否获取详细poi信息， 0 - 不获取(不返回poi字段)， 1 - 获取(返回poi字段)
   * @returns {Promise<POI|ERR>} 返回对象
   * @example
   * <caption>POI类型示例</caption>
   * {
   *   cityName: '北京市',
   *   cityCode: '100100',
   *   province: '北京市',
   *   latitude: 325.255333,
   *   longitude: 116.2545454,
   *   adCode: 1212144,
   *   poi: {
   *     id: '1114545554511',
   *     title: '腾讯北京总部大厦',
   *     address : '北京市海淀区东北旺西路',
   *   }
   * }
   * @example
   * <caption>ERR类型示例</caption>
   * {
   *   err,
   *   unAuthed: true,
   *   locationScopeStatus: false
   * }
   */


  static getLocationDetail(showModalWhenCloseAuth = false, type = LocationType, content = '', getPoi = 0) {
    return Location.getLocation(showModalWhenCloseAuth, type, content).then(res => Location.getPoiInfo(res.latitude, res.longitude, getPoi)).catch(err => Promise.reject(err));
  }
  /**
   * @memberof Location
   * @description 监听获取位置状态变化(目前只有失败->成功时会触发事件)
   * @param       {Function} cb 监听事件回调函数
   * @returns {void}
   */


  static onLocStatusChange(cb) {
    if (cb && typeof cb === 'function') {
      E.bind(EventName, cb);
    }
  }
  /**
   * @memberof Location
   * @description 监听用户城市变化(如: 北京市->深圳市)
   * @param       {Function} cb 监听事件回调函数
   * @returns {void}
   */


  static onCityChange(cb) {
    if (cb && typeof cb === 'function') {
      E.bind(CityChangeEventName, cb);
    }
  }
  /**
   * @memberof Location
   * @description 获取路线规划
   * @param       {String} to 目的地坐标，格式：lat,lng
   * @param       {String} depart 出发地坐标，格式：lat,lng
   * @param       {String} mode 出行方式， driving 驾车[默认]
   * @returns     {Object} result.routes 返回数据 [{}, ...]
   */


  static async getRoute(to, depart, mode = 'driving') {
    let from = depart;
    const coorReg = new RegExp(/(\d+\.\d{6,}),(\d+\.\d{6,})/);
    if (!coorReg.test(to)) throw Error('目的地参数格式错误');

    if (!coorReg.test(from)) {
      // 出发地缺省使用当前位置
      const {
        latitude,
        longitude
      } = await Location.getMergedLocation();
      from = `${latitude},${longitude}`;
    }

    return R$1.post('basic/lbs/direction', {
      from,
      to,
      mode
    });
  }

}

const R = new Request();
const {
  miniProgram: {
    version
  } = {}
} = wx.getAccountInfoSync() || {};
const app = getApp({
  allowDefault: true
});
const ReportInterval = 3000; // 轮训上报间隔

const ReportDataQueue = []; // 上报数据队列

let ReportTaskId = -1; // 轮训上报id

let appShowOptions = {}; // 设置小程序onShow参数

try {
  appShowOptions = wx.getLaunchOptionsSync();
} catch (_) {
  appShowOptions = {};
}
/**
 * 获取系统信息
 * @private
 * @returns {object} 系统信息
 */


const getSystemInfo = () => new Promise(resolve => {
  wx.getSystemInfo({
    success: systemInfo => {
      const {
        model,
        version: wxVersion,
        platform,
        SDKVersion,
        host
      } = systemInfo;
      resolve({
        model,
        wxVersion,
        platform,
        SDKVersion,
        host
      });
    },
    fail: () => {
      resolve({});
    }
  });
});

const getSystemPromise = getSystemInfo(); // 缓存系统信息，避免每次都重新获取系统信息

/**
 * 获取网络信息
 * @private
 * @returns {string} 网络信息
 */

const getNetworkType = () => new Promise(resolve => {
  wx.getNetworkType({
    success: netInfo => {
      resolve(netInfo.networkType);
    },
    fail: () => {
      resolve('unknown');
    }
  });
});

let ProvinceInfoCache = null;
/**
 * 获取省市信息
 * @private
 * @returns {object} 省份和市区信息
 */

const getProvinceInfo = async () => {
  if (ProvinceInfoCache) {
    return ProvinceInfoCache;
  }

  try {
    const loc = await Location.getLocationDetailSilent();
    ProvinceInfoCache = {
      city: loc.cityName,
      province: loc.province
    };
    return ProvinceInfoCache;
  } catch (_) {
    return {
      city: '',
      province: ''
    };
  }
};
/**
 * 获取userId
 * @private
 * @returns {string} userId
 */


const getUserId = async () => {
  if (userId) {
    return Promise.resolve(userId);
  }

  const {
    userId
  } = await getAuthInfo();
  return userId;
};

let launchFrom = '';
/**
 * 获取用户启动小程序时的渠道来源值
 * @private
 * @returns {string} 用户启动小程序时的渠道来源值
 */

const getLaunchFrom = () => {
  if (launchFrom) {
    return launchFrom;
  }

  try {
    const LaunchOptions = wx.getLaunchOptionsSync() || {};
    const {
      query = {}
    } = LaunchOptions;
    launchFrom = query.from || '';
    return launchFrom;
  } catch (_) {
    return '';
  }
};
/**
 * 将上报的对象类型的数据转换成数组类型
 * @private
 * @param {object} reportData 需要上报的数据
 * @returns {array} 数组格式的上报数据
 */


const getReportDataList = (reportData = {}) => {
  const reportList = [];
  reportList.length = 40;
  Object.keys(reportData).forEach(key => {
    const reportIndex = Number(key);
    reportList[reportIndex] = reportData[key];
  });
  return reportList;
};
/**
 * 格式化上报数据
 * @private
 * @param {object} reportData 需要上报的数据
 * @param {object} deviceData 设备数据(系统信息，网络状况，位置信息)
 * @returns {array} 格式化后的上报数据
 */


const formatReportData = async (reportData, deviceData) => {
  const [system, netType, provinceInfo] = deviceData;
  const param = Array.isArray(reportData.param) ? reportData.param : getReportDataList(reportData);
  const {
    client
  } = await app.tms.getEnvInfo();
  param[5] = await getUserId();
  param[10] = version; // 上报小程序版本号

  param[19] = system === null || system === void 0 ? void 0 : system.host; // 上报宿主app信息 { appId, env, version }

  param[16] = getLaunchFrom(); // 渠道公共参数

  param[17] = param[17] || (provinceInfo === null || provinceInfo === void 0 ? void 0 : provinceInfo.province);
  param[18] = param[18] || (provinceInfo === null || provinceInfo === void 0 ? void 0 : provinceInfo.city);
  param[28] = client;

  if (!param[9]) {
    param[9] = '2';
  }

  if (!param[12]) {
    param[12] = netType;
  }

  if (!param[13]) {
    param[13] = '2';
  }

  if (!param[29]) {
    // 上报打开小程序的场景值
    param[29] = appShowOptions.scene;
  }

  if (!param[33]) {
    param[33] = JSON.stringify(system);
  }

  if (!param[36]) {
    // 上报打开小程序的场景值及参数
    param[36] = appShowOptions;
  } // 所有上报数据都转换为字符串


  param.forEach((reportItem, index) => {
    if (reportItem && typeof reportItem !== 'string') {
      param[index] = `${JSON.stringify(reportItem)}`;
    } else {
      const paramItem = param[index];
      param[index] = paramItem || paramItem === 0 ? `${paramItem}` : '';
    }
  });
  return param.map(item => item !== null ? encodeURIComponent(item) : item);
};
/**
 * 格式化上报到小程序后台的数据(自定义分析使用)
 * @private
 * @param {array} data 埋点数据
 * @returns {object} 格式化的数据
 */


const formatAnalyticsData = async data => {
  const analyticsData = {};
  const {
    10: version,
    29: scene
  } = data;
  analyticsData[10] = version; // 小程序版本号

  analyticsData[29] = scene; // 小程序场景值

  analyticsData[17] = decodeURIComponent(data[17]); // 用户所在省份

  analyticsData[18] = decodeURIComponent(data[18]); // 用户所在城市
  // 将30-40位埋点字段补充到上报数据中

  for (let i = 30; i < 41; i += 1) {
    analyticsData[i] = decodeURIComponent(data[i] || ''); // 如果第33列是设备信息，则忽略

    if (data[33] && data[33].indexOf('model') > -1) {
      analyticsData[33] = '';
    }
  }

  const {
    client
  } = await app.tms.getEnvInfo();
  return {
    analyticsData,
    eventName: `${client}_${data[27]}`
  };
};
/**
 * 上报数据到小程序后台
 * @private
 * @param {array} list 需要上报的数据列表
 * @returns {void}
 */


const reportAnalytics = (list = []) => {
  try {
    list.forEach(item => {
      const {
        eventName,
        analyticsData
      } = formatAnalyticsData(item);
      wx.reportAnalytics(eventName, analyticsData);
    });
  } catch (_) {}
};
/**
 * @description report 方法 将上报数据缓存到内存中
 * @name report
 * @param {object} reportData 需要上报的数据
 * @param {boolean} reportNow 是否立即上报
 * @returns {Void} 无返回值
 */


const cache = (reportData, reportNow) => {
  // 如果是微信爬虫 | 自动化测试场景，则不进行数据上报
  const DO_NOT_NEED_REPORT_SCENES = [1030, 1129];

  if (DO_NOT_NEED_REPORT_SCENES.includes(appShowOptions.scene)) {
    return Promise.resolve();
  }

  const task = [getSystemPromise, getNetworkType(), getProvinceInfo()];
  return Promise.all(task).then(async deviceData => {
    // 先对上报数据进行预处理
    const result = await formatReportData(reportData, deviceData); // 将需要上报的数据缓存在队列中

    ReportDataQueue.push(result);
  }).then(() => {
    if (reportNow) {
      return sendData();
    }

    return {
      cache: true
    };
  });
};
/**
 * 发送数据到服务端
 * @private
 * @returns {promise} 发送请求
 */


const sendData = async () => {
  // 没有数据时，不发送上报请求
  if (ReportDataQueue.length === 0) {
    return Promise.resolve();
  }

  const cacheReportData = [...ReportDataQueue];
  return R.post('basic/event/upload', {
    userId: await getUserId(),
    batch: cacheReportData
  }).then((res = {}) => {
    const {
      errCode
    } = res || {}; // 已经发送成功，则将本次发送的数据从数据队列中删除

    if (errCode === 0) {
      ReportDataQueue.splice(0, cacheReportData.length);
      reportAnalytics(cacheReportData); // 将数据上报至小程序后台
    }
  });
};
/**
 * 开启轮询上报定时器
 * @private
 * @param {boolean} clearTimerAfterSend 是发送完数据后否清除定时器标识
 * @returns {void}
 */


const startSendTimer = clearTimerAfterSend => {
  ReportTaskId = setInterval(async () => {
    sendData();

    if (clearTimerAfterSend) {
      clearInterval(ReportTaskId);
    }
  }, ReportInterval);
};
/**
 * 停止定时器
 * @private
 * @returns {void}
 */


const stopSendTimer = () => {
  clearInterval(ReportTaskId);
};
/**
 * 发送上报数据到服务端
 * @private
 * @param {boolean} reportNow 是否立即上报
 * @param {boolean} clearTimerAfterSend 是否发送之后清除定时器
 * @returns {void}
 */


const report = (reportNow = false, clearTimerAfterSend = false) => {
  if (reportNow) {
    if (ReportDataQueue.length > 0) {
      sendData();
    }

    if (!clearTimerAfterSend) {
      startSendTimer(clearTimerAfterSend);
    } else {
      stopSendTimer();
    }
  } else {
    startSendTimer(clearTimerAfterSend);
  }
};
/**
 * 更新小程序onShow参数
 * @private
 * @param {object} options 小程序onShow参数
 * @returns {void}
 */


const setAppShowOptions = options => {
  appShowOptions = options;
};
/**
 * 监听小程序onShow事件
 * @private
 */


wx.onAppShow(options => {
  // 更新onShow参数
  setAppShowOptions(options); // 上报数据

  report(true);
});
/**
 * 监听小程序onHide事件
 * @private
 */

wx.onAppHide(() => {
  // onHide时立即上报，并清除定时器
  report(true, true);
});

/**
 * Tencent Inc. All Rights Reserved.
 * Description: Some Functions for Obejct.
 */

/**
 * @function
 * @description 把对象拼接成 a=b&c=d 形式的字符串
 * @param       {Object} queryObj  需要进行序列化的对象
 * @returns     {String} 拼接后的字符串
 */
const serialize = (queryObj = {}) => {
  if (!queryObj) {
    return '';
  }

  const queryArray = [];
  Object.keys(queryObj).forEach(key => {
    queryArray.push(`${key}=${queryObj[key]}`);
  });
  return queryArray.join('&');
};

/**
 * @description rpx to px
 * @param    {Number} rpx 需要转换的rpx数值
 * @returns  {Number}     转换后的rpx数值
 */
const rpxToPx = rpx => {
  const sys = wx.getSystemInfoSync();
  const ww = sys.windowWidth;
  const ratio = ww / 750;
  return rpx * ratio;
};

/**
 * 字符串截断，处理时按可见字符长度进行截断
 * 可见字符的含义是指：字母、数字、汉字、表情等均等价于一个字符
 * @param {String} str - 原始字符串
 * @param {Number} maxLen - 字符串截断后的最大长度
 * @returns {String} 截断后的字符串；如果确实进行了截断，在最后面加'...'；
 */
const subStr = (str, maxLen) => {
  // 按照码点（codePoint），把原始字符串的前maxLen+1个字符放到chars数组中
  const chars = [];

  for (const codePoint of str) {
    // eslint-disable-line
    chars.push(codePoint);
    if (chars.length > maxLen) break;
  } // 如果可见字符数量小于等于字符串截断后的最大长度，无需截断，返回原始字符串


  if (chars.length <= maxLen) {
    return str;
  } // 可见字符数量多于字符串截断后的最大长度，需要截断，并在末尾添加...
  // 注意，此时返回的字符串是 maxLen-2个可见字符 + ...（maxLen-2是因为...占用2个汉字字符位置）


  return `${chars.splice(0, maxLen - 2).join('')}...`;
};
/**
 * 手机号处理，隐藏中间部分位数
 * 隐藏规则：假设隐藏部分位数后，手机号由ABC构成，其中A、C是可见部分，B是隐藏部分
 * 1. 隐藏部分（B)占手机号总位数的1/3，且隐藏部分的位数向上取整
 * 2. 不被隐藏的部分（A、C）要均匀分布在隐藏部分（B）的两侧，即尽量使AC等长
 * 3. 如果不隐藏部分（A、C）长度无法等长，则使C多显示一位
 * @param {String} phone 手机号
 * @returns {String} 隐藏后的手机号
 */


const hidePhoneCenter = phone => {
  const len = phone && phone.length;

  if (!len) {
    return '';
  } // 各部分位数


  const center = Math.ceil(len / 3);
  const left = Math.floor((len - center) / 2);
  const right = len - center - left; // 各部分字符串

  const centerStr = phone.substr(left, center).replace(/./g, '*');
  const leftStr = phone.substr(0, left);
  const rightStr = phone.substr(-right);
  return `${leftStr}${centerStr}${rightStr}`;
};
/**
 * 格式化车牌
 * 例如：京A12345 -> 京A·12345
 * @param {String} plate 车牌号
 * @returns {String} 格式化后的车牌号
 */


const formatPlate = plate => {
  if (!plate || typeof plate !== 'string') {
    return '';
  }

  if (plate.length <= 2 || /·/.test(plate)) {
    return plate;
  }

  return `${plate.substring(0, 2)}·${plate.substring(2)}`;
};
/**
 * 检查手机号是否合法
 * @param {String} phone 手机号
 * @returns {Boolean} 手机号是否合法
 */


const isValidPhone = phone => /^1[\d]{10}$/.test(phone);
/**
 * 检查验证码是否合法
 * @param {String} code 验证码
 * @returns {Boolean} 验证码是否合法
 */


const isValidAuthCode = code => /^[\d]{6}$/.test(code);

const validPlateFirstLetters = ['京', '津', '冀', '晋', '蒙', '辽', '吉', '黑', '沪', '苏', '浙', '皖', '闽', '赣', '鲁', '豫', '鄂', '湘', '粤', '桂', '琼', '渝', '川', '贵', '云', '藏', '陕', '甘', '青', '宁', '新', '使', '领'];
/**
 * 检查车牌是否合法
 * @param {String} plate 车牌
 * @returns {Boolean} 车牌是否合法
 */

const isValidPlate = plate => {
  if (!plate || typeof plate !== 'string') {
    return false;
  } // 检查首位是否是合法的汉字


  const [firstLetter] = plate;

  if (validPlateFirstLetters.indexOf(firstLetter) === -1) {
    return false;
  }

  if (!/[使领警学]/.test(plate)) {
    // 普通车牌
    const number = plate.substring(1);
    return /^[a-zA-Z][0-9a-zA-Z]{5}$/.test(number) // 第一位是字母，后面5位是字母或数字
    || /^[a-zA-Z][a-zA-Z][0-9a-zA-Z]{5}$/.test(number) // 第一位是字母，第二位是字母，后面再跟5位字母或数字（新能源小车）
    || /^[a-zA-Z][0-9a-zA-Z]{5}[a-zA-Z]$/.test(number) // 第一位是字母，最后一位是字母，中间5位字母或数字（新能源大车）
    || /^粤Z[0-9a-zA-Z]{4,5}[港澳]{1}/.test(plate); // 广东港澳两地车牌
  } // return /^[^使领警学]{1}[a-zA-Z][0-9a-zA-Z]{3,4}[使领警学]{1}$/.test(plate) || // 使/领/警/学车牌
  // /^[使领]{1}[0-9a-zA-Z]{5}$/.test(plate); // 使馆领事馆特殊车牌


  return false;
};
/**
 * 四舍五入，并返回格式化的字符串
 * 支持保留n位小数，n>=0，如 round(1.325, 2)=1.33
 * 支持格式化字符串时取出末尾的0，如round(1.109, 2, true)=1.1
 * @param {any} x 原数字
 *                如果n不是合法数字或者无法转换为合法数字，roundStr结果返回''
 * @param {any} n 保留几位小数，默认0
 *                如果n不是合法数字或者无法转换为合法数字，roundStr结果返回''
 *                如果n小于0，roundStr结果返回''
 *                如果n的值包含小数部分，roundStr处理时只关注n的整数部分值
 * @param {boolean} removeTrailingZero 是否移除字符串末尾的无效数字0
 * @returns {string} 返回四舍五入后的字符串，异常情况下返回空字符串''
 */


const roundStr = (x, n = 2, removeTrailingZero = false) => {
  let xNum = Number(x); // x转换为数字

  const nNum = Math.floor(Number(n)); // n转换为数字，且只保留整数部分
  // 异常情况，返回''

  if (isNaN(xNum) || isNaN(nNum) || nNum < 0) return ''; // 仅保留整数的情况

  if (nNum === 0) return Math.round(xNum); // 保留n位小数的情况

  const xStr = xNum.toString();
  const rexExp = new RegExp(`\\.\\d{${nNum}}5`); // 1. 大部分情况下，四舍五入使用Number.toFixed即可
  // 2. 然而，Number.toFixed方法在某些情况下对第n+1位是5的四舍五入存在问题，如1.325保留2小数时结果为1.32（期望为1.33）
  //    对此种情况下，有两种处理方式：
  //    2.1 先扩大10^n倍，舍掉小数部分取整数部分，然后加1，最后缩小10^n倍
  //        但此种情况下，不能处理过大的数字，也不能处理保留小数位数过多的情况，会可能导致数字超过Infinity
  //    2.2 Number.toFixed是四舍6入，对于第n+1位是5的情况，增加2*10^(-n-1)，保证满足第n+1位>6
  //        增加2*10^(-n-1)而不是增加1*10^(-n-1)是因为后者不能保证第n+1位>=6，例如1.325+0.001=1.32599999...第n+1位仍然为5
  // 此处，采用2.2方式，解决Number.toFixed的问题，又能避免2.1方式中数字超过Infinity的问题

  if (rexExp.test(xStr)) {
    // 情况2，处理方式2.1：如果小数部分第n+1位是5，增加2*10^(-n-1)
    xNum += 2 * 10 ** (-nNum - 1);
  }

  const str = xNum.toFixed(nNum);
  if (!removeTrailingZero) return str; // 去除末尾的0

  if (/^\d+\.0*$/.test(str)) {
    // 小数部分全是0
    return str.replace(/^(\d+)(\.0*)$/, (_m, s1) => s1);
  }

  return str.replace(/^(\d+\.\d*[1-9]{1})(0*)$/, (_m, s1) => s1);
};

/**
 * Tencent Inc. All Rights Reserved.
 * @author:
 * Created:
 * Description: format time.
 * History:
 *    2017-07-26 @davislu modify.
 */

/**
 * @function
 * @description 格式化时间
 * @param {Number} seconds 秒数
 * @returns {String} 格式化的时间 -> 2小时47分钟或者12天
 */
const formatTime = seconds => {
  if (typeof seconds !== 'number') return seconds;
  const PER_MINUTE = 60 * 1;
  const PER_HOUR = 60 * PER_MINUTE;
  const PRE_DAY = 24 * PER_HOUR;
  let cost = ''; // >24小时的显示  【x天】

  if (seconds >= PRE_DAY) {
    cost = `${Math.floor(seconds / PRE_DAY)}天`; // <1小时的显示  【x分钟】 ，x取整数上限，最低为1分钟。
  } else if (seconds < PER_HOUR) {
    cost = `${Math.ceil(seconds / PER_MINUTE)}分钟`; // <24小时&>1小时的显示  【x小时y分钟】 ，分钟取整数上限
  } else {
    cost = `${Math.floor(seconds / PER_HOUR)}小时`;
    const s = seconds % PER_HOUR;

    if (s > 0) {
      cost += `${Math.ceil(s / PER_MINUTE)}分钟`;
    }
  }

  return cost;
};
/**
 * @function
 * @description 将秒数格式化为x天y小时z分钟
 * @param       {Number} oriSeconds 秒数
 * @returns      {String} 格式化后的文案
 */


const formatTimeWithDetails = oriSeconds => {
  let seconds = oriSeconds; // 非Number类型，直接返回，不进行处理

  if (typeof seconds !== 'number') return seconds; // 参数为NaN类型，直接抛出异常

  if (isNaN(seconds)) throw new Error(`formatTimeWithDetails方法的参数seconds必须时一个非NaN数字，现在的值为${seconds}`); // 定义一些常量
  // 1分钟包含的秒数

  const PER_MINUTE = 60 * 1; // 1小时包含的秒数

  const PER_HOUR = 60 * PER_MINUTE; // 1天包含的秒数

  const PRE_DAY = 24 * PER_HOUR;
  let cost = ''; // 秒数多于1天

  if (seconds >= PRE_DAY) {
    cost = `${Math.floor(seconds / PRE_DAY)}天`;
    seconds %= PRE_DAY;
  } // 秒数小于1小时


  if (seconds < PER_HOUR) {
    if (cost) {
      cost += '0小时';
    }

    cost += `${Math.ceil(seconds / PER_MINUTE)}分钟`;
  } else {
    // 秒数介于1天和1分钟之间
    cost += `${Math.floor(seconds / PER_HOUR)}小时`;
    const s = seconds % PER_HOUR;

    if (s > 0) {
      cost += `${Math.ceil(s / PER_MINUTE)}分钟`;
    }
  }

  return cost;
};
/**
 * @function
 * @description 对原有时间字符串进行格式化
 * @param {String} str - 原字符串
 * @param {String} dateSeprator - 日期分隔符
 * @param {Boolean} keepSeconds - 是否保留秒数
 * @returns {String} 格式化后的文案
 */


const formatTimeStr = (str = '', dateSeprator = '.', keepSeconds = false) => {
  if (typeof str !== 'string' || str === '') {
    return '';
  }

  let s = str.replace(/-/g, dateSeprator).replace(/：/g, ':'); // 不保留秒的时候，如果有两个冒号，截取第二个冒号之前的部分

  if (!keepSeconds && /[^:]*:[^:]*:/.test(s)) {
    const firstIndex = s.indexOf(':');
    const secondIndex = s.indexOf(':', firstIndex + 1);

    if (secondIndex > -1) {
      s = s.substring(0, secondIndex);
    }
  }

  return s;
};
/**
 * @description 格式化时间戳为 yyyy-mm-dd, yyyy-mm-dd HH:MM, yyyy-mm-dd HH:MM:SS
 * @param {Date} date 日期
 * @param {Boolean} withTime 是否带时间
 * @param {Boolean} withSeconds 是否带秒数
 * @param {String} join 连字符
 * @returns {String} 格式化后的字符串，如 2021-03-18 或者 2021-03-18 10:11
 */


const dateToString = (date, withTime = false, withSeconds = false, join = '-') => {
  const DATE = date ? new Date(date) : new Date(); // 为兼容ios，android平台的差异，故而不使用toLocaleDateString方法

  const year = DATE.getFullYear();
  const month = DATE.getMonth() + 1;
  const day = DATE.getDate();
  const time = DATE.toTimeString().slice(0, 8);
  let dateStr = year + join + month + join + day;

  if (!withTime) {
    return dateStr.replace(/\b\d\b/g, '0$&');
  }

  dateStr = `${dateStr} ${time}`.replace(/\b\d\b/g, '0$&');

  if (!withSeconds) {
    dateStr = dateStr.slice(0, -3);
  }

  return dateStr;
};

/**
 * Tencent Inc. All Rights Reserved.
 * @author: petegao@tencent.com
 * Created: 2019-01-14.
 *
 */
let isIPXSign = false;
let ipxClass = '';
/**
 * @returns {undefined}
 */

function ipxInit() {
  const sysInfo = syncApi.getSystemInfoSync();
  const {
    model,
    platform: pl
  } = sysInfo;

  if (pl !== 'ios') {
    return;
  }

  if (model.search('iPhone X') > -1 || model.search('iPhone 11') > -1) {
    isIPXSign = true;
    ipxClass = 'view__ipx';
  }
}
/**
 * @returns {Boolean} 判断是否是 iPhoneX
 */


function isIPX() {
  return isIPXSign;
}
/**
 * @returns {String} 返回 ipxClass
 */


function getIpxClass() {
  return ipxClass;
}
/**
 * @param {Object} config 用户需要合并的IPX的配置
 * @returns {Object} 合并后的IPX的配置
 */


function getIpxConfig(config) {
  return { ...config,
    data: { ...config.data,
      isIPX: isIPXSign,
      ipxClass
    }
  };
}

/**
 * 支持服务接入相关接口
 */
/**
 * getMpOpenId 获取接入方用户唯一标识 [变更为 getOuterOpenId]
 * @private
 * @description 唯一标识 openId 用于与服务商建立账号关联关系
 * @category 服务接入
 * @param {String} mpId 接入服务商渠道标识
 * @param {String} userId 出行用户标识
 * @returns {Promise<String>} 返回 openId，失败时返回空
 */

async function getMpOpenId(mpId, userId) {
  const {
    resData
  } = await new Request().post('user/mpinfo', {
    userId,
    mpId
  });
  const {
    openId = ''
  } = resData || {};
  return openId;
}
/**
 * getOuterOpenId 获取接入方用户唯一标识
 * @public
 * @description 唯一标识 openId 用于服务接入方作为唯一标识、向腾讯出行服务同步订单等
 * @category 服务接入
 * @param {String} apiKey 服务接入方渠道标识
 * @returns {Promise<String>} 返回 openId，失败时返回空
 */


async function getOuterOpenId(apiKey) {
  const {
    resData
  } = await new Request().post('user/mpinfo', {
    mpId: apiKey
  });
  const {
    openId = ''
  } = resData || {};
  return openId;
}

/**
 * @public
 * @description 创建网络请求对象，用于向腾讯出行服务平台后台发送网络请求
 * @param {Object} [config] 参数配置
 * @param {Boolean} [config.withAuth=true] 是否填充登录态参数
 * @param {String} [config.host] 自定义的host域名
 * @param {Object} [config.baseParam] 默认携带的参数
 * @returns {Object} [Request实例](#class-request)
 * @example
 * const $ = getApp().tms.createRequest();
 * $.get(apiPath)
 *   .then((resp) => {
 *     // ...
 *   })
 *   .catch((err) => {
 *     // ...
 *   });
 */

const createRequest = (config = {}) => new Request(config);
/**
 * @description 埋点上报
 * @returns {Object} 包含[report方法](#report)的对象
 * @example
 * getReporter().report(reportData, reportNow);
 */


const getReporter = () => ({
  report: cache
});
/**
 * @description 埋点上报(快速上报，不依赖用户userId标识)
 * @returns {Class} [FastReporter类](#class-fastreport)
 */


const getFastReporter = () => FastReport;
/**
 * @description 自定义事件机制
 * @returns {Object} [EventDispatcher实例](#class-eventdispatcher)
 */


const getEventDispatcher = () => new EventDispatcher();
/**
 * @description 获取地理位置方法的集合
 * @returns {Class} [Location类](#class-location)
 */


const getLocationManager = () => Location;
/**
 * @description init core包初始化, 小程序已在app.js中对齐初始化
 * @param {Object} options 初始化
 * @returns {undefined} 无返回值.
 */


const init = (options = {}) => {
  const {
    appVersion,
    wxAppId,
    client,
    defaultHost,
    cloudEnvId,
    appEnv,
    appPagePaths
  } = options;
  setEnvInfo({
    wxAppId,
    appVersion,
    appEnv,
    client
  });
  setAppPagePaths(appPagePaths);
  Request.defaultHost = defaultHost; // 初始化云环境

  wx.cloud.init({
    env: cloudEnvId
  });
};

const api = {
  init,
  createRequest,
  setAuthInfo,
  getLogManager,
  getRealtimeLogManager,
  md5,
  getReporter,
  getFastReporter,
  getLocationManager,
  getEventDispatcher,
  getAccountInfoSync: syncApi.getAccountInfoSync,
  getEnvInfo,
  getConfig: configApi.getConfig,
  navigateToWebview: nav.navigateToWebview,
  isAppPageExist,
  callCloudFunc,

  /* 字符串方法 */
  formatPlate,
  subStr,
  hidePhoneCenter,
  isValidPhone,
  isValidPlate,
  isValidAuthCode,
  roundStr,

  /* 时间方法 */
  formatTime,
  formatTimeStr,
  formatTimeWithDetails,
  dateToString,

  /* IPX方法 */
  ipxInit,
  isIPX,
  getIpxClass,
  getIpxConfig,

  /* 处理对象方法 */
  serialize,

  /* 获取外部合作商openid */
  getMpOpenId,
  // 变更为 getOuterOpenId
  getOuterOpenId,

  /** rpx转px */
  rpxToPx,
  ...syncApi
};

export default api;
