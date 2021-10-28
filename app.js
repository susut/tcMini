import core from '@tmsfe/tms-core';
import runtime from '@tmsfe/tms-runtime';

// 小程序连接服务环境配置
const APP_ENV = {
  PROD: 'production',      // 线上环境
  TEST: 'test',            // 测试环境
  DEV: 'development',      // 开发环境
  PRE: 'predist',          // 灰度(预发布)环境
};
// 服务端域名
const SERVER_HOST = {
  [APP_ENV.PROD]: 'tim.map.qq.com',               // 出行服务正式环境域名
  [APP_ENV.TEST]: 'tim.sparta.html5.qq.com', // 出行服务测试环境域名
  [APP_ENV.DEV]: 'tim.sparta.html5.qq.com/dev',   // 出行服务开发环境域名
  [APP_ENV.PRE]: 'tim.sparta.html5.qq.com/pre',   // 出行服务灰度环境域名
};

// 小程序appid配置
const APP_ID = {
  MOBILITY: 'wx3c7ffb8a6ffcf946',        // 出行服务小程序AppId
  MOBILITY_DEMO: 'wxa7ce727b525f80b0',   // 出行服务demo小程序AppId
};

// 小程序云开发环境配置
const CLOUD_ENV_ID = {
  // 出行服务小程序
  [APP_ID.MOBILITY]: {
    [APP_ENV.PROD]: 'release-tim',
    [APP_ENV.TEST]: 'test-tim',
    [APP_ENV.DEV]: 'test-tim',
    [APP_ENV.PRE]: 'test-tim',
  },
};
// wx.getAccountInfoSync接口调用失败时作为默认数据
const AccountInfo = {
  miniProgram: {
    appId: '',
    version: DEFAULT_VERSION, // 接口调用失败 | 低版本时使用该版本号
  },
};
const {
  miniProgram: {
    version = DEFAULT_VERSION,
    appId: wxAppId,
  },
} = core.getAccountInfoSync() || AccountInfo;

const DEFAULT_VERSION = '2021.10.0';
const client = 'sinan';
// 当前小程序对应的环境
const appEnv = APP_ENV.TEST;

core.init({
  appVersion: version || DEFAULT_VERSION,
  wxAppId,
  client,
  appEnv,
  cloudEnvId: CLOUD_ENV_ID[wxAppId][appEnv],
  defaultHost: SERVER_HOST[appEnv],
});

runtime.login()
  .then(loginInfo => core.setAuthInfo(loginInfo))
  .catch((err) => {
    core.setAuthInfo({}, err);
    // 统一处理登录失败
  });

/**
 * 在 runtime 中直接写入框架的全局变量，在小程序运行环境中，即 app.tms
 * 这里不考虑在 runtime 外部写入全局变量的原因是
 * 1. 全局变量的命名(app.tms),应由框架决定，具体小程序不必关心，只需要使用即可；
 * 2. 后续tms-core、tms-cli中会使用此全局变量，其命名必须确定，不应在外部确定；
 */
const app = getApp({ allowDefault: true });

/**
 * 初始化tms对象，tms提供基于tms运行时的核心信息，包括
 * env 当前运行时的环境信息，
 * 在运行时初始化过程结束时，冻结app.tms
 *
 * 注意： app.tms对象中所维护的是整个运行时关注的基础信息，不维护具体业务状态。
 * app.tms 中提供的方法，是在 tms 初始化时，由框架获取的信息。非 tms 初始化时
 * 获取的信息，不应在此增加全局方法获取，这一点可以作为 tms 是否扩展新方法的判断标准。
 */
app.tms = {
  ...core,
  ...runtime,
};

/**
 * 子模块使用同构框架开发时,通过 getApp 获取到的全局 app,可能并不是主包的 app 对象
 * 为了支持这类子包获取 tms 框架能力, 将 tms 挂载到全局 wx 对象下
 * 注意: 将 tms 挂载到 wx 下, 并不是一种合理的方式, 后续应继续探索合理的全局框架api暴露形式
 */
wx.tms = app.tms;

App({});
