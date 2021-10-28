
<!-- ### 插件跳转 web-view 方案 -->

#### TMSBridge

小程序提供给插件的扩展（Object 实例）。在插件内通过 requireMiniProgram() 引入。

#### TMSBridge.bind(Object object)

绑定当前调用域。小程序与插件相互独立，navigateTo 依赖当前调用域。

##### 参数
- wx

#### TMSBridge.navigateToMP(Object object)

从插件中跳转到小程序的指定页面。

##### 参数

- Object object

|属性|类型|必须|默认值|说明|
|--|--|--|--|--|
|page|String|是|无|需要跳转页面的名称|
|query|String|否|无|需要跳转页面的参数|
|message|function|否|无|用于页面的回传数据|
|complete|function|否|无|跳转成功后的回调函数|

- object.message 回调函数

- object.complete 回调函数

##### 示例代码

插件页面 js 文件
```javascript
Page({
  data: {},
  onLoad: function () {
    const { TMSBridge } = requireMiniProgram(); // 引入小程序扩展能力
    this.TMSBridge = TMSBridge.bind(wx);        // 绑定当前调用域
  },
  navToH5: function(e) {
    this.TMSBridge.navigateToMP({          // 跳转至小程序页面
      page: 'sinanCovidIndex',
      query: 'from=crgtHomePlugin',
    });
  },
});
```

#### TMSBridge.navigateToWebview(Object object)

插件跳转至H5某个页面。H5页面需要提前绑定业务域名。

##### 参数

- Object object

|属性|类型|必须|默认值|说明|
|--|--|--|--|--|
|url|String|是|无|请求的H5链接|
|message|function|否|无|web-view 向小程序 postMessage 时接收消息|
|complete|function|否|无|接口调用结束的回调函数（调用成功、失败都会执行）|

- object.message 回调函数
参数 Object data

|属性|类型|说明|
|--|--|--|
|data|array.`<any>`|多次 postMessage 的参数组成的数组|

##### 示例代码

插件页面 js 文件
```javascript
Page({
  data: {},
  onLoad: function () {
    const { TMSBridge } = requireMiniProgram(); // 引入小程序扩展能力
    this.TMSBridge = TMSBridge.bind(wx);        // 绑定当前调用域
  },
  navToH5: function(e) {
    this.TMSBridge.navigateToWebview({          // 跳转至H5页面
      url: 'https://tai.qq.com/test.html',
      message: ({ data }) => {
        // console.log('on postMessage:', data)
      },
    });
  },
});
```

#### TMSBridge.navigateToPlugin(Object object)

插件跳转至另一个插件页面。

##### 参数

- Object object

|属性|类型|必须|默认值|说明|
|--|--|--|--|--|
|appId|String|是|无|跳转的目标插件appId|
|url|String|是|无|跳转的目标页面和参数|
|complete|function|否|无|接口调用结束的回调函数（调用成功、失败都会执行）|

##### 示例代码

插件页面 js 文件
```javascript
Page({
  data: {},
  onLoad: function () {
    const { TMSBridge } = requireMiniProgram(); // 引入小程序扩展能力
    this.TMSBridge = TMSBridge.bind(wx);        // 绑定当前调用域
  },
  navToPlugin: function(e) {
    this.TMSBridge.navigateToPlugin({          // 跳转至目标插件页面
      appId: 'wxxxx',
      url: '/inde?a=1&b=2',
    });
  },
});
```

#### TMSBridge.chooseAddress(Object object)

插件调用主程序获取地址信息。

##### 参数

- Object object

|属性|类型|必须|默认值|说明|
|--|--|--|--|--|
|complete|function|是|无|接口调用结束的回调函数（包含返回数据）|

- object.complete 回调函数

|属性|类型|说明|
|--|--|--|--|--|
|name|string|收货人姓名|
|adCode|string|邮编|
|address|string|详细收货地址信息|
|phone|string|收货人手机号码|
|region|array.`<string>`|行政区划信息（如：["广东省", "深圳市", "南山区"]）|
|errMsg|string|错误信息（成功时为空字符串）|


##### 示例代码
插件页面 js 文件
```javascript
Page({
  data: {},
  onLoad: function () {
    const { TMSBridge } = requireMiniProgram(); // 引入小程序扩展能力
    this.TMSBridge = TMSBridge.bind(wx);        // 绑定当前调用域
  },
  tapAddress: function(e) {
    this.TMSBridge.chooseAddress({              // 获取地址信息
      complete: (res) => {
        // console.log("address", res);
        // {"errMsg":"","name":"张三","phone":"13800138000",
        // "adCode":"100180","region":["北京市","北京市","海淀区"],"address":"西北旺东路9号院"}
      },
    });
  },
});
```


#### TMSBridge.choosePassenger(Object object)

插件调用主程序获取出行人信息。

##### 参数

- Object object

|属性|类型|必须|默认值|说明|
|--|--|--|--|--|
|picktype|string|否|single|选择方式：选择单个人 single， 选择多个人 multiple|
|complete|function|是|无|接口调用结束的回调函数（包含返回数据）|

- object.complete 回调函数

|属性|类型|说明|
|--|--|--|--|--|
|list|array.`<object>`|选中的出行人列表|

- Object list

|属性|类型|说明|
|--|--|--|--|--|
|name|string|姓名|
|pinyin|array.`<string>`|名字拼音（如：["ZHANG", "SAN"]）|
|idnumber|string|身份证号|
|mobile|string|手机号，格式：国别码-电话号|

##### 示例代码
插件页面 js 文件
```javascript
Page({
  data: {},
  onLoad: function () {
    const { TMSBridge } = requireMiniProgram(); // 引入小程序扩展能力
    this.TMSBridge = TMSBridge.bind(wx);        // 绑定当前调用域
  },
  tapInput: function(e) {
    this.TMSBridge.choosePassenger({              // 获取出行人信息
      complete: ({ list }) => {
        // console.log("passenger", list);
        // [{"name":"张三","pinyin":["ZHANG","SAN"],"mobile":"86-13813881388","idnumber":"450702198809168886"}]
      },
    });
  },
});
```