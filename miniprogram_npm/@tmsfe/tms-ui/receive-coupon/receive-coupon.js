/**
 * @copyright 2021-present, Tencent, Inc. All rights reserved.
 * @author FengGang.Sun <fenggangsun@tencent.com>
 * @file 领取商家券
 * 封装与微信支付插件、腾讯出行服务服务端间的交互，包括预领取、领券、领券结果上报等；
 * 使得业务可以简单通过批次号等信息完成商家券的领取，而不必关心具体实现细节
 */

import tmsCoreObj from '@tmsfe/tms-core'; // eslint-disable-line import/no-unresolved
const { createRequest } = tmsCoreObj;

let requester;
const request = (url, param, method = 'post') => { // eslint-disable-line require-jsdoc
  if (!requester) {
    requester = createRequest && createRequest();
  }
  return !requester ? Promise.reject()
    : requester[method](url, param)
      .then((res) => {
        const { errCode, resData } = res;
        if (errCode === 0) return resData;
        return Promise.reject(res);
      });
};

const EVENT_NAME_PREGRESS_CHANGE = 'progress-change';
const EVENT_STATUS_PRGRESS_CHANGE_PREPARE_DOING = 'PREPARE_DOING';
const EVENT_STATUS_PRGRESS_CHANGE_PREPARE_SUCCESS = 'PREPARE_SUCCESS';
const EVENT_STATUS_PRGRESS_CHANGE_PREPARE_FAIL = 'PREPARE_FAIL';
const EVENT_STATUS_PRGRESS_CHANGE_RECEIVE_DOING = 'RECEIVE_DOING';
const EVENT_STATUS_PRGRESS_CHANGE_RECEIVE_SUCCESS = 'RECEIVE_SUCCESS';
const EVENT_STATUS_PRGRESS_CHANGE_RECEIVE_FAIL = 'RECEIVE_FAIL';

