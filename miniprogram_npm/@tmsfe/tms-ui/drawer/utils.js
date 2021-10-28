/**
 * 打开Drawer
 * @param {Object} options Drawer参数
 * @param {Function} selectComp 选择组件的方法
 * @returns {void}
 */
const showDrawer = (options = {}, selectComp) => {
  const { selector = '#drawer' } = options;
  const comp = selectComp(selector);
  comp.show(options);
};

/**
 * 关闭Drawer
 * @param {Object} options Drawer参数
 * @param {Function} selectComp 选择组件的方法
 * @returns {void}
 */
const hideDrawer = (options = {}, selectComp) => {
  const { selector = '#drawer' } = options;
  const comp = selectComp(selector);
  comp.hide(options);
};

export default {
  showDrawer,
  hideDrawer,
};
