import { a as getAuthInfo, g as getEnvInfo } from './env-612e2703.js';

/**
 * @copyright 2017-present, Tencent, Inc. All rights reserved.
 * @author Davis.Lu <davislu@tencent.com>
 *
 * @file crypto tools.
 *
**/

/**
 * @public
 * @description  基于md5算法对源字符串进行hash，生成hash字符串
 * @param {String} str 源字符串
 * @returns {String} 源字符串的md5 hash值
 */
const md5 = function (str) {
  /**
   * 将unicode编码成utf-8
   * @private
   * @param {string} encoedStr unicode字符
   * @returns {string} utf8格式的字符串
   */
  const encodeUtf8 = encoedStr => {
    const string = encoedStr.replace(/\r\n/g, '\n');
    /**
     * @private
     * @param {string} c unicode字符
     * @returns {string} 字符串
     */

    const charCode = c => String.fromCharCode(c);

    const utftextArr = [];

    for (let n = 0; n < string.length; n += 1) {
      let c = string.charCodeAt(n);

      if (c < 128) {
        utftextArr.push(charCode(c));
      } else if (c < 2048) {
        utftextArr.push(charCode(c >> 6 | 192), charCode(c & 63 | 128));
      } else if (c < 55296 || c >= 57344) {
        utftextArr.push(charCode(c >> 12 | 224), charCode(c >> 6 & 63 | 128), charCode(c & 63 | 128));
      } else {
        c = 65536 + ((c & 1023) << 10 | string.charCodeAt(n += 1) & 1023);
        utftextArr.push(charCode(c >> 18 | 240), charCode(c >> 12 & 63 | 128), charCode(c >> 6 & 63 | 128), charCode(c & 63 | 128));
      }
    }

    return utftextArr.join('');
  };
  /**
   * @private
   * @param {string} string 字符串
   * @returns {array} 字符串分组
   */


  const convertToWordArray = string => {
    const msgLen = string.length;
    const lNumberOfWords = ((msgLen + 8 - (msgLen + 8) % 64) / 64 + 1) * 16;
    const lWordArray = Array(lNumberOfWords - 1);
    let lByteCount = 0;

    while (lByteCount <= msgLen) {
      const wordCount = (lByteCount - lByteCount % 4) / 4;
      const lBytePosition = lByteCount % 4 * 8;
      const byteWord = lByteCount === msgLen ? 0x80 : string.charCodeAt(lByteCount);
      lWordArray[wordCount] |= byteWord << lBytePosition;
      lByteCount += 1;
    }

    lWordArray[lNumberOfWords - 2] = msgLen << 3;
    lWordArray[lNumberOfWords - 1] = msgLen >>> 29;
    return lWordArray;
  };
  /**
   * @private
   * @param {string} lValue 字符串
   * @param {number} iShiftBits 移动位数
   * @returns {string} 字符串
   */


  const rotateLeft = (lValue, iShiftBits) => lValue << iShiftBits | lValue >>> 32 - iShiftBits;
  /**
   * @private
   * @param {string} lX 字符串
   * @param {string} lY 字符串
   * @returns {string} 字符串
   */


  const addUnsigned = (lX, lY) => {
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (!(lX4 | lY4)) return lResult ^ lX8 ^ lY8;
    return lResult & 0x40000000 ? lResult ^ 0xC0000000 ^ lX8 ^ lY8 : lResult ^ 0x40000000 ^ lX8 ^ lY8;
  };
  /**
   * @private
   * @param {object} recycleData 对象
   * @returns {string} 字符串
   */


  const addRecycling = recycleData => {
    const {
      FN,
      a,
      b,
      c,
      d,
      x,
      s,
      ac
    } = recycleData;
    const aa = addUnsigned(a, addUnsigned(addUnsigned(FN(b, c, d), x), ac));
    return addUnsigned(rotateLeft(aa, s), b);
  };
  /**
   * @private
   * @param {string} lValue 字符串
   * @returns {string} 字符串
   */


  const wordToHex = lValue => {
    let WordToHexValue = '';

    for (let lCount = 0; lCount <= 3; lCount += 1) {
      const lByte = lValue >>> lCount * 8 & 255;
      const WordToHexValueTemp = `0${lByte.toString(16)}`;
      WordToHexValue += WordToHexValueTemp.substr(WordToHexValueTemp.length - 2, 2);
    }

    return WordToHexValue;
  };

  let [a, b, c, d] = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476];
  const sArr = [[7, 12, 17, 22], [5, 9, 14, 20], [4, 11, 16, 23], [6, 10, 15, 21]];
  const kiArr = '16b05af49e38d27c58be147ad0369cf207e5c3a18f6d4b29'.split('').map(n => parseInt(n, 16));
  const hxArr = [0xD76AA478, 0xE8C7B756, 0x242070DB, 0xC1BDCEEE, 0xF57C0FAF, 0x4787C62A, 0xA8304613, 0xFD469501, 0x698098D8, 0x8B44F7AF, 0xFFFF5BB1, 0x895CD7BE, 0x6B901122, 0xFD987193, 0xA679438E, 0x49B40821, 0xF61E2562, 0xC040B340, 0x265E5A51, 0xE9B6C7AA, 0xD62F105D, 0x2441453, 0xD8A1E681, 0xE7D3FBC8, 0x21E1CDE6, 0xC33707D6, 0xF4D50D87, 0x455A14ED, 0xA9E3E905, 0xFCEFA3F8, 0x676F02D9, 0x8D2A4C8A, 0xFFFA3942, 0x8771F681, 0x6D9D6122, 0xFDE5380C, 0xA4BEEA44, 0x4BDECFA9, 0xF6BB4B60, 0xBEBFBC70, 0x289B7EC6, 0xEAA127FA, 0xD4EF3085, 0x4881D05, 0xD9D4D039, 0xE6DB99E5, 0x1FA27CF8, 0xC4AC5665, 0xF4292244, 0x432AFF97, 0xAB9423A7, 0xFC93A039, 0x655B59C3, 0x8F0CCC92, 0xFFEFF47D, 0x85845DD1, 0x6FA87E4F, 0xFE2CE6E0, 0xA3014314, 0x4E0811A1, 0xF7537E82, 0xBD3AF235, 0x2AD7D2BB, 0xEB86D391]; // eslint-disable-next-line require-jsdoc

  const cyc = (i, r = 0) => (i + r) % 4; // 4组处理位操作函数
  // eslint-disable-next-line require-jsdoc


  const md5F = (x, y, z) => x & y | ~x & z; // eslint-disable-next-line require-jsdoc


  const md5G = (x, y, z) => x & z | y & ~z; // eslint-disable-next-line require-jsdoc


  const md5H = (x, y, z) => x ^ y ^ z; // eslint-disable-next-line require-jsdoc


  const md5I = (x, y, z) => y ^ (x | ~z);

  const string = encodeUtf8(str);
  const x = convertToWordArray(string);

  for (let k = 0; k < x.length; k += 16) {
    const AA = a;
    const BB = b;
    const CC = c;
    const DD = d;
    const arr = [a, d, c, b];
    hxArr.forEach((hx, m) => {
      const i = m % 16;
      const g = m / 16 << 0;
      const ki = m < 16 ? m : kiArr[m - 16];
      const FN = [md5F, md5G, md5H, md5I][g];
      arr[cyc(i)] = addRecycling({
        FN,
        a: arr[cyc(i)],
        b: arr[cyc(i, 3)],
        c: arr[cyc(i, 2)],
        d: arr[cyc(i, 1)],
        x: x[k + ki],
        s: sArr[g][i % 4],
        ac: hx
      });
    });
    a = addUnsigned(arr[0], AA);
    b = addUnsigned(arr[3], BB);
    c = addUnsigned(arr[2], CC);
    d = addUnsigned(arr[1], DD);
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
};

