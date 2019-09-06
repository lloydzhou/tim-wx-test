//index.js
//获取应用实例
import WebimHandler from '../../utils/webimHandler'
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

    const that = this
    // 初始化webim
    const Config = {
      sdkappid: 1400167854,
      accountType: 36862,
      accountMode: 0,
    }
    WebimHandler.init({
      accountType: Config.accountType,
      sdkAppID: Config.sdkappid,
    })
    WebimHandler.sdkLogin({
      sdkAppID: Config.sdkappid,
      appIDAt3rd: Config.sdkappid,
      accountType: Config.accountType,
      identifier: '5ca1b45cc0b0ff00019d1fae',
      identifierNick: '张三',
      userSig: 'eJxFjl1PgzAYhf8LtxhtGeXDZBeVLdkHi9twEY0JKaWQSgoFinMs-nc7gvH2ec4573s1XsLonlBa95VK1EUy49EAxt2IecYqxXPOWg0RJTC1EaUgBXkOAIB*BnPCpiyRkmcJUcmszXR6ol1WJqPRCNq647gesifJviVvWUJyNR6wkG-p2Ul*sbbjdXXjACJozQD4l4qL258QOa6LgOP8LXa80Hi3PATrYPteDq-HJ2*x-jzRAg*03KCmiRBZyt7HwbHB8mI2cLBjzHFviuI5FHInogJ6Tnxe7bcxO72lzDqchbnYFCth1uHHw97E87nx8wsRKFxc',
    }, {
      onConnNotify: function(resp) {
        console.log(resp)
      },
      onMsgNotify: function(msg) {
        console.log(msg)
        that.setData({
          unread: that.data.unread + msg.length
        })
      },
    }, {
      isAccessFormalEnv: true,
      isLogOn: true,
    })
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
