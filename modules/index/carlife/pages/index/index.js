Page({
  data: {
    curidx: 0,
    cityName: '',
    logo: 'https://static.img.tai.qq.com/mp/common/tms-web-logo.png',
  },
  async onLoad() {
  },
  // tab切换
  chooseTab({ mark: { curidx } }) {
    this.setData({ curidx });
  },
});
