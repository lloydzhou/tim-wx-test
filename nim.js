
// 如果是微信小程序就注释掉这一段
// import wx from './websocket';


export class MessageElem {
  constructor(type, content) {
    this.MsgType = type
    this.MsgContent = content
  }
  static create(elem) {
    if (elem.MsgType == 'TIMTextElem') {
      return new TextMessageElem(elem.MsgContent.Text)
    }
    if (elem.MsgType == 'TIMCustomElem') {
      switch (elem.MsgContent.Desc) {
        case 'job_detail':
          return JobDetailMessageElem(JSON.parse(elem.MsgContent.Data))
        case 'basic_info':
          return BasicInfoMessageElem(JSON.parse(elem.MsgContent.Data))
        default:
          return new MessageElem(elem.MsgType, elem.MsgContent)
      }
    }
    return new MessageElem(elem.MsgType, elem.MsgContent)
  }
}

export class CustomMessageElem extends MessageElem {
  constructor(data, desc='', ext='') {
    super("TIMCustomElem", {
      Desc: desc,
      Data: data,
      Ext: ext,
    })
  }
  get description() {
    return this.MsgContent.Desc
  }
  get data() {
    return this.MsgContent.Data
  }
  get extension() {
    return this.MsgContent.Ext
  }
}

// 系统信息，新版的im系统每一个消息都需要包含一个这个部分
export class BasicInfoMessageElem extends MessageElem {
  constructor(info, ext='') {
    super("TIMCustomElem", {
      Desc: 'basic_info',
      Data: JSON.stringify(info),
      Ext: ext,
    })
  }
}

// 职位详情
export class JobDetailMessageElem extends MessageElem {
  constructor(job, ext='') {
    super("TIMCustomElem", {
      Desc: 'job_detail',
      Data: JSON.stringify(job),
      Ext: ext,
    })
  }
}

// 文本消息
export class TextMessageElem extends MessageElem {
  constructor(text) {
    super("TIMTextElem", {
      Text: text,
    })
  }
  get text() {
    return this.MsgContent.Text
  }
}

export class Message {
  constructor(From_Account, To_Account, MsgBody=[], MsgTime=null, MsgRandom=null, MsgSeq=null) {
    this.MsgBody = MsgBody
    this.From_Account = From_Account
    this.To_Account = To_Account
    this.MsgTime = MsgTime  || Date.now() / 1000 // TIM系统使用的是秒不是毫秒
    this.MsgRandom = MsgRandom || this.msg_random()
    this.MsgSeq = MsgSeq || this.msg_seq()
  }
  msg_random() {
    return Math.floor(Math.random() * 100000000)
  }
  msg_seq() {
    if (typeof Message.seq != 'number') {
      Message.seq = this.msg_random() // 这个地方使用一个随机数初始化，在TIM系统里面其实是后端生成的
    }
    return Message.seq += 1;
  }
  add(elem) { // MessageElem
    this.MsgBody.push(elem)
  }
  addElem(elem) { // MessageElem
    return this.add(elem)
  }
  toString() {
    return JSON.stringify({
      MsgBody: this.MsgBody,
      From_Account: this.From_Account,
      To_Account: this.To_Account,
      MsgTime: this.MsgTime,
      MsgRandom: this.MsgRandom,
      MsgSeq: this.MsgSeq,
    })
  }
}

