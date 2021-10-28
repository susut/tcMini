const env = {
  wxAppId: '',
  // 当前运行时小程序的appId
  appVersion: '',
  // 当前运行时所在项目的版本号
  appEnv: '',
  // 运行环境 test - 测试、production - 正式
  client: '' // 运行时项目名，sinan - 腾讯出行服务； mycar - 我的车小程序

};
let baseAuthInfo = undefined;
const getAuthInfoQueue = [];
/**
 * @description 设置用户信息
 * @param {Object} authInfo 用户信息
 * @param {Object} err err
 * @returns {Void} 无返回值
 */

const setAuthInfo = (authInfo, err) => {
  baseAuthInfo = authInfo;

  while (getAuthInfoQueue.length) {
    const pro = getAuthInfoQueue.shift();

    if (err) {
      pro.reject(err);
    } else {
      pro.resolve(baseAuthInfo);
    }
  }
};
/**
 * 获取登录状态信息
 * @returns {Object} 当前用户状态参数
 */

const getAuthInfo = async () => {
  if (baseAuthInfo !== undefined) {
    return baseAuthInfo;
  }

  return new Promise((resolve, reject) => getAuthInfoQueue.push({
    resolve,
    reject
  }));
};
/**
 * tms.getEnvInfo 用于获取运行时所在的环境信息
 * @returns {object} 运行时环境信息.
 */

const getEnvInfo = () => env;
/**
 * 设置环境变量
 * @param {object} envInfo 环境变量
 * @returns {undefined} 无.
 */

const setEnvInfo = envInfo => {
  const {
    wxAppId,
    appVersion,
    appEnv,
    client
  } = envInfo;
  env.wxAppId = wxAppId;
  env.appVersion = appVersion;
  env.appEnv = appEnv;
  env.client = client;
};
let appPagePaths = []; // app页面路径集合
/**
 * 设置app内所有页面的路径
 * @param {Array<String>} paths 页面路径集合
 * @returns {void}
 */

const setAppPagePaths = paths => appPagePaths = paths;
/**
 * 判断页面是否存在于当前app中
 * @param {String} page 页面路径
 * @returns {Boolean} 页面是否存在app中
 */

const isAppPageExist = page => {
  const route = !page ? '' : String(page).split('?')[0];
  if (!route || !Array.isArray(appPagePaths)) return false;
  const routeWithoutPrefixSlash = route[0] === '/' ? route.substring(1) : route;
  return appPagePaths.some(path => path === routeWithoutPrefixSlash || path === `/${routeWithoutPrefixSlash}`);
};

export { getAuthInfo as a, setEnvInfo as b, setAppPagePaths as c, getEnvInfo as g, isAppPageExist as i, setAuthInfo as s };
