/**
 * 车牌输入组件，用于输入车牌的场景
 * 输入属性为plate，组件内置车牌编辑键盘，用户关闭键盘时，会抛出 plate-change 事件，监听该事件可以处理具体业务逻辑
 * author: petegao@tencent.com
 */

const PlateInputOptions = {
  // 键盘初始化的timer计时
  timer: null,

  // 输入框个数
  fieldsNum: 8,

  // 键盘按键
  keyboards: {
    // 字母与数字键盘
    letter: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    ],

    // 车牌中文前缀键盘
    province: [
      ['京', '津', '渝', '沪', '冀', '晋', '辽', '吉', '黑', '苏'],
      ['浙', '皖', '闽', '赣', '鲁', '豫', '鄂', '湘', '粤', '琼'],
      ['川', '贵', '云', '陕', '甘', '青', '蒙', '桂', '宁', '新'],
      ['藏', '使', '领', '警', '学', '港', '澳'],
    ],
  },
};

Component({
  properties: {
    skin: { // 特定皮肤，支持的皮肤有：open-city - 开城活动
      type: String,
      value: '',
    },

    // 初始plate值
    plate: {
      type: String,
      value: '',
      observer(plate) { // eslint-disable-line require-jsdoc
        const prevPlate = this.data.fields.join('');
        if (plate === prevPlate) {
          return;
        }

        const validFields = plate
          .replace('·', '')
          .split('')
          .slice(0, 8);
        let fields;
        if (validFields.length < PlateInputOptions.fieldsNum) {
          fields = [...validFields, ...new Array(PlateInputOptions.fieldsNum - validFields.length)];
        } else {
          fields = validFields;
        }

        // 根据当前所填位数决定展示省份或字母键盘
        const keyboardType = validFields.length === 0 ? 'province' : 'letter';
        const showKeyboard = validFields.length < PlateInputOptions.fieldsNum - 1;

        this.setData({
          fields,
          keyboardType,
          activeField: showKeyboard ? validFields.length : -1,
          keyboard: PlateInputOptions.keyboards[keyboardType],
        });

        this.triggerEvent('keyboard-change', { showKeyboard });

        // 弹出键盘时稍作延时，防止与页面初始化展示时的突兀感受
        if (showKeyboard) {
          PlateInputOptions.timer = setTimeout(() => {
            this.setData({ showKeyboard });
            this.adjustFieldsPosition();
          }, 1000);
        } else {
          clearTimeout(PlateInputOptions.timer);
          this.setData({ showKeyboard });
        }
      },
    },
  },

  ready() { // eslint-disable-line require-jsdoc
    // 组件初始无plate属性传入的情况下，弹起键盘输入
    setTimeout(() => {
      if (this.data.activeField === null) {
        this.setData({ showKeyboard: true, activeField: 0 });
        this.adjustFieldsPosition();
      }
    }, 1000);
  },

  data: {
    fields: new Array(PlateInputOptions.fieldsNum),
    activeField: null,
    keyboard: PlateInputOptions.keyboards.province,
    showKeyboard: false,
    keyboardType: 'province',
    disabledKeys: [], // 被禁用的键
  },

  methods: {
    async asyncSetData(data) { // eslint-disable-line require-jsdoc
      await new Promise(resolve => this.setData(data, resolve));
    },

    // 键盘展示时，自动上推页面，防止在iPad等大屏上出现输入框与键盘重叠的问题
    async adjustFieldsPosition() { // eslint-disable-line require-jsdoc
      const query = this.createSelectorQuery();
      query.select('#plate-input-fields').boundingClientRect();
      query.selectViewport().scrollOffset();
      const [{ top }, { scrollTop: pageScrollTop }] = await new Promise(r => query.exec(r));
      wx.pageScrollTo({ scrollTop: pageScrollTop + top - 80 });
    },

    // 点击输入框
    onFieldTap(e) { // eslint-disable-line require-jsdoc
      const { index } = e.currentTarget.dataset;
      const keyboardType = index === 0 ? 'province' : 'letter';

      this.triggerEvent('keyboard-change', { showKeyboard: true });

      this.setData({
        activeField: index,
        showKeyboard: true,
        keyboard: PlateInputOptions.keyboards[keyboardType],
        keyboardType,
      });
      this.adjustFieldsPosition();
    },

    // 关闭键盘
    async closeKeyBoard() { // eslint-disable-line require-jsdoc
      this.triggerEvent('keyboard-change', { showKeyboard: false });

      await this.asyncSetData({
        showKeyboard: false,
        activeField: -1,
      });
      this.dispatchPlate();
    },

    // 点击键盘按键
    async onKeyTap(e) { // eslint-disable-line require-jsdoc
      const { key, disabled } = e.currentTarget.dataset;
      const { fields, activeField: prevField, keyboardType: prevKeyboardType } = this.data;

      // 点击被禁用的按键时不处理输入
      if (disabled) {
        return;
      }

      // 切换键盘类型
      if (key === 'type') {
        const keyboardType = this.data.keyboardType === 'province' ? 'letter' : 'province';
        await this.asyncSetData({
          keyboardType,
          keyboard: PlateInputOptions.keyboards[keyboardType],
        });
        return;
      }

      // 退格
      if (key === 'backspace') {
        let activeField;
        let keyboardType;
        if (fields[prevField]) { // 当前光标所在位置内容不为空
          fields[prevField] = ''; // 删除当前位置内容
          activeField = prevField; // 光标位置保持不变
          keyboardType = prevKeyboardType; // 键盘类型保持不变
        } else {
          activeField = prevField <= 0 ? 0 : prevField - 1; // 光标位置移动到前一位置
          fields[activeField] = ''; // 删除前一位置内容
          keyboardType = activeField === 0 ? 'province' : 'letter'; // 更新键盘类型
        }
        await this.asyncSetData({
          fields,
          activeField,
          keyboardType,
          keyboard: PlateInputOptions.keyboards[keyboardType],
        });
        return;
      }

      // 输入
      fields[prevField] = key;
      const activeField = prevField >= PlateInputOptions.fieldsNum - 1 ? prevField : prevField + 1;
      await this.asyncSetData({
        fields,
        activeField,
        keyboardType: 'letter',
        keyboard: PlateInputOptions.keyboards.letter,
      });
    },

    // 抛出车牌更改事件
    dispatchPlate() { // eslint-disable-line require-jsdoc
      const fields = [...this.data.fields];
      this.triggerEvent('plate-change', {
        prefix: fields.shift() || '',
        number: fields.join(''),
      });
    },
  },
});
