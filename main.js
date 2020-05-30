
/**
 * 获取当前时间戳
 * @returns {BigInteger}
 */
function getTimestamp() {
	return new Date().getTime() / 1000;
}

/**
 * 生成随机串
 */
function generateNonceStr() {
	var keyChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
	var strArr = [];
	for (var i = 0; i < 16; i += 1) {
		strArr.push(keyChars[Math.floor(Math.random() * 62)]);
	}
	return strArr.join('');
}

/**
 * 获取临时用户唯一key
 */
function getUserUniqueKey() {
	return md5(generateNonceStr() + getTimestamp()).toLocaleLowerCase();
}

/**
 * 基础参数拼接
 * @param {Object} args 额外参数
 */
function getRequestBasicParam(args){
	return 'plat=19&timestamp=' + getTimestamp() + '&ukey=' + getUserUniqueKey();
}

//worker网络请求
var RequestWorker = function () {
	var that = this;

	//worker对象
	that.worker = new Worker('./request.worker.js?v=20181225');

	//回调集合
	that.handleSet = {};

	//监听事件
	if (!that.worker.onmessage) {
		that.worker.onmessage = function (event) {
			//提取数据
			var data = event.data;
			var reverseId = data.reverseId;

			//对应的请求
			var handle = that.handleSet[reverseId];
			if (handle) {
				that.handleSet[handle] = undefined;
				handle(data, event);
			}
		};
	}

	//设置回调
	that.putHandle = function (reverseId, handle) {
		that.handleSet[reverseId] = handle;
	};

	//发送消息到worker
	that.post = function (options) {
		that.worker.postMessage(options);
	};

	//返回
	return that;
};
var requestWorker = RequestWorker();


//worker请求封装
function request(options) {

	//提取参数
	var path = options.path;
	var method = options.method;
	var data = options.data || {};
	var dataType = options.dataType;
	var complete = options.complete;
	var success = options.success;
	var fail = options.fail;

	var api_token = '';
	var api_ukey = '';
	var api_url = 'https://testapi.sosotec.com/';

	//补充数据
	if (api_token && api_token != '') {
		data.token = api_token;
	}
	if (api_ukey && api_ukey != '') {
		data.ukey = api_ukey;
	}

	//追加链接
	var url = api_url + path;
	var append = getRequestBasicParam();
	if (url.indexOf('?') > -1) {
		url = url + '&' + append;
	} else {
		url = url + '?' + append;
	}

	//唯一码
	var reverseId = new Date().getTime() + '' + parseInt(Math.random() * 1000, 10);

	//设置监听器
	requestWorker.putHandle(reverseId, function (data) {

		//提取数据
		var result = data.result;
		var error = data.error;

		//创建Error对象函数
		var buildError = function (name, message) {
			var e = new Error();
			e.name = name;
			e.message = message;
			return e;
		};

		//完成请求
		complete && complete(data);

		//出错了
		if (error != null) {
			fail && fail(buildError(error.name, error.message));
			return;
		}

		//判断返回值
		if (result.status != undefined && result.status != 200) {
			fail && fail(buildError('BusinessError', result.msg));
			return;
		}

		//成功回到
		success && success(result.data);
	});

	//发送消息到worker中（worker不能传递函数类型，清理掉）
	requestWorker.post({
		url: url,
		method: method,
		data: data,
		dataType: dataType,
		reverseId: reverseId
	});
}

var newOptions = {};
newOptions.path = 'api/v1/cmm/hot/products';
newOptions.method = 'GET';
newOptions.data = {sizs: 50};
newOptions.success = function (res) {
	// console.log(res);
	console.log(222)
};
newOptions.fail = function (res) {
	// console.error(res);
};
setInterval(function() {
	// request(newOptions);
},3000);