/**
 * 本文件主要负责在小程序中日志打印功能，包含本地日志及实时日志. 主要做了两件事:
 * 1、参数序列化处理；支持传递任意多个参数，并对类型为对象的参数进行字符串序列化处理(避免打印出来是'[Object Object]'的格式)；
 * 2、低版本兼容；
 */
// 低版本不支持getLogManager或者getRealtimeLogManager时，用ManagerForLowerVersionLib来兼容
const ManagerForLowerVersionLib = {
  debug: () => {},
  info: () => {},
  log: () => {},
  warn: () => {},
  error: () => {},
  addFilterMsg: () => {},
  setFilterMsg: () => {}
};
const LogManager = wx.getLogManager ? wx.getLogManager() : ManagerForLowerVersionLib; // 小程序基础库2.7.1版本以上支持，所以需要兼容性处理

const RTLogManager = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : ManagerForLowerVersionLib;
/**
 * 参数中有对象类型的，将其转换为字符串类型，以便查看
 * @param {Array<Any>} params 需要格式化的数据
 * @returns {Array<String>} 字符串序列化后的数据
 */

const format = params => params.map(param => typeof param === 'string' ? param : JSON.stringify(param));
/**
 * @namespace LOG
 * @description 普通日志管理器，将日志记录在小程序日志文件中，用户上传后，可以在小程序后台-反馈管理中看到
 */


