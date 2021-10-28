/**
 * @copyright 2020-present, Tencent, Inc. All rights reserved.
 * @author: Fenggang.Sun <fenggangsun@tencent.com>
 * @file POI检索组件
 */
import tmsCoreObj from '@tmsfe/tms-core'; // eslint-disable-line import/no-unresolved


const STORAGE_KEY_HISTORY_POI_QUERIES = 'StorageKeyHistoryPoiQueries';
let historyQueriesCache = null;

const { createRequest } = tmsCoreObj;
Component({
  properties: {
    city: { // 限定检索POI所在的城市
      type: String,
      value: '深圳市',
      observer(val, old) { // eslint-disable-line require-jsdoc
        if (val !== old) {
          this.updateCity(val);
        }
      },
    },
  },

  data: {
    uiCity: '', // 城市
    inputing: false,
    queryKey: '', // 当前检索关键词（输入框中字符串）
    candidates: [],
    historyQueries: [], // 历史检索关键词
    autoFocus: true, // 焦点切换到input
  },

  lastQueryKey: '',
  lastQueryProm: null,
  requester: null,

  attached() { // eslint-disable-line require-jsdoc
    this.requester = createRequest();
    this.updateCity(this.data.city);
    // 显示历史搜索关键词
    const historyQueries = this.getHistoryQueries();
    this.setData({ historyQueries });
  },

  methods: {
    /**
     * 从城市列表中选择城市
     * @returns {void}
     */
    selectCity() {
      wx.navigateTo({
        url: '/modules/me/pages/citylist/citylist?from=queryPoi',
        events: {
          onCitySelected: (data) => {
            if (data.cityName && data.cityName !== this.data.city) {
              this.setData({ city: data.cityName });
            }
          },
        },
      });
    },

    /**
     * 修改城市
     * @param {String} val 城市名
     * @returns {void}
     */
    updateCity(val) {
      let uiCity = String(val).replace(/市|地区|特别行政区/g, '');
      if (uiCity.length > 3) {
        uiCity = `${uiCity.substring(0, 3)}...`;
      }
      // 清空检索框和搜索结果
      const queryKey = '';
      const candidates = [];
      this.lastQueryKey = '';
      this.lastQueryProm = null;
      this.setData({ uiCity, queryKey, candidates });
    },

    /**
     * 获得历史检索记录
     * @returns {Array<Object>} 历史检索记录，Object类型为{ id, name, addr, poiType, longitude, latitude }
     */
    getHistoryQueries() {
      if (!historyQueriesCache) {
        historyQueriesCache = (wx.getStorageSync(STORAGE_KEY_HISTORY_POI_QUERIES) || []).filter(i => typeof i === 'object');
      }
      return historyQueriesCache;
    },

    /**
     * 更新历史检索记录
     * @param {Object} poi poi对象
     * @param {String} poi.id poi id
     * @param {String} poi.name poi名字
     * @param {String} poi.addr poi地址
     * @param {Number} poi.longitude poi地理位置经度
     * @param {Number} poi.latitude poi地理位置纬度
     * @returns {void}
     */
    updateQueryHistory(poi) {
      const { id, name, addr, poiType, longitude, latitude } = poi || {};
      if (!id) return;
      const cur = this.getHistoryQueries();
      const newArr = cur.filter(i => i.id !== id);
      newArr.unshift({ id, name, addr, poiType, longitude, latitude });
      newArr.splice(10);
      historyQueriesCache = newArr;
      this.setData({ historyQueries: historyQueriesCache });
      wx.setStorage({
        key: STORAGE_KEY_HISTORY_POI_QUERIES,
        data: historyQueriesCache,
      });
    },

    /**
     * 清空历史检索记录
     * @returns {void}
     */
    onClearQueryHistory() {
      historyQueriesCache = [];
      this.setData({ historyQueries: historyQueriesCache });
      wx.setStorage({
        key: STORAGE_KEY_HISTORY_POI_QUERIES,
        data: historyQueriesCache,
      });
    },

    /**
     * 输入框获得输入焦点
     * @returns {void}
     */
    onFocus() {
      this.setData({ inputing: true });
    },

    /**
     * 输入框失去焦点，发起检索或清空待选列表
     * @param {Event} e 事件
     * @returns {void}
     */
    onBlur(e) {
      this.setData({ inputing: false });
      if (this.clickedHistoryQuery) return;
      const val = (e.detail.value || '').trim();
      if (val) {
        this.queryPoi(val);
      } else {
        this.onClearInput();
      }
    },

    /**
     * 从历史检索记录中选择某个poi
     * @param {Event} e 单击事件
     * @returns {void}
     */
    onClickHistoryQuery(e) {
      const { id, name, addr, longitude, latitude, poiType } = e.currentTarget.dataset;
      this.triggerSelectPoiEvt(name, addr, longitude, latitude);
      this.updateQueryHistory({ id, name, addr, longitude, latitude, poiType });
      this.clickedHistoryQuery = false;
    },

    /**
     * 输入框内关键词变化，发起检索
     * @param {Event} e 输入事件
     * @returns {void}
     */
    onInput(e) {
      this.setData({ queryKey: e.detail.value || '' });
      if (this.queryTimeout) { // 清除还未发出去的请求，避免发送过多无用请求
        clearTimeout(this.queryTimeout);
      }
      wx.showNavigationBarLoading();
      const value = e.detail.value.replace(/\s/g, '');
      // 更新输入框
      this.setData({ queryKey: value, refreshing: true });
      // 延迟发送检索请求，避免快速输入时发送过多请求
      this.queryTimeout = setTimeout(() => this.queryPoi(value), 100);
    },

    /**
     * 清空数据框及待选列表
     * @returns {void}
     */
    onClearInput() {
      this.setData({ queryKey: '', candidates: [], autoFocus: true });
    },

    /**
     * 取消选择poi
     * @returns {void}
     */
    onCancel() {
      this.triggerEvent('cancel', {}, {});
    },

    /**
     * 点击待选列表中的某个poi
     * @param {Event} e 单击事件
     * @returns {void}
     */
    onClickPoi(e) {
      const { latitude, longitude, id, name, addr, poiType } = e.currentTarget.dataset;
      this.updateQueryHistory({ latitude, longitude, id, name, addr, poiType });
      this.triggerSelectPoiEvt(name, addr, longitude, latitude);
    },

    /**
     * 选中某个poi，向外抛出事件
     * @param {String} name poi名字
     * @param {String} address poi地址
     * @param {Number} longitude poi地理位置经度
     * @param {Number} latitude poi地理位置纬度
     * @returns {void}
     */
    triggerSelectPoiEvt(name, address, longitude, latitude) { // esilnt-disable-line require-jsdoc
      this.triggerEvent('choosepoi', { poi: { name, address, latitude, longitude } }, {});
    },

    /**
     * 根据关键词检索poi
     * @param {String} key 关键词
     * @returns {Promise<Array<Object>>} poi列表
     */
    queryPoi(key) {
      if (key && key === this.lastQueryKey) return this.lastQueryProm;
      this.lastQueryKey = key;
      const queryProm = !key ? Promise.resolve([])
        : this.requester.get('basic/lbs/sug', { keyword: key, city: this.data.city })
          .then(d => d?.resData?.list || [])
          .catch(() => []);
      this.lastQueryProm = queryProm
        .then((poiList) => {
          if (key === this.lastQueryKey) {
            this.updatePoiCandidates(poiList);
            wx.hideNavigationBarLoading();
          }
        });
      return this.lastQueryProm;
    },

    /**
     * 更新POI列表
     * @param {Array<Object>} poiList poi数据列表
     * @returns {void}
     */
    updatePoiCandidates(poiList) {
      const key = this.lastQueryKey;
      const candidates = !Array.isArray(poiList) ? [] : poiList.map((poi) => {
        const { strUid = '', strName = '', strClass = '', strAddr = '', latitude = 0, longitude = 0 } = poi || {};
        let names;
        const keyIndex = strName.indexOf(key);
        if (keyIndex !== -1) {
          if (keyIndex === 0) {
            names = [
              { str: key, highlight: true },
              { str: strName.substr(key.length), highlight: false },
            ];
          } else {
            names = [
              { str: strName.substring(0, keyIndex), highlight: false },
              { str: key, highlight: true },
            ];
            if (keyIndex + key.length < strName.length) {
              names.push({ str: strName.substring(keyIndex + key.length), highlight: false });
            }
          }
        } else {
          names = [
            { str: strName, highlight: false },
          ];
        }
        return { names, id: strUid, name: strName, poiType: strClass, addr: strAddr, latitude, longitude };
      });

      this.setData({ candidates });
    },
  },
});
