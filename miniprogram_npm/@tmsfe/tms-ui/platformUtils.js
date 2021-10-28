let systemInfo = null; // 系统信息
const getSystemInfo = () => { // eslint-disable-line require-jsdoc
  if (systemInfo) return systemInfo;
  systemInfo = wx.getSystemInfoSync();
  return systemInfo;
};

let accountInfo = null;
const getAccountInfo = () => { // eslint-disable-line require-jsdoc
  if (accountInfo) return accountInfo;
  accountInfo = wx.getAccountInfoSync();
  return accountInfo;
};

let appId = '';
const getAppId = () => { // eslint-disable-line require-jsdoc
  if (appId) return appId;
  appId = getAccountInfo()?.miniProgram?.appId;
  return appId;
};

let deviceClass = '';
const getDeviceClass = () => { // eslint-disable-line require-jsdoc
  if (deviceClass) return deviceClass;
  const deviceClasses = [];
  const sysInfo = getSystemInfo();
  const model = sysInfo?.model;
  const modelStr = typeof model === 'string' ? model.toLocaleLowerCase() : String(model).toLocaleLowerCase();
  if (modelStr.search('iphone') !== -1) {
    deviceClasses.push('ios');
    const isIPhoneXDevice = modelStr.search('iphone x') !== -1 || modelStr.search('iphone 11') !== -1 || /unknown.*iphone/.test(modelStr);
    if (isIPhoneXDevice) {
      deviceClasses.push('ipx');
    }
    if (/max/.test(modelStr)) {
      deviceClasses.push('max');
    }
  }
  deviceClass = deviceClasses.join(' ');
  return deviceClass;
};

const isIPX = () => getDeviceClass().indexOf('ipx') !== -1; // eslint-disable-line require-jsdoc

const isSinan = () => getAppId() === 'wx65cc950f42e8fff1'; // eslint-disable-line require-jsdoc

export default {
  getAppId,
  getDeviceClass,
  getSystemInfo,
  isIPX,
  isSinan,
};
