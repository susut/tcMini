import CoreObj from '@tmsfe/tms-core';

const {
  createRequest: createRequest$1
} = CoreObj;
const R = createRequest$1();
const LocCache = {}; // 位置信息缓存

const LocationScopeKey = 'scope.userLocation';
const LocationType = 'gcj02'; // 获取经纬度时的坐标名称

let getLocPromise = null;
let getPoiInfoPromise = null;
let getLocationStatus = true; // 获取位置成功失败状态

let userLocation = null; // 用户手动选择的位置信息（切换城市后的位置信息）

let cityTheUserAt = ''; // 用户所在的城市

let getSettingPromise = null; // 获取授权设置promise

/**
 * @private
 * @param {string} type 定位类型
 * @returns {promise} 获取的定位结果
 */

const getWxLocation = (type = LocationType) => new Promise((resolve, reject) => {
  wx.getLocation({
    type: type || LocationType,
    success: resolve,
    fail: reject
  });
});
/**
 * @private
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
 * @private
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
 * @private
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
 * 获取设备系统信息
 * @private
 * @returns {Object} 设备系统信息
 */


const getSystemInfo = () => {
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
 * 格式化城市编码
 * @private
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
 * 更新获取位置状态
 * @private
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
 * @private
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
  * getUserLocation 方法 获取用户选择的城市位置信息 或者 用户真实的位置信息
  * @memberof Location
  * @param {boolean} showModalWhenCloseAuth 没有授权时是否展示授权弹窗
  * @returns {promise} 用户位置信息
  */


const getUserLocation$1 = async (showModalWhenCloseAuth = true) => {
  // 优先用户选择的城市
  if (userLocation) {
    return userLocation;
  }

  return await getLocationDetail(showModalWhenCloseAuth);
};
/**
  * setUserLocation 方法 设置用户位置（小程序生命周期内有效）
  * @param {Object} loc 用户手动选择的位置
  * loc参数示例：
  * {
  *   province: '北京市',
  *   cityName: '北京市',
  *   cityCode: '100100',
  *   latitude: 325.255333,
  *   longitude: 116.2545454,
  *   adCode: 1212144,
  * }
  * @memberof Location
  * @returns {void}
  */


const setUserLocation$1 = loc => {
  if (!loc || typeof loc !== 'object') {
    return;
  } // 如果城市发生变化，派发事件


  const {
    cityName: curCityName
  } = loc;

  if (curCityName && cityTheUserAt !== curCityName) {
    cityTheUserAt = curCityName;
    userLocation = loc;
  }
};
/**
  * 获取位置(经纬度)
  * @private
  * @param {boolean} showModalWhenCloseAuth 获取位置时，如果用户关闭了位置授权，是否弹窗提示用户打开授权
  * @param {string}  type 坐标类型
  * @param {string}  content 弹窗内容
  * @param {boolean} showCancel 是否显示取消按钮
  * @returns {promise} 获取到的位置
  */


const getLocation = (showModalWhenCloseAuth = false, type = LocationType, content = '', showCancel = true) => {
  // 正在获取位置，返回正在进行中的Promise对象
  if (getLocPromise) {
    return getLocPromise;
  } // 上一次获取位置结束，进行新的获取位置逻辑处理


  getLocPromise = new Promise((resolve, reject) => {
    getWxLocation(type).then(res => {
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
      } = getSystemInfo(); // 系统位置定位开关打开 && 允许微信使用位置定位能力开关打开

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
            resolve(getLocation());
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
};
/**
  * 获取城市名称、城市编码
  * @private
  * @param       {Number} lat 纬度
  * @param       {Number} lng 经度
  * @param       {Number} getPoi 是否获取详细poi信息， 0 - 不获取， 1 - 获取
  * @returns      {Object}
  * 返回数据示意
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


const getPoiInfo = (lat, lng, getPoi = 0) => {
  // 优先查询缓存中是否有位置信息，如果有直接返回
  // 以‘纬度-经度-是否获取poi信息的标识为属性名存储位置信息
  const cacheName = `${lat}-${lng}-${getPoi}`; // 命中缓存

  if (LocCache[cacheName]) {
    return Promise.resolve(LocCache[cacheName]);
  } // 正在请求中，直接返回


  if (getPoiInfoPromise) {
    return getPoiInfoPromise;
  }

  getPoiInfoPromise = R.post('basic/lbs/decode', {
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
};
/**
  * 获取位置、城市信息
  * @private
  * @param       {Boolean} showModalWhenCloseAuth 获取位置时，如果用户关闭了位置授权，是否弹窗提示用户打开授权
  * @param       {String}  type 坐标类型
  * @param       {String}  content 弹窗内容
  * @param       {Number}  getPoi 是否获取详细poi信息， 0 - 不获取(不返回poi字段)， 1 - 获取(返回poi字段)
  * @returns {promise}
  * 返回数据示意
  * {
  *   province: '北京市',
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
  */


const getLocationDetail = (showModalWhenCloseAuth = false, type = LocationType, content = '', getPoi = 0) => getLocation(showModalWhenCloseAuth, type, content).then(res => getPoiInfo(res.latitude, res.longitude, getPoi)).catch(err => Promise.reject(err));

var Location = {
  setUserLocation: setUserLocation$1,
  getUserLocation: getUserLocation$1
};

/**
 * @copyright 2021-present, Tencent, Inc. All rights reserved.
 * @brief tms-runtime 的所有环境配置
 * 这里维护运行时需要关注的全部配置，注意此处是一个全量的配置字典，具体业务模块不应再对同一项配置，
 * 增加不同的字段和释义。
 *
 */

const DO_NOT_NEED_REPORT_SCENES = [1030, 1129]; // 出行首页地址

/**
 * 本文件负责对小程序调用wx同步方法的管理
 */
/**
 * 获取启动参数。同wx.getLaunchOptionsSync
 * @private
 */

let launchOptions = null; // 启动参数

/**
 * 获取小程序启动参数
 * @private
 * @returns {object} 小程序启动参数
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
}; // 进入小程序来源from的key配置
// tuhu渠道：如果链接上from=tuhuviolation，则为途虎渠道用户（不推荐）；
// 其他渠道：如果链接上trafficEntrence非空，则为特定渠道，具体来源可在运营平台查询（推荐）


const FROM_KEY_MAP = {
  tuhuviolation: 1500
};
/**
 * 获取用户打开小程序时的流量入口来源和场景值，小程序onLaunch和onShow时的参数相同
 * @private
 * @param {object} appShowOptions 小程序onShow时参数
 * @returns {object} { scene, trafficEntrence } scene: 场景值，trafficEntrence: 用户渠道标识
 */

const getOpenAppTrafficData = appShowOptions => {
  const spiderScene = -9999; // 如果是微信爬虫打开的小程序，则使用-9999给用户打标签

  let options = appShowOptions; // 未传递参数的情况下，获取小程序启动时参数作为打开小程序时的参数

  if (!options) {
    options = getLaunchOptionsSync() || {};
  }

  const {
    query = {},
    scene = 1001
  } = options; // 途虎渠道通过from字段来判断，如果from为tuhuviolation，则为途虎渠道

  const {
    from = ''
  } = query;
  const isTuhu = !!FROM_KEY_MAP[from];
  let trafficEntrence = 0;

  if (DO_NOT_NEED_REPORT_SCENES.includes(scene)) {
    trafficEntrence = spiderScene;
  } else {
    // 途虎渠道特殊判断
    trafficEntrence = isTuhu ? FROM_KEY_MAP[from] : Number(query.trafficEntrence || '') || 0;
  }

  return {
    scene,
    trafficEntrence
  };
};

/* eslint-disable valid-jsdoc */
const {
  createRequest,
  callCloudFunc
} = CoreObj;
/**
 * 调用wx.login获取登录code
 * @private
 */

const getCode = () => new Promise((resolve, reject) => {
  wx.login({
    success: ({
      code
    }) => resolve(code),
    fail: reject
  });
});

let loginProcessing = false; // 是否有进行中的登录流程

/**
 * login 方法 获取用户信息
 * @private
 * @return {object} userInfo
 */

const loginFn$1 = async () => {
  if (loginProcessing) return;
  loginProcessing = true;
  let userInfo = {};

  try {
    let userData = await login$1();

    if (userData.errCode === 10 || !userData.resData.userInfo || !userData.resData.userInfo.uid) {
      userData = await login$1();
    }

    if (userData.errCode === 0) {
      wx.setStorageSync('userInfo', userData.resData.userInfo);
      userInfo = userData.resData.userInfo;
    }

    loginProcessing = false;
  } catch (e) {
    loginProcessing = false;
  }

  return userInfo;
};
/**
 * 登录重试接口
 * @private
 * @returns { object } errCode 接口返回错误码
 * @returns { object } resData 用户信息
 */


async function login$1() {
  let userData = {};

  try {
    const code = await getCode();
    const {
      trafficEntrence: registerSource,
      scene: sceneId
    } = getOpenAppTrafficData();
    userData = await createRequest({
      withAuth: false
    }).post('user/login', {
      code,
      registerSource,
      sceneId
    });
  } catch (e) {
    console.error(e); // eslint-disable-line
  }

  return {
    errCode: userData.errCode,
    resData: userData.resData || {}
  };
}

let getOpenIdProm; // 获取用户在小程序中的openId状态

/**
 * @return {string} openId
 * 获取成功时，返回resolved Promise，resolved数据为openId
 * 获取失败时，返回rejected Promise，rejected数据为错误对象
 * @description 获取用户在小程序中的openId
 */

const getOpenId$1 = async () => {
  if (getOpenIdProm) {
    // 避免重复获取
    return getOpenIdProm;
  }

  getOpenIdProm = new Promise(async (resolve, reject) => {
    callCloudFunc('user', {
      $url: 'user/getOpenId'
    }).then(res => {
      var _res$result, _res$result$resData;

      const openId = res === null || res === void 0 ? void 0 : (_res$result = res.result) === null || _res$result === void 0 ? void 0 : (_res$result$resData = _res$result.resData) === null || _res$result$resData === void 0 ? void 0 : _res$result$resData.openId;

      if (openId) {
        resolve(openId);
      }

      getOpenIdProm = null;
      reject(new Error('No openId found in cloud function res'));
    }).catch(res => {
      getOpenIdProm = null;
      reject(res);
    });
  });
  return getOpenIdProm;
};
/**
 * 获取用户在指定公众号下的openId
 * @private
 * @return {Promise<String>}
 * 获取成功时，返回resolved Promise，resolved数据为用户在指定公众号下的openId
 * 获取失败时，返回rejected Promise，rejected数据为错误对象
 */


const getOaPubOpenId = oaName => createRequest({
  withAuth: true
}).post('user/getpubopenid', {
  oaName
}).then(res => {
  const {
    errCode,
    resData
  } = res;

  if (errCode !== 0) {
    return Promise.reject(res);
  }

  const {
    mycarPubOpenId,
    sinanPubOpenId
  } = resData;

  if (oaName === 'sinan') {
    return sinanPubOpenId || Promise.reject(new Error(`No sinanPubOpenId found in response ${JSON.stringify(res)}`));
  }

  return mycarPubOpenId || Promise.reject(new Error(`No mycarPubOpenId found in response ${JSON.stringify(res)}`));
});

let getSinanPubOpenIdProm;
let getMycarPubOpenIdProm;
/**
 * @description 获取用户在我的车公众号下的openId
 * @return {Promise<String>}
 * 获取成功时，返回resolved Promise，resolved数据为用户在我的车公众号下的openId
 * 获取失败时，返回rejected Promise，rejected数据为错误对象
 */

const getMycarPubOpenId$1 = () => {
  if (getMycarPubOpenIdProm) {
    // 避免重复获取
    return getMycarPubOpenIdProm;
  }

  getMycarPubOpenIdProm = getOaPubOpenId('mycar').then(openId => openId || Promise.reject(new Error('No mycarPubOpenId found'))).catch(e => {
    getMycarPubOpenIdProm = null;
    return Promise.reject(e);
  });
  return getMycarPubOpenIdProm;
};
/**
 * @description 获取用户在出行服务公众号下的openId
 * @return {Promise<String>}
 * 获取成功时，返回resolved Promise，resolved数据为用户在出行服务公众号下的openId
 * 获取失败时，返回rejected Promise，rejected数据为错误对象
 */


const getSinanPubOpenId$1 = () => {
  if (getSinanPubOpenIdProm) {
    // 避免重复获取
    return getSinanPubOpenIdProm;
  }

  getSinanPubOpenIdProm = getOaPubOpenId('sinan').then(openId => openId || Promise.reject(new Error('No sinanPubOpenId found'))).catch(e => {
    getSinanPubOpenIdProm = null;
    return Promise.reject(e);
  });
  return getSinanPubOpenIdProm;
};
/**
 * @public
 * @description 获取用户手机号
 * @return {Promise<String|Object>} 手机号
 * @example
 * getApp().tms.getPhone()
 *  .then((phone) => {
 *    // ...
 *  })
 *  .catch((e) => {
 *    // ...
 *  });
 */


const getPhone$1 = () => createRequest({
  withAuth: true
}).post('user/phone/fetch').then(res => {
  if (res && res.errCode === 0) {
    return res.resData && res.resData.phoneno || '';
  }

  return Promise.reject(res);
});

var Login = {
  loginFn: loginFn$1,
  getOpenId: getOpenId$1,
  getPhone: getPhone$1,
  getMycarPubOpenId: getMycarPubOpenId$1,
  getSinanPubOpenId: getSinanPubOpenId$1
};

const app = getApp({
  allowDefault: true
});
let carInfo = {}; // 当前车信息

let carList = []; // 缓存到的车列表信息

let getCarListProm = null;
/**
 * @class CarService
 * @classdesc 维护整个小程序逻辑中的当前车概念，提供当前车信息与获取车列表接口
 */

class CarService {
  /**
   * @memberof CarService
   * getCarInfo 方法 获取当前车信息
   * @returns {object} 车信息对象
   */
  static getCarInfo() {
    if (carInfo && carInfo.wecarId) {
      return carInfo;
    }

    carInfo = wx.getStorageSync('currentCar') || {};
    return carInfo;
  }
  /**
   * @memberof CarService
   * setCarInfo 方法 设置当前车信息,必传 param.wecarId
   * @param {object} param 要设置的当前车信息
   * @returns {void}
   */


  static setCarInfo(param = {}) {
    let info = { ...param
    };

    if (info.wecarId) {
      carList.some(item => {
        if (item.wecarId === info.wecarId) {
          info = { ...item,
            ...info
          };
          return true;
        }

        return false;
      });
    }

    carInfo = { ...info
    };
    wx.setStorageSync('currentCar', { ...carInfo
    });
  }
  /**
   * @memberof CarService
   * getCarList 方法 获取用户车列表数据
   * @returns {promise} 获取车列表的promise
   */


  static getCarList() {
    // 防止并发请求车列表
    if (getCarListProm) {
      return getCarListProm;
    }

    getCarListProm = new Promise(async (resolve, reject) => {
      app.tms.createRequest().post('user/carlist', {}).then(res => {
        getCarListProm = null;

        if (res.errCode === 0) {
          carList = res.resData.list.map(car => ({ ...car,
            register: car.vin !== '' && car.plate !== '' && car.engineNo !== '' && car.v2ModelName !== '' && car.v2BrandName !== ''
          }));
          carList.some(item => {
            if (item.wecarId === carInfo.wecarId) {
              carInfo = { ...item,
                ...carInfo
              };
              return true;
            }

            return false;
          });
          resolve(carList);
        } else {
          reject(res);
        }
      }).catch(res => {
        getCarListProm = null;
        reject(res);
      });
    });
    return getCarListProm;
  }

}

/* eslint no-underscore-dangle: 0 */
const {
  setUserLocation,
  getUserLocation
} = Location;
const {
  loginFn,
  getOpenId,
  getMycarPubOpenId,
  getSinanPubOpenId,
  getPhone
} = Login;
/**
 * __resolver__ 用于维护 app.tms.fn 中数据的填充
 * app.tms.fn 中的部分数据依赖初始化流程完成，属于异步获取，
 * __resolver__ 属于内部变量，不应在运行时初始化流程外部使用，不做导出。
 * @private
 */

const __resolver__ = {};
/**
 * tms.getLoginInfo 用于提供给业务模块获取当前运行时的登录信息
 * @private
 */

const loginInfoPromise = new Promise(resolver => __resolver__.getLoginInfo = resolver);
/**
 * @public
 * @description 获取用户userId等登录信息
 * @returns {Promise<UserInfo>} 返回用户登录信息
 * @returns {UserInfo.userId} 用户userId
 * @returns {UserInfo.token}  用户token
 * @returns {UserInfo.openId} 用户openId
 * @returns {UserInfo.firstLogin}  用户登录类型：0-非首次登录，1-首次登录
 * @example
 * getApp().tms.getLoginInfo().then((res) => {
 *   // res {Object} 返回数据
 *   // {
 *   //   userId {String} 用户userId
 *   //   token {String} 用户token
 *   //   openId {String} 用户openId
 *   //   firstLogin {Boolean} 是否首次登录
 *   // }
 * });
 */

const getLoginInfo = () => loginInfoPromise;
/**
 * tms.getCarManager 用户获取小程序统一维护的车信息管理器
 * @private
 * @returns {object} 车信息管理器
 */


const getCarManager = () => CarService;
/**
 * login方法用于完成小程序登录
 * @private
 * @returns {object} 登录成功后的用户信息
 * 返回数据示意
 * {
 *   userId: "1135608",
 *   token: "a209e79c667d8711ec7564c1bf86f327",
 *   firstLogin: 0,
 * },
 */


const login = async () => {
  const res = await loginFn();
  const loginInfo = { ...res,
    userId: res.uid
  };

  __resolver__.getLoginInfo(loginInfo);

  return loginInfo;
};

const api = {
  getPhone,
  login,
  getLoginInfo,
  getOpenId,
  getMycarPubOpenId,
  getSinanPubOpenId,
  getCarManager,
  setUserLocation,
  getUserLocation,
  getOpenAppTrafficData,

  /**
   * 对外暴露__resolver__变量，在主项目未完成迁移时，登录完成后，将登录态同步给tms-runtime
   * 注意这并不是架构升级的最终态，在完成主项目的迁移后，我们将不在对外暴露__resolver__
   * @private
   */
  __resolver__
};

export default api;
