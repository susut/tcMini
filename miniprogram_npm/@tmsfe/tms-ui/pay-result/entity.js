import tmsCoreObj from '@tmsfe/tms-core'; // eslint-disable-line import/no-unresolved

const { getConfig, getLocationManager, getReporter  } = tmsCoreObj;
const ConfigUtils = { getConfig };
const Location = getLocationManager();
const Report  = getReporter().report;

const OrderDetailPath = {
  wash: '/modules/wash/pages/order/order',
  refuel: '/modules/refuel/pages/order/order',
  refuelCard: '/modules/refuelcard/pages/order/order',
  fuelConsumption: '/modules/refuelconsumption/pages/index/index',
  recharge: '/modules/refuelcard/pages/recharge/recharge',
};

const properties = {
  // 业务类型，可选值wash, refuel, refuelCard
  bussinessType: {
    type: String,
    value: '',
  },
  // 次级标题
  subTitle: {
    type: String,
  },
  // 需要发起导航的目的地信息，应包含latitude、longitude、name、address字段
  destination: {
    type: Object,
    value: {},
  },
  // 订单Id
  orderId: {
    type: String,
    value: '',
  },
  // bannerId
  bannerId: {
    type: String,
    value: '',
  },
  // 商家电话
  phone: {
    type: String,
    value: '',
  },
  // 是否自定义导航栏
  isCustomNavBar: {
    type: Boolean,
    value: true,
  },
  // 是否使用副配置
  useViceStaticData: {
    type: Boolean,
    value: false,
  },
  // 是否展示服务评价入口
  showCommentEntry: {
    type: Boolean,
    value: false,
    observer(showCommentEntry) { // eslint-disable-line require-jsdoc
      if (!showCommentEntry) {
        return;
      }

      reportAction(1, this.data); // 服务评价入口展现上报
    },
  },
  // 自定义导航栏高度。（在自定义导航栏页面，可能需要特殊处理）
  navbarHeight: {
    type: Number,
    value: 0,
  },
  // 获取配置时的额外参数
  extraConfAttr: {
    type: Object,
    value: {},
  },
};

const data = {
  static: {},
  dynamic: {},
  ready: false,
  hasBanner: true,
};

const StaticData = {
  wash: {
    icon: 'https://static.img.tai.qq.com/mp/paycallback/wash.png',
    title: '请在前往门店前致电商户预约',
    subTitle: '为保证您的权益请勿与商户线下交易',
    viceData: {
      title: '24小时之内前往约定网点洗车',
      subTitle: [
        '网点可自动识别车牌，',
        '请勿驾驶与订单不符的车辆前往',
      ],
      payActions: [
        {
          icon: '',
          title: '查看订单',
          type: 'toDetail',
        },
      ],
    },
    bussActions: [
      {
        icon: 'https://static.img.tai.qq.com/mp/paycallback/nav.png',
        title: '导航前往',
        type: 'nav',
      },
      {
        icon: 'https://static.img.tai.qq.com/mp/paycallback/tel.png',
        title: '致电商户',
        type: 'tel',
      },
    ],
    payActions: [
      {
        icon: '',
        title: '查看券码',
        type: 'toDetail',
      },
    ],
  },
  refuel: {
    icon: 'https://static.img.tai.qq.com/mp/paycallback/refuel.png',
    title: '请告知加油员已支付成功',
    subTitle: '驶离加油站时请减速慢行',
    bussActions: [],
    payActions: [
      {
        icon: '',
        title: '记油耗',
        type: 'toFuelConsumption',
      },
      {
        icon: '',
        title: '查看订单',
        type: 'toDetail',
      },
      {
        icon: '',
        title: '去评价',
        type: 'toCommentPage',
      },
    ],
  },
  refuelCard: {
    icon: 'https://static.img.tai.qq.com/mp/paycallback/refuelcard.png',
    title: '充值结果将通过服务通知告诉你',
    subTitle: '到账后需在加油站圈存后才可使用',
    bussActions: [],
    payActions: [
      {
        icon: '',
        title: '查看订单',
        type: 'toDetail',
      },
      {
        icon: '',
        title: '再来一单',
        type: 'toRecharge',
      },
    ],
  },
};

const getStaticData = bussType =>  StaticData[bussType]; // eslint-disable-line require-jsdoc

const formatSubTitle = (subTitle = '', highlightColors = []) => { // eslint-disable-line require-jsdoc
  const matchRegexp = /(<h>.*?<\/h>|[^</>]{1,})/gi; // 从subTitle中匹配需要高亮的文案的正则对象
  const testRegexp = /^<h>.*?<\/h>$/gi;             // 检查文案是否高亮的正则对象
  const replaceRegexp = /(<h>|<\/h>)/gi;            // 替换掉高亮标志符的正则对象

  const matches = subTitle.match(matchRegexp);
  if (!matches || matches.length === 1) {
    return [
      {
        text: subTitle,
        color: '',
      },
    ];
  }

  let hlIndex = -1;
  return matches.map((text) => {
    if (testRegexp.test(text)) {
      hlIndex += 1;
      return {
        text: text.replace(replaceRegexp, ''),
        color: highlightColors[hlIndex] || '',
      };
    }

    return {
      text,
      color: '',
    };
  });
};

/**
 * 配置数据格式化
 * @param {Object} conf 配置
 * @returns {Object} 格式化后的配置数据
 */