Component({
  options: {
    multipleSlots: true,
  },

  properties: {
    // Array<Coupon> 要领取的商家券批次列表
    // Coupon: {
    //   stockId {String} 腾讯出行服务商家券内部批次
    //   bussRequestId {String} 业务请求标识ID（幂等，唯一：每个用户针对某个批次）
    //   customizeSendTime {Number} 自定义发放时间，毫秒时间戳
    // }
    merchantCoupons: { // 要领取的商家券批次列表
      type: Array,
      observer() { // eslint-disable-line require-jsdoc
        this.prepareReceiveParam();
      },
    },
    customUserInteraction: { // 是否自定义用户交互（指领取中、领取成功、失败时的UI提示）
      type: Boolean,
    },
  },

  data: {
    readyReceive: false, // 是否可以发起领取
    merchantNo: '', // 商户号ID
    merchantCouponsParam: [], // 发券参数
    sign: '', // 签名
  },

  preparing: false,
  receiveProm: null,
  receiveHandler: {},

  lifetimes: {
    attached() { // eslint-disable-line require-jsdoc
      this.receiveProm = null;
      this.receiveHandler = { resolver: null, rejecter: null };
      this.prepareReceiveParam();
    },
  },

  methods: {
    prepareReceiveParam() { // eslint-disable-line require-jsdoc
      const { merchantCoupons } = this.data;
      if (!Array.isArray(merchantCoupons) || merchantCoupons.length === 0 || this.preparing) return;

      this.preparing = true;
      this.triggerEventAndLog(EVENT_NAME_PREGRESS_CHANGE, { status: EVENT_STATUS_PRGRESS_CHANGE_PREPARE_DOING });
      this.setData({ readyReceive: false });
      this.getReceiveParam(merchantCoupons) // 获取领券参数
        .then((data) => {
          const { merchantNo, coupons, sign } = data;
          const merchantCouponsParam = coupons.map((coupon) => { // 领取代金券
            const customizeSendTime = this.formatCustomizeSendTime(coupon.customizeSendTime);
            const formatted = {
              stock_id: coupon.wxStockId,
              out_request_no: coupon.outRequestId,
              coupon_code: coupon.couponCode || '',
            };
            if (customizeSendTime) formatted.customize_send_time = customizeSendTime;
            return formatted;
          });
          this.setData({ merchantNo, sign, merchantCouponsParam, readyReceive: true });
          this.triggerEventAndLog(EVENT_NAME_PREGRESS_CHANGE, { status: EVENT_STATUS_PRGRESS_CHANGE_PREPARE_SUCCESS });
          this.preparing = false;
        })
        .catch((e) => {
          this.triggerEventAndLog(EVENT_NAME_PREGRESS_CHANGE, {
            status: EVENT_STATUS_PRGRESS_CHANGE_PREPARE_FAIL,
            error: e,
          });
          this.preparing = false;
        });
    },

    triggerEventAndLog(eventName, data) { // eslint-disable-line require-jsdoc
      this.triggerEvent(eventName, data);
      console.log(eventName, data); // eslint-disable-line
    },

    onNotPrepared() { // eslint-disable-line require-jsdoc
      console.log('not-prepared'); // eslint-disable-line
    },

    onTapReceive() { // eslint-disable-line require-jsdoc
      if (this.receiveProm) return this.receiveProm;

      const { merchantCoupons, customUserInteraction } = this.data;
      const prom = new Promise((resolve, reject) => {
        this.receiveHandler = { resolver: resolve, rejecter: reject };

        setTimeout(() => reject('Receive timeout'), 10000);

        !customUserInteraction && wx.showLoading({ title: '领取中', mask: true });
        this.triggerEventAndLog(EVENT_NAME_PREGRESS_CHANGE, { status: EVENT_STATUS_PRGRESS_CHANGE_RECEIVE_DOING });

        if (!Array.isArray(merchantCoupons) || merchantCoupons.length === 0) {
          !customUserInteraction && wx.showToast({ title: '领取失败' });
          reject(new Error('No coupons to receive'));
          return;
        }
      })
        .then((res) => { // 领券成功
          const result = this.formatReceiveResult(res.detail, merchantCoupons);
          this.triggerEventAndLog(EVENT_NAME_PREGRESS_CHANGE, {
            status: EVENT_STATUS_PRGRESS_CHANGE_RECEIVE_SUCCESS,
            result,
          });
          this.reportReceiveResult(result.coupons);
          if (!customUserInteraction) {
            const { msg } = this.formatReceiveResultDesc(result.coupons);
            if (msg) wx.showToast({ title: msg, icon: 'none' });
            else wx.hideLoading();
          }
          this.receiveProm = null;
        })
        .catch((e) => { // 领取失败（参数不合法、签名失败、领券失败）
          !customUserInteraction && wx.showToast({ title: '领取失败', icon: 'none' });
          this.triggerEventAndLog(EVENT_NAME_PREGRESS_CHANGE, {
            status: EVENT_STATUS_PRGRESS_CHANGE_RECEIVE_FAIL,
            error: e,
          });
          this.receiveProm = null;
        });
      this.receiveProm = prom;
      return prom;
    },

    /**
     * 格式化领取结果，将微信支付插件返回的数据格式化为符合腾讯出行服务格式风格的数据
     * @param {Object} result 微信支付插件返回的领取结果
     *   参考 bindcustomevent 回调说明 https://pay.weixin.qq.com/wiki/doc/apiv3/apis/chapter9_3_1.shtml
     * @param {Array} merchantCoupons 领取商家券时的参数
     * @returns {Object} 格式化后的领券结果，结构：
     *   {
     *     reqStatusCode: {String}         领券请求处理状态码
     *     reqStatusMsg:  {String}         领券请求处理状态信息
     *     coupons:       {Array<Object>}  所有券的具体领取结果信息
     *       coupons[i]:  {Object}         单张券的领取结果信息
     *       coupons[i].code:          {String} 单张券的领取结果状态码
     *       coupons[i].msg:           {String} 单张券的领取结果状态信息
     *       coupons[i].couponId:      {String} 券的唯一标识（券码）
     *       coupons[i].stockId:       {String} 腾讯出行服务内部批次号
     *       coupons[i].wxStockId:     {String} 微信支付券批次号
     *       coupons[i].bussRequestId: {String} 业务请求标识ID（幂等，唯一：每个用户针对某个批次）
     *       coupons[i].outRequestId:  {String} 领券凭证
     *   }
     */
    formatReceiveResult(result, merchantCoupons) {
      const { errcode, msg, send_coupon_result } = result;
      return {
        reqStatusCode: errcode,
        reqStatusMsg: msg,
        coupons: send_coupon_result.map((coupon, index) => ({
          code: coupon.code,
          msg: coupon.message,
          stockId: merchantCoupons?.[index]?.stockId || '',
          bussRequestId: merchantCoupons?.[index]?.bussRequestId || '',
          wxStockId: coupon.stock_id,
          couponId: coupon.coupon_code,
          outRequestId: coupon.out_request_no,
        })),
      };
    },

    formatReceiveResultDesc(result) { // eslint-disable-line require-jsdoc
      if (!Array.isArray(result) || result.length === 0) return 'UNKNOWN';
      let success = 0;
      let fail = 0;
      result.forEach((couponResult) => {
        if (couponResult.code === 'SUCCESS') {
          success += 1;
        } else {
          fail += 1;
        }
      });
      let type = 'ALL_SUCCESS';
      let msg = '领取成功';
      if (success === 0) {
        type = 'ALL_FAIL';
        msg = '领取失败';
      } else if (fail !== 0) {
        type = 'SOME_SUCCESS';
        msg = '部分领取成功';
      }
      return { type, msg };
    },

    onReceiveCouponResult(e) { // eslint-disable-line require-jsdoc
      this.receiveHandler.resolver && this.receiveHandler.resolver(e);
    },

    /**
     * 获取通过微信支付插件领取商家券时需要的参数
     * @param {Array<Object>} coupons 要领取的商家券批次号及业务领取标识
     * @returns {Promise} 成功时返回领券参数，结构如下：
     *   {
     *     merchantNo: {String} 商户号
     *     sign:       {String} 签名
     *     coupons:    {Array}  券信息
     *       coupons[i]:                     {Object} 某张券的领取参数
     *         coupons[i].wxStockId:         {String} 调用微信支付插件领券时用的批次号，不同于腾讯出行内部批次号（入参里的批次号）
     *         coupons[i].outRequestId:      {String} 领券凭证
     *         coupons[i].couponCode:        {String} 代金券ID，用于由业务侧制定券码的场景（出行服务暂未实现此功能）
     *         coupons[i].customizeSendTime: {Number} 自定义发放时间，毫秒时间戳
     * customizeSendTime);
     */
    getReceiveParam(coupons) {
      const couponsParam = [];
      let paramInvalidMsg = '';
      const allValid = coupons.every((coupon, index) => {
        let { stockId = '', bussRequestId = '', customizeSendTime } = coupon;
        stockId = String(stockId).trim();
        bussRequestId = String(bussRequestId).trim();
        if (!(stockId && bussRequestId)) {
          paramInvalidMsg = `第${index}张券的批次号或业务请求ID为空`;
          return false;
        }
        const sendTimeType = typeof customizeSendTime;
        if (sendTimeType === 'undefined') {
          customizeSendTime = 0;
        } else if (sendTimeType === 'number' || sendTimeType === 'string') {
          const timeStr = String(customizeSendTime).trim();
          if (timeStr === '') {
            customizeSendTime = 0;
          } else {
            const timeInt = parseInt(timeStr, 10);
            if (isNaN(timeInt) || customizeSendTime - timeInt !== 0) {
              paramInvalidMsg = `第${index}张券的自定义发放时间值不是int`;
            } else {
              customizeSendTime = timeInt;
            }
          }
        } else {
          paramInvalidMsg = `第${index}张券的自定义发放时间类型不合法`;
        }
        couponsParam.push({ stockId, bussRequestId, customizeSendTime });
        return !paramInvalidMsg;
      });
      return !allValid || couponsParam.length === 0 ? Promise.reject(new Error(paramInvalidMsg || '参数不合法'))
        : this.getMpOpenId().then(mpOpenId => request('user/coupon/prereceive', { mpOpenId, coupons: couponsParam }));
    },

    /**
     * 上报领取商家券结果
     * @param {Array<Object>} coupons 所有券的具体领取结果信息，单张券的领取结果信息结构如下：
     *   {
     *     coupons[i].code:          {String} 单张券的领取结果状态码
     *     coupons[i].msg:           {String} 单张券的领取结果状态码
     *     coupons[i].couponId:      {String} 券的唯一标识（券码）
     *     coupons[i].stockId:       {String} 腾讯出行服务内部批次号
     *     coupons[i].wxStockId:     {String} 微信支付券批次号
     *     coupons[i].bussRequestId: {String} 业务请求biao shID（幂等，唯一：每个用户针对某个批次）
     *     coupons[i].outRequestId:  {String} 领券凭证
     *   }
     * @returns {Promise} 上报结果
     */
    reportReceiveResult(coupons) {
      return request('user/coupon/receiveresult', {
        coupons: coupons.map(({ code, msg, couponId, stockId, bussRequestId, outRequestId }) => ({
          bussRequestId, outRequestId, stockId, couponId,
          statusCode: code,
          statusMessage: msg,
        })),
      });
    },

    getMpOpenId() { // eslint-disable-line require-jsdoc
      const { getLoginInfo, getOpenId } = getApp()?.tms || {};
      if (getOpenId) return getOpenId();
      return !getLoginInfo ? Promise.reject('app.tms.getOpenId and app.tms.getLoginInfo are not defined')
        : getLoginInfo().then(d => d.openId);
    },

    formatCustomizeSendTime(time) { // eslint-disable-line require-jsdoc
      const num = parseInt(time, 10);
      if (isNaN(num) || num <= 0) return '';
      const date = new Date(num);
      const timeStr = this.formatTime(date, 'yyyy-MM-ddThh:mm:ss');
      const timeDiffHour = date.getTimezoneOffset() / -60;
      const timeZonrStr = `${timeDiffHour >= 0 ? '+' : '-'}${String(timeDiffHour).padStart(2, '0')}:00`;
      return `${timeStr}${timeZonrStr}`;
    },

    /**
     * 格式化时间对象
     * @param {Date} date  Date对象
     * @param {String} fmt 目标格式，如：yyyy年MM月dd日，MM/dd/yyyy，yyyyMMdd，yyyy-MM-dd hh:mm:ss等
     * @returns {String} 格式化结果
     */
    formatTime(date, fmt) {
      if (!date instanceof Date || isNaN(date.getTime())) return '';
      const obj = {
        'M+': date.getMonth() + 1,  // 月份
        'd+': date.getDate(),   // 日
        'h+': date.getHours(),  // 小时
        'm+': date.getMinutes(),  // 分
        's+': date.getSeconds(),  // 秒
        S: date.getMilliseconds(),  // 毫秒
      };

      let dateStr = fmt;
      if (/(y+)/.test(dateStr)) {
        dateStr = dateStr.replace(RegExp.$1, (`${date.getFullYear()}`).substr(4 - RegExp.$1.length));
      }

      Object.entries(obj).forEach(([key, value]) => {
        if (new RegExp(`(${key})`).test(dateStr)) {
          dateStr = dateStr.replace(RegExp.$1, (RegExp.$1.length === 1) ? (value) : (`${value}`.padStart(2, '0')));
        }
      });

      return dateStr;
    },

    stopPropagation() { // eslint-disable-line require-jsdoc
      return;
    },
  },
});