const LOG = {
  /**
   * @description 写debug日志
   * @param  {...Any} params 需要打印的数据，支持任意多个
   * @returns {Void} 无返回值
   */
  debug(...params) {
    LogManager.debug(...format(params));
  },

  /**
   * @description 写info日志
   * @param  {...Any} params 需要打印的数据，支持任意多个
   * @returns {Void} 无返回值
   */
  info(...params) {
    LogManager.info(...format(params));
  },

  /**
   * @description 写log日志
   * @param  {...Any} params 需要打印的数据，支持任意多个
   * @returns {Void} 无返回值
   */
  log(...params) {
    LogManager.log(...format(params));
  },

  /**
   * @description 写warn日志
   * @param  {...Any} params 需要打印的数据，支持任意多个
   * @returns {Void} 无返回值
   */
  warn(...params) {
    LogManager.warn(...format(params));
  },

  /**
   * @description 写warn日志. LogManager并没有error方法，为了兼容旧代码，所以声明一个error方法
   * @param  {...Any} params 需要打印的数据，支持任意多个
   * @returns {Void} 无返回值
   */
  error(...params) {
    LOG.warn(...params);
  }

};
/**
 * @namespace RTLOG
 * @description 实时日志，将日志实时上传至小程序后台-开发-运维中心-实时日志，方便快速排查漏洞，定位问题
 */

const RTLOG = {
  /**
   * @description 写info日志
   * @param  {...Any} params 需要打印的数据，支持任意多个
   * @returns {Void} 无返回值
   */
  info(...params) {
    RTLogManager.info(...format(params));
  },

  /**
   * @description 写warn日志
   * @param  {...Any} params 需要打印的数据，支持任意多个
   * @returns {Void} 无返回值
   */
  warn(...params) {
    RTLogManager.warn(...format(params));
  },

  /**
   * @description 写error日志
   * @param  {...Any} params 需要打印的数据，支持任意多个
   * @returns {Void} 无返回值
   */
  error(...params) {
    RTLogManager.error(...format(params));
  },

  /**
   * @description 添加过滤关键字
   * @param {String} msg 关键字
   * @returns {Void} 无返回值
   */
  addFilterMsg(msg) {
    RTLogManager.addFilterMsg(msg);
  },

  /**
   * @description 设置过滤关键字
   * @param {String} msg 关键字
   * @returns {Void} 无返回值
   */
  setFilterMsg(msg) {
    RTLogManager.setFilterMsg(msg);
  }

};
/**
 * @description 获取日志管理器对象，该对象提供的方法同wx.getLogManager()提供的方法，详见微信文档
 * @returns {Object} [LOG](#namespace-log)
 * @example
 * const logger = getLogManager();
 * logger.log(1, 'str', { a: 1 }, ...);
 * logger.info(1, 'str', { a: 1 }, ...);
 * logger.debug(1, 'str', { a: 1 }, ...);
 * logger.awrn(1, 'str', { a: 1 }, ...);
 */

const getLogManager = () => LOG;
/**
 * @description 获取实时日志管理器对象，该对象提供的方法同wx.getRealtimeLogManager()提供的方法，详见微信文档
 * @returns {Object} [RTLOG](#namespace-rtlog)
 * @example
 * const logger = getRealtimeLogManager();
 * logger.info(1, 'str', { a: 1 }, ...);
 * logger.warn(1, 'str', { a: 1 }, ...);
 * logger.error(1, 'str', { a: 1 }, ...);
 */


const getRealtimeLogManager = () => RTLOG;

/**
 * @copyright 2021-present, Tencent, Inc. All rights reserved.
 * @brief request.js用于发起网络请求.
 * request模块作为基于 tms-core & tms-runtime 的应用的公共请求模块。
 * 目前支持在出行服务小程序或基于出行服务的小程序中调用。在后续tms-runtime支持公众号H5后，
 * 将支持在H5中调用。
 *
 * 考虑到对不同运行环境的支持，强依赖运行环境的依赖，比如 wx.request，应通过注入的形式提供。
 * 框架判断在不同的运行环境，切换调用不同运行环境提供的方法。
 */
/**
 * 用于序列化需要签名的参数
 * @private
 * @param {object} param 需要序列化的参数
 * @returns {string} 序列化之后的参数字符串
 */

