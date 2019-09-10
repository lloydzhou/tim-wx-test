//index.js
import TIM from '../../tim-wx';
import NIM from '../../nim';

const app = getApp()

Page({
  data: {
    unread: 0,
    motto: 'Hello World',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  //事件处理函数
  bindViewTap: function() {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad: function () {
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse){
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }

    const im = new NIM({
      env: 'test', // env=dev/test/production
      platform: 'weapp',
      version: '3.7.0',
    })
    im.on('MESSAGE', msg => {
      const { messages=[], status={unread: 0} } = this.data;
      status.unread += 1
      messages.push(msg)
      console.log(msg)
      this.setData({ status, messages })
    })
    im.on('OPEN', e => {
      console.log('onOpen', e)
    })
    im.login({
      sessionID: '8a85c53f-38e7-4434-9673-9697fd2f5f26'
    })

    const that = this
    // 初始化webim
    let tim = TIM.create({
      SDKAppID: 1400167854
    });
    tim.setLogLevel(1);
    // 存储服务 SDK （以下简称 COS SDK）注册为插件，IM SDK 发送文件、图片等消
    // tim.registerPlugin({'cos-wx-sdk': COS}); // 微信小程序环境请取消本行注释，并注释掉 tim.registerPlugin({'cos-js-sdk': COS});

    // 监听事件，如：
    tim.on(TIM.EVENT.SDK_READY, function(event) {
      console.log('TIM.EVENT.SDK_READY', event)
      // 收到离线消息和会话列表同步完毕通知，接入侧可以调用 sendMessage 等需要鉴权的接口
      // event.name - TIM.EVENT.SDK_READY
    });
    
    tim.on(TIM.EVENT.MESSAGE_RECEIVED, function(event) {
      // 收到推送的新消息，可通过遍历 event.data 获取消息列表数据并渲染到页面
      // event.name - TIM.EVENT.MESSAGE_RECEIVED
      // event.data - 存储 Message 对象的数组 - [Message]
      console.log(event)
      that.setData({
        unread: that.data.unread + event.data.length
      })
    });
    
    tim.on(TIM.EVENT.CONVERSATION_LIST_UPDATED, function(event) {
      // 收到会话列表更新通知，可通过遍历 event.data 获取会话列表数据并渲染到页面
      // event.name - TIM.EVENT.CONVERSATION_LIST_UPDATED
      // event.data - 存储 Conversation 对象的数组 - [Conversation]
    });
    
    tim.on(TIM.EVENT.GROUP_LIST_UPDATED, function(event) {
      // 收到群组列表更新通知，可通过遍历 event.data 获取群组列表数据并渲染到页面
      // event.name - TIM.EVENT.GROUP_LIST_UPDATED
      // event.data - 存储 Group 对象的数组 - [Group]
    });
    
    tim.on(TIM.EVENT.GROUP_SYSTEM_NOTICE_RECERIVED, function(event) {
      // 收到新的群系统通知
      // event.name - TIM.EVENT.GROUP_SYSTEM_NOTICE_RECERIVED
      // event.data.type - 群系统通知的类型，详情请参见 GroupSystemNoticePayload 的 <a href="https://imsdk-1252463788.file.myqcloud.com/IM_DOC/Web/Message.html#.GroupSystemNoticePayload"> operationType 枚举值说明</a>
      // event.data.message - Message 对象，可将 event.data.message.content 渲染到到页面
    });
    
    tim.on(TIM.EVENT.PROFILE_UPDATED, function(event) {
      // 收到自己或好友的资料变更通知
      // event.name - TIM.EVENT.PROFILE_UPDATED
      // event.data - 存储 Profile 对象的数组 - [Profile]
    });
    
    tim.on(TIM.EVENT.BLACKLIST_UPDATED, function(event) {
      // 收到黑名单列表更新通知
      // event.name - TIM.EVENT.BLACKLIST_UPDATED
      // event.data - 存储 userID 的数组 - [userID]
    });
    
    tim.on(TIM.EVENT.ERROR, function(event) {
      // 收到 SDK 发生错误通知，可以获取错误码和错误信息
      // event.name - TIM.EVENT.ERROR
      // event.data.code - 错误码
      // event.data.message - 错误信息
    });
    
    tim.on(TIM.EVENT.SDK_NOT_READY, function(event) {
      // 收到 SDK 进入 not ready 状态通知，此时 SDK 无法正常工作
      // event.name - TIM.EVENT.SDK_NOT_READY
    });
    
    tim.on(TIM.EVENT.KICKED_OUT, function(event) {
      // 收到被踢下线通知
      // event.name - TIM.EVENT.KICKED_OUT
      // event.data.type - 被踢下线的原因，例如 TIM.TYPES.KICKED_OUT_MULT_ACCOUNT 多账号登录被踢
    });
    
    // 开始登录
    tim.login({
      userID: '5ca1b45cc0b0ff00019d1fae',
      userSig: 'eJxFjl1PgzAYhf8LtxhtGeXDZBeVLdkHi9twEY0JKaWQSgoFinMs-nc7gvH2ec4573s1XsLonlBa95VK1EUy49EAxt2IecYqxXPOWg0RJTC1EaUgBXkOAIB*BnPCpiyRkmcJUcmszXR6ol1WJqPRCNq647gesifJviVvWUJyNR6wkG-p2Ul*sbbjdXXjACJozQD4l4qL258QOa6LgOP8LXa80Hi3PATrYPteDq-HJ2*x-jzRAg*03KCmiRBZyt7HwbHB8mI2cLBjzHFviuI5FHInogJ6Tnxe7bcxO72lzDqchbnYFCth1uHHw97E87nx8wsRKFxc',
    });
  },
  getUserInfo: function(e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  }
})
