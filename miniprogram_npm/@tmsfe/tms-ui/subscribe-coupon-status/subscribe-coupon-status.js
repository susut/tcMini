/**
 * @copyright 2020-present, Tencent, Inc. All rights reserved.
 * @author Fenggang.Sun <fenggangsun@tencent.com>
 * @file 用于订阅代金券状态
 *   1. 使用者无需关心代金券状态订阅消息模板ID等信息
 *   2. 使用此组件时，以slot形式渲染组件，本组件只处理订阅逻辑
 *   3. 在点击此组件时，将完成订阅动作
 *   4. 订阅完成后（包括用户允许和拒绝），向外抛出subscribe-end事件，并附带订阅结果
 *      订阅结果数据结构：{ subscribeSuccess: boolean; reportSuccess: boolean; msg: string }
 *   5. 订阅成功时，向服务端上报订阅状态
 */
import tmsCore from '@tmsfe/tms-core'; // eslint-disable-line import/no-unresolved
import tmsRuntime from '@tmsfe/tms-runtime'; // eslint-disable-line import/no-unresolved
import platformUtils from '../platformUtils';

Component({
  properties: {
    mode: {
      type: String,
      value: 'single', // 订阅模式：single 单张，batch 多张
    },

    couponId: { // 代金券ID
      type: String,
    },

    stockId: { // 代金券批次ID
      type: String,
    },

    coupons: { // 代金券列表
      type: Object, // { stockId, couponId }
    },

    useScene: { // 组件使用场景，埋点时会用到
      type: String,
    },
  },

  subscribing: false,

  methods: {
    /**
     * 订阅过期提醒
     * @returns {void}
     */
    subscribe() {
      if (this.subscribing) return;
      this.subscribing = true;

      // 参数检查
      const { pass, msg: checkPropertyMsg } = this.checkProperty();
      if (!pass) {
        this.triggerEvent('subscribe-end', { subscribeSuccess: false, msg: checkPropertyMsg });
        this.subscribing = false;
        return;
      }

      let subscribeSuccess; // 订阅操作结果
      let reportSuccess; // 订阅成功时上报服务端的结果
      let msg; // 订阅&上报结果提示语
      this.invokeWxSubscribe()
        .then((data) => {
          const { tmplIds, res } = data;
          const id = tmplIds && tmplIds[0];

          if (res && res[id] === 'accept') return true;

          this.log('warn', '订阅发生错误', data);
          return false;
        })
        .catch((e) => {
          this.log('error', '订阅发生错误', e);
          return false;
        })
        .then((subscribeResult) => { // 订阅完成（成功或失败）
          subscribeSuccess = subscribeResult;
          if (!subscribeSuccess) { // 订阅失败时，不上报，直接返回false
            return { success: false };
          }
          wx.showLoading({ title: '', mask: true });
          return this.reportSubscribeStatus(); // 上报订阅成功状态
        })
        .then(({ success: reportResult, couponStr = '' }) => { // 上报结果
          reportSuccess = reportResult;
          if (!subscribeSuccess) {
            msg = '订阅不成功';
          } else {
            msg = reportSuccess ? '订阅成功' : '上报订阅状态失败';
          }
          wx.hideLoading();
          this.subscribing = false;
          const { mode, useScene } = this.data;
          this.dataReport({
            26: '8', 27: '8012',
            36: mode, 37: couponStr, 38: String(subscribeSuccess), 39: String(reportSuccess), 40: useScene,
          });
          this.triggerEvent('subscribe-end', { subscribeSuccess, reportSuccess, msg });
        });
    },

    /**
     * 组件property合法性检查
     * @returns {Object} 检查结果 { pass, msg }
     */
    checkProperty() {
      const { mode, stockId, couponId, coupons } = this.data;
      if (mode !== 'batch') { // 单张
        const pass = !!(stockId && couponId);
        return { pass, msg: pass ? 'ok' : '缺少必填代金券属性' };
      }
      if (!Array.isArray(coupons)) return { pass: false, msg: 'coupons参数不合法' };
      const pass = coupons.every(item => item.stockId && item.couponId);
      return { pass, msg: pass ? 'ok' : '部分代金券参数不合法' };
    },

    /**
     * 调用微信订阅模版消息方法
     * @returns {Promise} 订阅成功的返回数据或者失败失败的错误信息
     */
    invokeWxSubscribe() {
      return new Promise((resolve, reject) => {
        const tmplIds = {
          wx65cc950f42e8fff1: ['mxkBqolsih6Ox4UOgZDsjbKCtmNXhJw7SUcxLPdP8VI'],
        }[platformUtils.getAppId()];
        if (!tmplIds) {
          reject('No template ids');
          return;
        };
        wx.requestSubscribeMessage({
          tmplIds,
          complete: (res) => { // 埋点？
            const { errCode, errMsg } = res;
            this.dataReport({ 26: '8', 27: '800I', 36: 'couponRemind', 37: tmplIds.join(','), 38: errCode, 39: errMsg, 40: JSON.stringify(res) });
            resolve({ tmplIds, res });
          },
          fail: reject,
        });
      });
    },

    /**
     * 上报订阅状态
     * @returns {Promise<Object>} 上报订阅状态请求结果
     */
    reportSubscribeStatus() {
      let param;
      let url;
      let couponParam;
      return tmsRuntime.getOpenId()
        .then((wxOpenId) => {
          const commonParam = { wxOpenId };
          if (this.data.mode !== 'batch') { // 单张券的订阅
            url = 'user/coupon/status/subscribe';
            couponParam = {
              couponId: this.data.couponId,
              stockId: this.data.stockId,
            };
          } else { // 多张券的订阅
            url = 'user/coupon/status/subscribepkg';
            const coupons = this.data.coupons.concat() // 对代金券列表进行去重处理
              .reverse() // 先逆向
              .filter((x, i, arr) => !arr.slice(i + 1).find(y => y.couponId === x.couponId)) // 过滤重复元素
              .reverse() // 再次逆向
              .map(coupon => `${coupon.stockId},${coupon.couponId}`) // 拼接参数
              .join(';');
            couponParam = { coupons };
          }
          param = { ...commonParam, ...couponParam };
          return tmsCore.createRequest().post(url, param);
        })
        .then((res) => {
          if (res.errCode === 0) {
            return true;
          }
          this.log('error', '上报订阅状态错误', url, param, res);
          return false;
        })
        .catch((e) => {
          this.log('error', '上报订阅状态失败', url, param, e);
          return false;
        })
        .then(success => ({ success, couponStr: couponParam.coupons || `${couponParam.stockId},${couponParam.couponId}` }));
    },

    /**
     * 数据埋点
     * @param {Object} data 埋点数据
     * @returns {void}
     */
    dataReport(data) {
      const report = tmsCore.getReporter()?.report;
      report && report(data);
    },

    /**
     * 打日志
     * @param {String} method 日志级别 error/warn/info/log
     * @param  {...any} data 日志信息
     * @returns {void}
     */
    log(method, ...data) {
      const logger = tmsCore.getLogManager();
      const rtLogger = tmsCore.getRealtimeLogManager();
      logger && logger[method] && logger[method](...data);
      rtLogger && rtLogger[method] && rtLogger[method](...data);
    },
  },
});