const seriesParam = param => {
  const keys = Object.keys(param).filter(key => typeof param[key] !== 'undefined').sort();
  const series = keys.map(key => {
    const val = param[key];
    return `${key}${typeof val === 'object' ? JSON.stringify(val) : val}`;
  });
  return series.join('');
};
/**
 * 用于对request请求对象做签名
 * @private
 * @param {object} param 需要做签名的参数
 * @returns {object} 签名后的参数对象
 */


const sign = (param = {}) => {
  const token = '';
  const signture = md5(seriesParam(param) + token);
  return { ...param,
    sign: signture
  };
};
/**
 * 用于对request请求对象添加系统参数
 * @private
 * @param {object} param 接口调用传入的参数
 * @param {Boolean} withAuth 是否需要登录参数
 * @param {object} baseParam request实例定义的基础参数
 * @returns {object} 全部参数对象
 */


const composeParam = async (param = {}, withAuth = true, baseParam = {}) => {
  const version = '1.0';
  const {
    appVersion,
    wxAppId,
    client
  } = getEnvInfo();
  const nonce = Math.random().toString(36).substr(2, 10);
  const timestamp = Date.now();
  const random = Math.random().toString().slice(2, 7);
  const sourceId = ['', 'sinan', 'mycar'].indexOf(client) + 7; // 6 未知 7 云函数 8 出行 9 我的车

  const seqId = `${timestamp}${sourceId}${random}`;
  const paramsWithAuth = await modifyAuthParam(param, withAuth);
  const combinedParam = Object.assign({
    version,
    appVersion,
    nonce,
    timestamp,
    seqId,
    wxAppId
  }, { ...baseParam
  }, { ...paramsWithAuth
  });
  return combinedParam;
};
/**
 * 用于保证业务参数的登录态参数，
 * 若接口不依赖登录态 如 user/login，则保证参数中不包括userId & token,
 * 若接口依赖登录态，则保证参数中填充userId & token,
 * @private
 * @param {object} param 要校验登录态的业务参数
 * @param {boolean} withAuth 是否要校验登录态
 * @returns {object} 增加登录态后的参数
 */


const modifyAuthParam = async (param, withAuth) => {
  const requestParam = { ...param
  };

  if (withAuth) {
    const {
      userId,
      token
    } = await getAuthInfo();
    requestParam.userId = userId;
    requestParam.token = token;
    return requestParam;
  }

  delete requestParam.userId;
  delete requestParam.userid;
  delete requestParam.token;
  return requestParam;
};
/**
 * @public
 * @class Request
 * @classdesc 网络请求类，对签名、鉴权等逻辑进行封装处理，用于向腾讯出行服务平台后台发送网络请求
 */


class Request {
  /**
   * 默认的request host域名
   * defaultHost 在tms-runtime初始化时进行设置，为出行服务接入层域名
   * 具体业务模块 new Request() 使用时，不指定自定义 host ，将使用defaultHost
   */
  static defaultHost = '';
  host = '';
  withAuth = true;
  baseParam = {};
  /**
   * Request 构造函数
   * @param {Object} config 构造参数
   * @param {Object} config.withAuth 是否填充登录态参数
   * @param {Object} config.host 自定义的host域名
   * @param {Object} config.baseParam 默认携带的参数
   */

  constructor(config = {
    withAuth: true
  }) {
    if (config.host) {
      this.host = config.host;
    }

    if (typeof config.withAuth !== 'undefined') {
      this.withAuth = !!config.withAuth;
    }

    this.baseParam = config.baseParam || {};
  }
  /**
  * 格式化接口路径
  * @private
  * @param {string} path 需要格式化的接口路径
  * @returns {string} 格式化后的接口路径
  */


  makeUrl(path) {
    if (/^http/i.test(path)) return path;
    const host = this.host || Request.defaultHost;
    const validHost = /^http/i.test(host) ? host : `https://${host}`;
    return `${validHost}/${path}`;
  }

  /**
   * @public
   * @memberof Request
   * @param {String} path 请求接口路径
   * @param {Object} [param] 请求参数
   * @param {Object} [header] 自定义请求头
   * @returns {Promise} 接口响应
   * @example
   * const $ = getApp().tms.createRequest();
   * $.get(apiPath)
   *  .then((data) => {
   *    // data {Object} 响应数据
   *    // {
   *    //   errCode {Number} 接口响应状态码
   *    //   errMsg  {String} 接口响应状态信息
   *    //   resData {Object} 接口返回数据
   *    // }
   *  })
   *  .catch((e) => {
   *    // e {Object} 错误信息
   *  });
   */
  get(path, param, header) {
    return this.doRequest(path, param, 'GET', header);
  }
  /**
   * @public
   * @memberof Request
   * @param {String} path 请求接口路径
   * @param {Object} [param] 请求参数
   * @param {Object} [header] 自定义请求头
   * @returns {Promise} 接口响应
   * @example
   * const $ = getApp().tms.createRequest();
   * $.post(apiPath)
   *  .then((data) => {
   *    // data {Object} 响应数据
   *    // {
   *    //   errCode {Number} 接口响应状态码
   *    //   errMsg  {String} 接口响应状态信息
   *    //   resData {Object} 接口返回数据
   *    // }
   *  })
   *  .catch((e) => {
   *    // e {Object} 错误信息
   *  });
   */


