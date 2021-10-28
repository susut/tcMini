/** 数字输入组件 支持:
 *    数字以及小数点键盘
 *    自定义输入框样式,组件上class即可
 *    自定义placeholder样式,光标样式
 *    自定义方块输入框等(custom:true),组件元素内写输入框即可
 *    指定输入长度
 *    文本自动左移
 *    自动聚焦
 *    长按删除
 *    文本可选复制与长按输入框粘贴
 *    输入框被键盘遮挡或不足指定距离时支持上推页面
 *    支持指定光标与键盘的距离(需确保页面内输入框底部有不小于键盘高度的距离可供滚动,若无可自行添加占位块)
 *    支持绑定 focus input blur confirm delete pushup(页面被上推)事件
 *    !不要在focus事件中再设置focus属性(已经聚焦再设置聚焦没有意义),避免产生死循环
 */
Component({
  // placeholder-class同原生;cursor-class光标样式;focus-placeholder-class聚焦时的placeholder样式(使用important覆盖默认样式)
  externalClasses: ['placeholder-class', 'cursor-class', 'focus-placeholder-class'],
  properties: { // 属性同原生input
    value: String,
    maxlength: {
      value: '-1',
      type: String,
    },
    cursorspacing: { // 指定光标与键盘的距离 单位px
      value: 1,
      type: Number,
    },
    focus: Boolean,
    disabled: Boolean,
    type: {
      value: 'number',  // number/digit
      type: String,
    },
    title: String,  // 键盘上方标题 可为空
    tag: {          // view/cover-view 模式
      value: 'view',
      type: String,
    },
    custom: Boolean, // 自定义输入框(键盘透明蒙层的z-index值为9998,若需要有元素透出蒙层,例如提交按钮等,设置该元素z-index>=9999即可)
    // 自定义输入框时无以下属性
    placeholder: String,
    disablepaste: Boolean,  // 是否禁用长按粘贴文本
    focusplaceholder: String, // 聚焦时的placeholder
  },

  observers: {
    focus(val) { // eslint-disable-line require-jsdoc
      if (val) {
        this.clickInput();
      }
    },
  },

  data: {
    showKeyboard: false,
  },

  // 组件的回调方法
  methods: {
    // 点击聚焦
    clickInput() { // eslint-disable-line require-jsdoc
      if (this.data.disabled) return;
      this.setData({ showKeyboard: true });
      this.triggerEvent('focus', { value: this.data.value });
      this.handleKeyboardDistance();
    },

    // 点击键盘键位
    clickButton(e) { // eslint-disable-line require-jsdoc
      const { id } = e.currentTarget;
      const str = this.data.value;
      switch (id) {
        case 'confirm':    // 确认
          this.triggerEvent('confirm', { value: str });
          this.onInputBlur('confirm');
          break;
        case 'del': {      // 删除
          this.delInputValue();
        }
          break;
        default: {         // 数字
          if (id === '.' && str.includes('.')) {  // 小数时只允许一个.
            return;
          }
          this.onInput(id);
          this.onTextOverflow();
        }
          break;
      }
    },

    // 输入
    onInput(text) { // eslint-disable-line require-jsdoc
      const oldstr = this.data.value;
      const value = `${oldstr}${text}`;
      const maxlength = ~~this.data.maxlength; // 输入长度限制 ~~转换Number
      if ((maxlength > 0) && (value.length > maxlength)) {
        return;
      }
      this.setData({ value });
      this.triggerEvent('input', { value });
    },

    // 点击透明蒙层
    clickMask() { // eslint-disable-line require-jsdoc
      this.onInputBlur('mask');
    },

    // 失焦
    onInputBlur(eventSrc) { // eslint-disable-line require-jsdoc
      this.setData({ showKeyboard: false });
      this.triggerEvent('blur', { eventSrc, value: this.data.value });
    },

    // 长按删除键逐个删除
    onDelLongPress() { // eslint-disable-line require-jsdoc
      this.timer = setInterval(() => {
        this.delInputValue();
      }, 100);
    },

    // 长按结束
    onPressEnd() { // eslint-disable-line require-jsdoc
      clearInterval(this.timer);
    },

    // 删除
    delInputValue() { // eslint-disable-line require-jsdoc
      const str = this.data.value;
      const newStr = str.slice(0, str.length - 1);
      this.setData({ value: newStr || '' });
      this.triggerEvent('delete', { value: newStr });
      this.triggerEvent('input', { value: newStr });
    },

    // 文本溢出左移
    onTextOverflow() { // eslint-disable-line require-jsdoc
      if (this.data.custom) return;
      // 获取光标右边界位置与输入框右边界位置对比 光标超出时自动左移文本
      this.query = wx.createSelectorQuery().in(this); // 每次执行需重新创建
      this.query.select('#cursor').boundingClientRect((res) => {
        if ((res.right + 10) > this.inputOffset) {
          this.setData({ scrollto: 'cursor' });
        }
      })
        .exec();
    },

    // 处理光标与键盘间距
    handleKeyboardDistance() { // eslint-disable-line require-jsdoc
      this.winHeight ??= wx.getSystemInfoSync().windowHeight;
      wx.nextTick(() => {
        const query = wx.createSelectorQuery().in(this);
        query.select('.keyboard').boundingClientRect(); // 键盘高度不变,可以进行缓存,考虑到需要返回四个结果且性能影响较小,这里不进行缓存
        query.select('#input').boundingClientRect();
        query.select('#cursor').boundingClientRect();
        query.selectViewport().scrollOffset()
          .exec(([keyboardRect = {}, inputRect = {}, cursorRect = {}, scrollOffset = {}]) => {
            const keyboardTop = this.winHeight - keyboardRect.height;  // 窗口高度-键盘高度
            const cursorBottom = cursorRect?.bottom || inputRect.bottom;  // 优先使用光标位置,自定义输入框没有光标,则使用input输入框的位置计算与键盘的间距
            if ((keyboardTop - cursorBottom) < this.data.cursorspacing) { // 间距低于指定距离时上推页面
              this.triggerEvent('pushup', { value: this.data.value });
              const scrollTop = (cursorBottom - keyboardTop) + (scrollOffset.scrollTop + this.data.cursorspacing);
              wx.pageScrollTo({
                scrollTop,
                duration: 300,
              });
            }
          });
      });
    },

    // 长按输入框提示粘贴文本
    onInputLongPress() { // eslint-disable-line require-jsdoc
      if (!this.data.showKeyboard || this.data.disablepaste) {
        return;
      }
      new Promise((resolve) => {  // 兼容2.10.2以下基础库
        wx.getClipboardData({
          complete: res => resolve(res),
        });
      }).then((res) => {
        const text = res?.data;
        if (/^[0-9]+$/.test(text)) {
          return new Promise((resolve) => {
            wx.showModal({
              title: '是否粘贴刚复制的内容?',
              content: text,
              showCancel: true,
              cancelText: '取消',
              confirmText: '确定',
              success: result => resolve({ result, text }),
            });
          });
        }
      })
        .then((res) => {
          if (res?.result.confirm) {
            const strArr = res.text.split('');
            for (let idx = 0, len = strArr.length; idx < len; idx++) {  // 优化for循环
              const item = strArr[idx];
              this.onInput(item);
            }
          }
        });
    },

    // 滑动蒙层失焦
    touchmoveBlur() { // eslint-disable-line require-jsdoc
      this.onInputBlur('mask');
    },

    // 阻止键盘滑动
    preventMove() { // eslint-disable-line require-jsdoc
      return;
    },
  },

  lifetimes: {
    ready() { // eslint-disable-line require-jsdoc
      if (!this.data.custom) {
        // 获取输入框右边界位置
        this.query = wx.createSelectorQuery().in(this);
        this.query.select('#input').boundingClientRect((res) => {
          this.inputOffset = res.right;
          this.query = {};
        })
          .exec();
      }
    },
  },
});
