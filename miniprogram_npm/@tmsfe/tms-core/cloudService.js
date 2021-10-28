import { a as getAuthInfo, g as getEnvInfo } from './env-612e2703.js';

/**
 * callCloudFunc 方法 调用云函数
 * @param {String} name 要调用的云函数
 * @param {Object} data 需要传给云函数的参数
 * @param {Boolean} withAuth 是否需要补充userId，token参数，当云函数需要调用SinanServer时，需要这些参数来完成鉴权
 * @returns {viod} 云函数
 */

const callCloudFunc = async (name = '', data = {}, withAuth = true) => {
  const {
    cloudEnvId,
    appVersion
  } = getEnvInfo();
  const timestamp = Date.now();
  const random = Math.random().toString().slice(2, 7);
  const sourceId = 7; // 6 未知 7 云函数 8 出行 9 我的车

  const mergedData = { ...data,
    timestamp,
    seqId: `${timestamp}${sourceId}${random}`,
    // 补充seqId参数
    appVersion // 补充appVersion参数

  };

  if (withAuth) {
    // 补充userId， token参数
    const {
      userId,
      token
    } = await getAuthInfo();
    Object.assign(mergedData, {
      userId,
      token
    });
  }

  const res = await new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data: mergedData,
      config: {
        env: cloudEnvId
      },
      success: resolve,
      fail: err => {
        reject({
          err,
          name,
          mergedData
        });
      }
    });
  });
  return res;
};

export { callCloudFunc };