  post(path, param, header) {
    return this.doRequest(path, param, 'POST', header);
  }
  /**
   * 发送get方式的请求，该方法会返回wx.request全量的返回值（含data，header，cookies，statusCode）
   * @memberof Request
   * @param {string} path 请求接口路径
   * @param {object} param 业务参数
   * @param {object} header 自定义请求头
   * @returns {promise} 接口请求promise
   */


  execGet(path, param, header) {
    return this.createRequestTask(path, param, 'GET', header);
  }
  /**
   * 发送post方式的请求，该方法会返回wx.request全量的返回值（含data，header，cookies，statusCode等）
   * @memberof Request
   * @param {string} path 请求接口路径
   * @param {object} param 业务参数
   * @param {object} header 自定义请求头
   * @returns {promise} 接口请求promise
   */


  execPost(path, param, header) {
    return this.createRequestTask(path, param, 'POST', header);
  }
  /**
   * @memberof Request
   * @param {String} path 请求接口路径
   * @param {String} filePath 上传文件的本地路径
   * @param {Object} param 需要携带的其他参数
   * @param {Object} header 自定义的请求头
   * @returns {Object} 接口返回结果
   */


  async upload(path, filePath, param, header) {
    const requestParam = await composeParam(param, this.withAuth, this.baseParam);
    const res = await new Promise((resolve, reject) => {
      wx.uploadFile({
        name: 'content',
        url: this.makeUrl(path),
        filePath,
        formData: sign(requestParam),
        header,
        success: resolve,
        fail: reject
      });
    });

    if (typeof (res === null || res === void 0 ? void 0 : res.data) === 'string') {
      return JSON.parse(res === null || res === void 0 ? void 0 : res.data);
    }

    return res === null || res === void 0 ? void 0 : res.data;
  }
  /**
   * @memberof Request
   * @param {string} path 请求接口路径
   * @param {string} param 业务参数
   * @param {string} method 请求方法 get/post
   * @param {object} header 自定义的请求头
   * @returns {object} 接口返回结果
   */


  async doRequest(path, param = {}, method = 'POST', header = {}) {
    const res = await this.createRequestTask(path, param, method, header);
    const logger = getLogManager();
    logger.log({
      path,
      header,
      method,
      param,
      res: res === null || res === void 0 ? void 0 : res.data
    });

    if (typeof (res === null || res === void 0 ? void 0 : res.data) === 'string') {
      return JSON.parse(res === null || res === void 0 ? void 0 : res.data);
    }

    return res === null || res === void 0 ? void 0 : res.data;
  }
  /**
   * 序列化一个 get 请求地址
   * @memberof Request
   * @param {string} path 请求接口路径
   * @param {object} data 业务参数
   * @returns {Promise} 返回序列化之后的 get 请求地址
   */


  async serialize(path, data = {}) {
    let url = this.makeUrl(path);
    const signData = await composeParam(data, this.withAuth, this.baseParam);
    const signture = sign(signData);
    const params = [];
    Object.keys(signture).forEach(key => {
      const val = encodeURIComponent(signture[key]);
      params.push(`${key}=${val}`);
    });
    if (params.length) url += (/\?/.test(url) ? '&' : '?') + params.join('&');
    return Promise.resolve({
      url
    });
  }
  /**
   * 创建发送请求任务
   * @memberof Request
   * @param {string} path 请求接口路径
   * @param {string} param 业务参数
   * @param {string} method 请求方法 get/post
   * @param {object} header 自定义的请求头
   * @returns {object} 接口返回结果
   */


  async createRequestTask(path, param = {}, method = 'POST', header = {}) {
    const requestParam = await composeParam(param, this.withAuth, this.baseParam);
    const res = await new Promise((resolve, reject) => {
      wx.request({
        url: this.makeUrl(path),
        header,
        method,
        data: sign(requestParam),
        success: resolve,
        fail: reject
      });
    });
    return res;
  }

}

export { Request as R, getRealtimeLogManager as a, getLogManager as g, md5 as m };
