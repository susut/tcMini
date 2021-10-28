let systemInfo = null;

/**
 * 获取系统信息，有缓存
 * 返回数据同wx.getSystemInfoSync
 * @returns {Object} 系统信息
 */
const getSystemInfoSync = () => {
  if (systemInfo) return systemInfo;
  let res;
  try {
    systemInfo = wx.getSystemInfoSync();
    res = systemInfo;
  } catch (_) {
    res = {};
  }
  return res;
};

/**
 * 获取系统信息
 * @returns {Object} 系统信息
 */
const getSysInfo = () => {
  let sysInfo = {};

  try {
    sysInfo = getSystemInfoSync();
    sysInfo.getSystemInfoSuccess = true;
  } catch (e) {
    // 获取系统信息失败时，使用默认数据
    sysInfo = { getSystemInfoSuccess: false, statusBarHeight: 0, windowWidth: 0 };
  }

  return sysInfo;
};

/**
 * 获取胶囊位置信息
 * @returns {Object} 胶囊位置信息
 */
const getMenuButtonRectInfo = () => {
  let menuButtonRectInfo = {};

  try {
    menuButtonRectInfo = wx.getMenuButtonBoundingClientRect();
    menuButtonRectInfo.getMenuRectInfoSuccess = true;
  } catch (e) {
    // 获取胶囊位置信息失败，使用默认值
    menuButtonRectInfo = { getMenuRectInfoSuccess: false };
  }

  return menuButtonRectInfo;
};

/**
 * 版本比较函数
 * @param {String} sourceVersion 作为基准版本号
 * @param {String} targetVersion 目标比较版本号
 * @returns {Number} 比较结果
 * 返回值说明：
 * 1 : 大于基准版本号
 * 0 : 等于基准版本号
 * -1: 小于基准版本号
 */
const compareVersion = (sourceVersion, targetVersion) => {
  if (typeof sourceVersion !== 'string' || typeof targetVersion !== 'string') {
    throw new Error('版本比较参数类型有误');
  }

  const toInt = n => parseInt(n, 10); // eslint-disable-line require-jsdoc
  const sourceArray = sourceVersion.split('.').map(toInt);
  const targetArray = targetVersion.split('.').map(toInt);

  for (let i = 0; i < sourceArray.length; i += 1) {
    if (sourceArray[i] > targetArray[i]) {
      return 1;
    } if (sourceArray[i] < targetArray[i]) {
      return -1;
    }
  }

  return 0;
};

/**
 * 胶囊高度适配，以兼容获取到的胶囊高度值非法的情况
 * @param {Number} height 胶囊高度
 * @param {Boolean} isIOS 是否是ios系统
 * @returns {Number} 胶囊高度
 */
const formatMenuHeight = (height, isIOS) => {
  if (height > 0) {
    return height;
  }

  return isIOS ? 32 : 34;
};

/**
 * 计算自定义导航栏布局信息
 * @param {Boolean} isIOS          是否是ios平台
 * @param {Number} windowWidth     窗口宽度
 * @param {Number} statusBarHeight 状态栏高度
 * @returns {Object}               导航栏布局信息
 */
const calculateNavBarLayout = (isIOS, windowWidth, statusBarHeight) => {
  const data = {};
  const MenuHeight = 32; // 胶囊高度
  const MenuTopOnIos = 48;
  const MenuTopOnAndroid = 32;
  const menuRectInfo = getMenuButtonRectInfo();
  let { right, width, height = 0, top, bottom = 0 } = menuRectInfo;
  // 数据有异常时使用默认值
  if (bottom <= 0) {
    bottom = MenuHeight + isIOS ? MenuTopOnIos : MenuTopOnAndroid;
  }
  if (top <= 0) {
    top = isIOS ? MenuTopOnIos : MenuTopOnAndroid;
  }
  if (right <= 0) {
    right = isIOS ? 368 : 383;
  }
  if (width < 0) {
    width = isIOS ? 87 : 94;
  }
  height = formatMenuHeight(height, isIOS);

  const ratio = (750 / windowWidth);
  data.statusBarHeight = statusBarHeight * ratio; // 顶部状态栏高度
  data.navBarHeight = (bottom + 8 - statusBarHeight) * ratio; // 小程序导航栏高度
  data.menuTop = top * ratio; // 菜单按钮上边距
  data.menuRight = right * ratio; // 菜单按钮右边距离屏幕左边缘的距离
  data.menuWidth = width * ratio; // 菜单按钮宽度
  data.menuHeight = height; // 菜单按钮宽度
  data.showBackBtn = false;

  return data;
};

const getNavBarConfigData = () => { // eslint-disable-line require-jsdoc
  const data = { enable: false };
  const systemInfo = getSysInfo();
  const { brand, getSystemInfoSuccess, platform } = systemInfo;
  const isIOS = platform === 'ios';
  const StatusBarHeightOnIOS = 44;
  const StatusBarHeightOnAndroid = 24;
  const WW = 414; // 默认屏幕宽度
  let { statusBarHeight, windowWidth, version } = systemInfo;
  // 获取系统信息失败，给设置一个默认版本
  if (!getSystemInfoSuccess || !version) {
    version = '7.0.1';
  }
  // 获取状态栏高度失败 | 接口调用成功，但数据为0时，使用默认值
  if (!getSystemInfoSuccess || (getSystemInfoSuccess && statusBarHeight <= 0)) {
    statusBarHeight = isIOS ? StatusBarHeightOnIOS : StatusBarHeightOnAndroid;
    windowWidth = windowWidth || WW;
  }

  data.enable = compareVersion(version, '7.0.0') >= 0 || brand === 'devtools'; // 微信版本是否支持自定义顶栏，不支持时自动隐藏

  if (data.enable) {
    return { ...data, ...calculateNavBarLayout(isIOS, windowWidth, statusBarHeight) };
  }

  return data;
};

let mpAppId = '';

/**
 * 获取appId
 * @returns {String} appId
 */
const getAppId = () => {
  if (mpAppId) return mpAppId;
  try {
    const info = wx.getAccountInfoSync();
    mpAppId = info?.miniProgram?.appId;
  } catch (_) {}
  return mpAppId;
};

// 以下变量标识各小程序appId
const MOBILITY_APPID = 'wx65cc950f42e8fff1';      // 出行服务小程序AppId
const MOBILITY_DEMO_APPID = 'wxa7ce727b525f80b0'; // 出行服务demo小程序AppId
const SINAN_HOME = '/modules/index/carlife/pages/index/index'; // 出行首页地址
const MYCAR_HOME = '/modules/car/index/index'; // 我的车首页地址
let homePath = '';

/**
 * 获取首页路径
 * @returns {String} 首页路径
 */
const getHomePath = () => {
  if (homePath) return homePath;
  const appId = getAppId();
  if ([MOBILITY_APPID, MOBILITY_DEMO_APPID].indexOf(appId) > -1) {
    homePath = SINAN_HOME;
  } else {
    homePath = MYCAR_HOME;
  }
  return homePath;
};

export {
  getNavBarConfigData,
  getHomePath,
};
