
/**
 * @copyright 2020-present, Tencent, Inc. All rights reserved.
 * @author Davislu <davislu@tencent.com>
 * @brief TMSBridge for plugin work on tengxunchuxing mp.
 *
 */

const webviewPath = 'SINAN-WEBVIEW-PATH';
const addressPath = 'SINAN-ADDRESS-PATH';
const passengerPath = 'SINAN-PASSENGER-PATH';
/**
 * DEFN 空方法
 * @returns {undefined} 无返回值
 */
const DEFN = () => {};

/**
* TMSBridge 类
* @constructor
* @param {object} setting 初始化配置
* @param {boolean} setting.component 要服务的插件是否导出为组件方式
*/
export default class TMSBridge {
  wxc = wx
  component = false // 是否为组件方式
  static navPageMap = new Map() // 页面跳转设置

  /**
  * constructor 初始化构造方法
  * @param {object} setting 配置信息
  * @param {string} setting.component 是否为组件方式
  * @returns {undefined} 无返回值
  */
  constructor(setting = {}) {
    const { component } = setting;
    this.component = !!component;
    TMSBridge.navPageMap
      .set(webviewPath, '/modules/x/webcontainer/webcontainer')
      .set(addressPath, '/modules/base/pages/addr/addr')
      .set(passengerPath, '/modules/me/pages/contacts/contacts');
  }

  /**
  * bind 方法
  * @param {object} wxc 需要执行方法的 wx 调用域
  * @returns {object} 当前链式调用
  */
  bind(wxc = wx) {
    this.wxc = wxc;
    return this;
  }

  /**
  * scope 方法
  * @param {boolean} fpsc 是否强制使用插件页面wx作用域
  * @returns {object} 当前wx 调用域
  */
  scope(fpsc) {
    return this.component && !fpsc ? wx : this.wxc;
  }

  /**
  * getAppId 方法 获取 appId
  * @param {string} tp 用于区分返回小程序 appId 还是插件 appId
  * @returns {string} 小程序或插件的 appId
  */
  getAppId(tp = 'miniProgram') {
    const acc = this.wxc.getAccountInfoSync();
    return acc[tp] || {};
  }

  /**
  * navigateToMP 方法 从插件中跳转到小程序的指定页面
  * @param {object} setting 配置信息
  * @param {string} setting.page 需要跳转页面的名称
  * @param {string} setting.query 需要跳转页面的参数
  * @param {boolean} setting.fpsc 是否强制使用插件页面wx作用域
  * @param {function} setting.complete 跳转成功后的回调函数
  * @param {function} setting.message 用于页面的回传数据
  * @returns {undefined} 无返回值
  */
  navigateToMP(setting) {
    const { page: pageName, query, fpsc, message = DEFN, complete = DEFN } = setting;
    let page = TMSBridge.navPageMap.get(pageName);
    page = page.replace(/\$\{(\w+)\}/g, (mstr, key) => {
      if (setting[key]) return setting[key];
      return mstr;
    });
    const url = `${page}${/\?/.test(page) ? '&' : '?'}${query}`;
    const navSetting = { url, complete };
    navSetting.events = { onMessage: message };
    this.scope(fpsc).navigateTo(navSetting);
  }

  /**
  * navigateToWebview 方法 从插件中跳转到小程序的 web-view 容器打开 H5
  * @param {object} setting 配置信息
  * @param {boolean} setting.fpsc 是否强制使用插件页面wx作用域
  * @param {string} setting.url 需要跳转的 H5 连接
  * @param {function} setting.complete 跳转成功后的回调函数
  * @param {function} setting.message 用于获取 H5 中的 postMessage 的数据
  * @returns {undefined} 无返回值
  */
  navigateToWebview({ fpsc, url: webUrl, complete = DEFN, message: cb }) {
    const url = encodeURIComponent(webUrl);
    const routerPath = TMSBridge.navPageMap.get(webviewPath);
    this.scope(fpsc).navigateTo({
      url: `${routerPath}?disableShare=true&url=${url}`,
      complete,
      events: {
        onMessage: (res) => {
          typeof cb === 'function' && cb(res);
        },
      },
    });
  }

  /**
  * navigateToPlugin 方法 从插件中跳转到小程序中的另一个插件
  * @param {object} setting 配置信息
  * @param {string} setting.appId 需要跳转的插件 appId
  * @param {string} setting.url 需要跳转的插件路径和参数
  * @param {boolean} setting.fpsc 是否强制使用插件页面wx作用域
  * @param {string} setting.moduleName 需要跳转的插件标识（即将废弃）
  * @param {function} setting.complete 跳转成功后的回调函数
  * @returns {undefined} 无返回值
  */
  navigateToPlugin(setting) {
    const { appId, url, fpsc, moduleName, complete = DEFN } = setting;
    const name = appId || moduleName;
    let page = TMSBridge.navPageMap.get(name);
    page = page.replace(/\$\{(\w+)\}/g, (mstr, key) => {
      if (setting[key]) return setting[key];
      return mstr;
    });
    this.scope(fpsc).navigateTo({
      complete,
      url: `${page}${/\?/.test(page) ? '&' : '?'}name=${name}&path=${encodeURIComponent(url)}`,
    });
  }

  /**
  * chooseAddress 方法 从小程序中获取收获地址
  * @param {function} setting.complete 选择地址后，返回时获取数据
  * @returns {undefined} 无返回值
  */
  chooseAddress({ complete = DEFN }) {
    const { appId } = this.getAppId('plugin');
    this.scope().navigateTo({
      url: `${TMSBridge.navPageMap.get(addressPath)}?from=${appId}`,
      events: {
        onAddressSelected: (address) => {
          complete(address);
        },
      },
    });
  }

  /**
  * choosePassenger 方法 从插件中选择出行人信息
  * @param {object} setting 配置信息
  * @param {string} setting.picktype 选择方式：选择单个人 single， 选择多个人 multiple
  * @param {function} setting.complete 选择出行人信息后，返回时获取数据
  * @returns {undefined} 无返回值
  */
  choosePassenger({ picktype = 'single', complete = DEFN }) {
    const { appId } = this.getAppId('plugin');
    this.scope().navigateTo({
      url: `${TMSBridge.navPageMap.get(passengerPath)}?from=${appId}&picktype=${picktype}`,
      events: {
        onPassengerSelected: (data) => {
          complete(data); // { list: [] }
        },
      },
    });
  }
}
