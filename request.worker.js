//处理函数
function handler(options) {
    //参数检查
    if (typeof options !== 'object') {
        throw new Error('Invalid options!');
    }
    if (!options.url) {
        throw new Error('Invalid options.url!');
    }

    //创建xhr对象
    var xhr = new XMLHttpRequest();

    //处理参数
    var url = options.url;
    var method = options.method ? options.method.toUpperCase() : 'GET';
    var data = options.data;
    var dataType = options.dataType || 'json';

    //&符号的连接键值对
    var sendData = data;
    if (typeof data === 'object') {
        var kvArray = [];
        for (var key in data) {
            if (!data.hasOwnProperty(key)) {
                continue;
            }
            var value = data[key];
            if (value === undefined || value === null) {
                value = '';
            }

            //如果是数组，多重组装（变成key[]=value格式）
            if (Array.isArray(value) || value instanceof Array) {
                value.forEach(function (item) {
                    kvArray.push(key + '[]=' + item);
                });
            } else {
                kvArray.push(key + '=' + value);
            }
        }
        sendData = kvArray.join('&');
    }

    //GET方式请求，sendData补充到url后面
    if (method === 'GET') {
        url += url.indexOf('?') > -1 ? ('&' + sendData) : ('?' + sendData);
        sendData = null;
    }

    //监听事件
    xhr.onreadystatechange = function () {
        //xhr未取回数据
        if (xhr.readyState !== 4) {
            return;
        }

        //如果没有reverseId，没必要回调message
        if (!options.reverseId) {
            return;
        }

        //注：worker不能传递Error对象，处理成json对象（注：会丢失错误栈等信息）
        var result, error = null;
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 304) {
            result = xhr.responseText;
            if (xhr.responseType === 'arraybuffer' || xhr.responseType === 'blob') {
                result = xhr.response;
            } else if (dataType === 'json') {
                try {
                    result = JSON.parse(result);
                } catch (e) {
                    error = {name: e.name, message: e.message};
                }
            } else if (dataType === "xml") {
                result = xhr.responseXML;
            }

        } else {
            error = {name: 'WorkerRequestError', message: xhr.statusText || 'error'};
        }

        //返回数据
        postMessage({
            reverseId: options.reverseId,
            result: error ? null : result,
            error: error
        });
    };

    //打开xhr（worker中不需要用异步方式）
    xhr.open(method, url, false);

    //设置请求头
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    method === 'POST' && xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    //开始发送
    xhr.send(sendData);

    //清理内存
    xhr = null;
}

//监听事件
onmessage = function (event) {
    handler(event.data);
};
