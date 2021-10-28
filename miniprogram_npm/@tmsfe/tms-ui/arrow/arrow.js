const DEFAULT = {
  color: '#ccc',
  size: '20rpx',
  width: '3rpx',
  direction: 'right',
};

Component({
  properties: {
    color: {
      type: String,
      value: DEFAULT.color,
    },

    size: {
      type: String,
      value: DEFAULT.size,
    },

    width: {
      type: String,
      value: DEFAULT.width,
    },

    direction: {
      type: String,
      value: DEFAULT.direction, // 可选值 top/right/bottom/left
    },
  },
});
