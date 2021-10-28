/**
 * 显示或隐藏Modal
 * @param {Boolean} display 展示/隐藏
 * @param {Object} options Modal参数
 * @param {Function} selectComp 选择组件的方法
 * @returns {void}
 */
const toggleModal = (display = true, options = {}, selectComp) => {
  const { selector = '#modal' } = options;
  try {
    const comp = selectComp(selector);
    if (display) {
      comp.show(options);
    } else {
      comp.hide(options);
    }
  } catch (e) {
    if (typeof options.fail === 'function') {
      options.fail({ errMsg: e.toString() });
    } else {
      throw e;
    }
    if (typeof options.complete === 'function') {
      options.complete({ success: false, errMsg: e.toString() });
    }
  }
};

const showModal = (options, selectComp) => toggleModal(true, options, selectComp); // eslint-disable-line require-jsdoc
const hideModal = (options, selectComp) => toggleModal(false, options, selectComp); // eslint-disable-line require-jsdoc

export default {
  showModal,
  hideModal,
};
