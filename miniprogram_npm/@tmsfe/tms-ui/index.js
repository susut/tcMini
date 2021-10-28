import drawerUtils from './drawer/utils';
import modalUtils from './modal/utils';

/**
 * 从当前页面中选定组件
 * @param {String} selector 元素选择器
 * @returns {Element} 组件
 */
const selectCompFromCurPage = (selector) => {
  const pages = getCurrentPages();
  if (pages.length === 0) {
    throw new Error('Empty page container found');
  }

  const context = pages[pages.length - 1];
  const comp = context.selectComponent(selector);
  if (!comp) {
    throw new Error(`No component found with selector <${selector}>`);
  }
  return comp;
};

/* eslint-disable */
const showDrawer = (options, selectComp = selectCompFromCurPage) => drawerUtils.showDrawer(options, selectComp);
const hideDrawer = (options, selectComp = selectCompFromCurPage) => drawerUtils.hideDrawer(options, selectComp);
const showModal = (options, selectComp = selectCompFromCurPage) => modalUtils.showModal(options, selectComp);
const hideModal = (options, selectComp = selectCompFromCurPage) => modalUtils.hideModal(options, selectComp);
/* eslint-disable */

module.exports = {
  showDrawer, hideDrawer,
  showModal, hideModal,
};