const formatDynamicData = (conf) => {
  const detail = Object.assign({}, conf);
  const { subTitle, subTitleColors } = detail;
  detail.subTitle = formatSubTitle(subTitle, subTitleColors);
  return { dynamic: detail, ready: true };
};

/**
 * 支付回调运营位展示数据上报
 * @param {Object} config 运营位配置数据
 * @param {String} bussinessType 业务类型
 * @returns {void}
 */
const reportConfigShow = (config = {}, bussinessType) => {
  const { dynamic } = config;
  if (!dynamic) {
    return;
  }

  Report({ 27: 'K024', 38: bussinessType, 39: (dynamic.title || '') });
};

/**
 * 获取配置数据
 * @param {String} bussType 业务类型
 * @param {Object} extraConfAttr 扩展参数
 * @returns {Promise<object>} 配置数据
 */
const getDynamicData = (bussType, extraConfAttr) => Location.getLocationDetail()
  .then((loc) => {
    const extendAttrs = { city: loc.cityName, ...(extraConfAttr || {}) };
    return ConfigUtils.getConfig(`/\${client}/pay/callback/${bussType}`, extendAttrs);
  })
  .then(res => formatDynamicData(res))
  .then((res) => {
    reportConfigShow(res, bussType);
    return res;
  })
  .catch(() => Promise.resolve({}));

const nav = (options) => { // eslint-disable-line require-jsdoc
  wx.openLocation(options);
};

const toDetail = (type, orderId) => { // eslint-disable-line require-jsdoc
  const url = `${OrderDetailPath[type]}?orderId=${orderId}&from=paySuccess`;
  wx.navigateTo({ url });
  Report({ 27: 'K025', 38: type, 39: orderId });
};

const toRecharge = (type, orderId) => { // eslint-disable-line require-jsdoc
  const url = `${OrderDetailPath.recharge}?from=paySuccess`;
  wx.redirectTo({ url });
  Report({ 27: 'K051', 38: type, 39: orderId });
};

const toFuelConsumption = (orderId) => { // eslint-disable-line require-jsdoc
  const url = `${OrderDetailPath.fuelConsumption}?orderId=${orderId}&toedit=true&from=refuelPaySuccess`;
  wx.navigateTo({ url });
  Report({ 27: 'K044', 38: 'refuel', 39: orderId });
};

const toTarget = (data = {}) => { // eslint-disable-line require-jsdoc
  const { dynamic, bussinessType, orderId } = data;
  const { link, mpAppId } = dynamic;

  Report({ 27: 'K023', 38: bussinessType, 39: orderId });

  // 跳转小程序
  if (link && mpAppId) {
    wx.navigateToMiniProgram({
      appId: mpAppId,
      path: link,
    });
    return;
  }

  // 跳转公众号文章, h6页面
  if (link && link.startsWith('http')) {
    wx.navigateTo({ url: `/modules/x/webcontainer/webcontainer?url=${link}` });
    return;
  }

  // 跳转当前小程序内页面
  if (link) {
    wx.navigateTo({ url: link });
  }
};

// 调准服务评价页面
const toCommentPage = (data, cb) => { // eslint-disable-line require-jsdoc
  const { bussinessType, orderId } = data;
  const url = `/modules/me/pages/comment/comment?mode=add&type=${bussinessType}&from=paySuccess&orderId=${orderId}`;
  wx.navigateTo({
    url,
    events: {
      // 评价完成
      commentComplete({ status }) { // eslint-disable-line require-jsdoc
        cb(status);
      },
    },
  });

  reportAction(2, data); // 服务评价入口点击上报
};

const reportAction = (action = 0, data = {}) => { // eslint-disable-line require-jsdoc
  const { bussinessType, orderId } = data;
  Report({
    27: 'K032',
    37: (bussinessType || ''),
    38: (orderId || ''),
    39: action,
  });
};

const reportAttached = (bussinessType, orderId) => { // eslint-disable-line require-jsdoc
  Report({ 27: 'K045', 38: (bussinessType || ''), 39: (orderId || '') });
};

/**
 * 拨打电话
 * @param {String} phone 电话号码
 * @returns {void}
 */
const makePhoneCall = (phone) => {
  if (!phone) {
    wx.showToast({ title: '暂无商家电话', icon: 'none' });
    return;
  }

  const separator = ';';
  const phoneNumber = phone.replace(/[\s;,；，]/g, separator);
  const phoneArray = phoneNumber.split(separator)
    .filter(item => !(!/[0-9]{1,}/.test(item))); // 过滤掉不合法的号码
  if (phoneArray.length === 0) {
    wx.showToast({ title: '暂无商家电话', icon: 'none' });
  } else if (phoneArray.length === 1) {
    wx.makePhoneCall({ phoneNumber: phoneArray.shift() });
  } else {
    wx.showActionSheet({
      itemList: phoneArray,
      success: (res) => {
        wx.makePhoneCall({ phoneNumber: phoneArray[res.tapIndex] });
      },
    });
  }
};

export default {
  nav,
  data,
  toDetail,
  toRecharge,
  toTarget,
  makePhoneCall,
  properties,
  reportAction,
  reportAttached,
  toCommentPage,
  getStaticData,
  getDynamicData,
  toFuelConsumption,
};