// const started = Date.now()
// let delay = 0
export default class NchanIM {
  constructor(options) {
    const defaultOption = {
      retry: 100,
      host: 'https://im.quzhaopinapp.com',
    }
    options = {...defaultOption, ...options}
    if (options.env == 'dev') {
      options.host = location.origin
    }
    options.suburl = options.host.replace('http', 'ws') + '/sub'
    options.sendurl = options.host + '/send'
    this.options = options
    this.max_retry = options.retry
    this.retry = 0
    this.callbacks = {}
    // options.url = 'ws://localhost:8001/ws' // test
    // this.login()
  }
  // tim.login({userID: 'your userID', userSig: 'your userSig'});
  login(params) {
    /*
    params = {
      userID: 'xxxxx',  // 这个使用X-Carol-User-Id头信息发送
      sessionID: 'xxxx-xxxxx-xxx-xx',  // 使用X-Session-Id发送或者使用cookie.__sid__发送
      token: '<jwt-token>',
      userSig: '<jwt-token>'
    }
    */
    const options = this.options
    const header = { ...(options.header || {})}
    if (options.platform) {
      header['X-Platfrom'] = options.platform
    }
    if (options.version) {
      header['X-Version'] = options.version
    }
    if (options.env) {
      header['X-Env'] = options.env
    }
    if (params.sessionID) {
      // 小程序支持传递header参数
      header['X-Session-Id'] = params.sessionID
    }
    if (params.userID) {
      // 小程序支持传递header参数
      header['X-Carol-User-Id'] = params.userID
    }
    if (params.userSig || params.token) {
      const token = params.userSig || params.token;
      // 小程序支持传递header参数
      header['X-Toekn'] = token
    }
    // 返回一个promise和tim的保持一致
    return new Promise((resolve, reject) => {
      this.connect({
        url: options.suburl,
        header: header,
        success: function(res) {
          // console.log(res)
          resolve(res)
        },
        fail: function(res) {
          console.error(res)
          reject(res)
        },
        // complete: function(res) {
        //   console.log(res)
        // },
      }, options)
      this.initHandler(options)
    })
  }
  reconnect(params, options) {
    if (this.retry >= this.max_retry) {
      console.error("达到重试次数")
      this.trigger('error', new Error("达到重试次数"))
      return
    }
    this.retry += 1  // 重试次数
    const retry_delay = Math.pow(1.5, this.retry / 10) * 200;
    // console.error(Date.now() - started, 'retry', this.retry, 'retry_delay', retry_delay, delay+=retry_delay)
    // y = 1.5^(x/10) * 200
    this.sockettask.close()
    setTimeout(() => {
      this.connect(params, options)
      this.initHandler(options)
    }, retry_delay)
  }
  connect(params, options) {
    this.sockettask = wx.connectSocket(params);
    this.sockettask.onError((e) => {
      console.error(e)
      this.trigger('error', e)
    })
    this.sockettask.onClose((e) => {
      console.error(e)
      this.reconnect(params, options)
      this.trigger('close', e)
    })
  }
  sendMessage(message) {
    wx.request({
      url: this.options.sendurl,
      method: 'POST',
      body: JSON.stringify(message),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/json',
      },
      mode: 'cors',
      credentials: 'include',
      success: function(res) {
        console.log(res)
      },
      fail: function(err) {
        console.error(res)
      }
    })
  }
  initHandler(options) {
    this.sockettask.onOpen((e) => {
      this.retry = 0
      console.log('连接成功', e)
      this.trigger('open', e)
    })
    this.sockettask.onMessage((e) => {
      console.log(e)
      if (e.type === "message" || e.type == undefined) {
        const dataPromise = typeof e.data === "string"
          ? Promise.resolve(e.data)
          : e.data.text()
        // console.log(e, dataPromise)
        dataPromise.then(txt => {
          console.log(txt)
          try {
            const data = JSON.parse(txt)
            const MsgBody = data.MsgBody.map(elem => {
              return MessageElem.create(elem)
            })
            const message = new Message(
              data.From_Account,
              data.To_Account,
              MsgBody,
              data.MsgTime,
              data.MsgRandom,
              data.MsgSeq
            )
            this.trigger('message', message)
          } catch(e) {
            console.error("不能正常解析消息内容", e, txt)
          }
        })
      }
    })
  }
  on(events, fn) {
    if (typeof fn === "function") {
      events.toUpperCase().split(/[\s]+/).forEach((name, pos) => {
        (this.callbacks[name] = this.callbacks[name] || []).push(fn);
        fn.typed = pos > 0;
      });
    }
    return this;
  }
  off(events) {
    events.toUpperCase().split(/[^\s]+/).forEach((name) => {
      this.callbacks[name] = [];
    });
    if (events == "*") this.callbacks = {};
    return this;
  }
  one(name, fn) {
    if (fn) fn.one = true;
    return this.on(name, fn);
  }
  trigger(name, ...args) {
    name = name.toUpperCase()
    var fns = this.callbacks[name] || [];
    for (var i = 0, fn; (fn = fns[i]); ++i) {
      if (!fn.busy) {
        fn.busy = true;
        fn.apply(this, fn.typed ? [name].concat(args) : args);
        if (fn.one) { fns.splice(i, 1); i--; }
        fn.busy = false;
      }
    }
    return this;
  }
}


///////// 
/*
const message = new Message("lloyd", "zhou")
message.add(new TextMessageElem("hello world"))
message.add(new JobDetailMessageElem({
  id: '5d5b8e3c6d5ab600013b4c19',
  category_id: '5ceba8a30089c86970040589',
  user_id: '5d4ce4dbb18b790001326a5a',
  pre_share_id: '5d5b8e3d8909420001f6e077',
  name: 'name',
  telephone: '15391514349',
  duty: 'duty',
  description: 'description',
  city: 'city',
  district: 'district',
  address: 'address',
  job_type: 0,
  status: 0,
  virtual: 0,
  top: 0,
  period: 30,
  created: '刚刚',
  salary_start: 5000,
  salary_end: 7000,
  latitude: 30.507689,
  longitude: 114.39625,
  tag_list: [],
}))
message.add(new BasicInfoMessageElem({
  role: 1,
  to_role: -1,
  version: '3.7.0',
  platform: 'weapp',
  // env: 'test',
  env: 'production',
}))
console.log(message, message.toString())
console.log(message.MsgBody[0].text)
*/
