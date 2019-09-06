import DataProvider from './dataProvider'
import webim from './webim_wx';
// import dva from '../utils/dva'

let _that;
class WebimHandler_ extends DataProvider {

  constructor(service, result='data', size=20) {
    super(service, result, size)
    this.selToID = null
    this.accountType = null
    this.sdkAppID = null
    this.selType = null
    this.selSess = null
    this.selSessHeadUrl = null
    this.loginInfo = null
    this.listeners = null
    this.options = null
    this.hasLogined = false
    _that = this
    this.unread = 0
  }

  init(opts) {
    this.accountType = opts.accountType === undefined ? this.accountType : opts.accountType;
    this.sdkAppID = opts.sdkAppID === undefined ? this.sdkAppID : opts.sdkAppID;
    this.selType = opts.selType === undefined ? this.selType : opts.selType;
    this.selToID = opts.selToID === undefined ? this.selToID : opts.selToID;
    this.selSess = opts.selSess === undefined ? this.selSess : opts.selSess;
  }

  //sdk登录
  sdkLogin(loginInfo_o, listeners_o, options_o) {
    if(!this.loginInfo) {
      this.loginInfo = loginInfo_o
      this.listeners = listeners_o
      this.options = options_o
    }
    const that = this
    //web sdk 登录
    return new Promise((resolve, reject) => {
      webim.login(that.loginInfo, that.listeners, that.options,
        function (resp) {
          that.hasLogined = true
          webim.Log.info('webim登录成功');
          that.setProfilePortrait({
            'ProfileItem': [{
              "Tag": "Tag_Profile_IM_Nick",
              "Value": that.loginInfo.identifierNick
            }]
          })
          resolve(resp)
        },
        function (err) {
          console.error(err.ErrorInfo);
          reject(err)
        }
      );
    })
  }
  // 登出
  logout() {
    return webim.logout(() => {
      this.hasLogined = false
    })
  }
  //修改昵称
  setProfilePortrait(options, callback) {
    webim.setProfilePortrait(options,
      function (res) {
        webim.Log.info('修改昵称成功');
        callback && callback();
      },
      function () {

      }
    );
  }
  showMsg(msg) {
    var fromAccount, fromAccountNick, time, content;

    fromAccount = msg.getFromAccount();
    time = msg.getTime()

    if (!fromAccount) {
      fromAccount = '';
    }
    fromAccountNick = msg.getFromAccountNick();
    if (!fromAccountNick) {
      fromAccountNick = '未知用户';
    }
    content = msg.getElems()

    var opts = {
      'To_Account': fromAccount, //好友帐号
      'LastedMsgTime': time //消息时间戳
    };
    webim.c2CMsgReaded(opts);

    return {
      fromAccount: fromAccount,
      fromAccountNick: fromAccountNick,
      content: content,
      time
    }
  }

  //监听新消息(私聊(包括普通消息、全员推送消息)，普通群(非直播聊天室)消息)事件
  //newMsgList 为新消息数组，结构为[Msg]
  onMsgNotify(newMsgList) {
    var sess, newMsg;
    //获取所有聊天会话
    var sessMap = webim.MsgStore.sessMap();
    // const dispatch = dva.getDispatch();

    for (var j in newMsgList) {//遍历新消息
      newMsg = newMsgList[j];
      let user_id = newMsg.getSession().id()
      if (user_id == _that.selToID) {//为当前聊天对象的消息
        _that.selSess = newMsg.getSession();
        //在聊天窗体中新增一条消息
        let msg = _that.showMsg(newMsg)
        dispatch({ type: 'b_message/addMessage', msg }) // 将消息显示到聊天页面中
        _that.sendMsgCallback(newMsg, user_id)

      } else {
        _that.sendMsgCallback(newMsg, user_id)
        // 不是当前聊天的用户发消息回来，设置全局的unread
        _that.unread = _that.unread + 1
      }
    }
    //消息已读上报，以及设置会话自动已读标记
    // webim.setAutoRead(selSess, true, true);

    for (var i in sessMap) {
      sess = sessMap[i];
      if (_that.selToID != sess.id()) {//更新其他聊天对象的未读消息数
        // updateSessDiv(sess.type(), sess.id(), sess.unread());
      }
    }
  }


  checkMsg(data, callback) {
    return new Promise((resolve) => {
      if (!this.loginInfo.identifier) { //未登录
        return;
      }

      if (!this.selToID) {
        console.error("您还没有选中好友");
        return;
      }
      //获取消息内容
      let msgtosend = data;
      let msgLen = webim.Tool.getStrBytes(data);

      if (msgtosend.length < 1) {
        console.error("发送的消息不能为空!");
        return;
      }

      let maxLen, errInfo;
      if (this.selType == webim.SESSION_TYPE.GROUP) {
        maxLen = webim.MSG_MAX_LENGTH.GROUP;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
      } else {
        maxLen = webim.MSG_MAX_LENGTH.C2C;
        errInfo = "消息长度超出限制(最多" + Math.round(maxLen / 3) + "汉字)";
      }
      if (msgLen > maxLen) {
        console.error(errInfo);
        return;
      }

      if (!this.selSess) {
        this.selSess = new webim.Session(this.selType, this.selToID, this.selToID, this.selSessHeadUrl, Math.round(new Date().getTime() / 1000));
      }
      let isSend = true;//是否为自己发送
      let seq = -1;//消息序列，-1表示sdk自动生成，用于去重
      let random = Math.round(Math.random() * 4294967296);//消息随机数，用于去重
      let msgTime = Math.round(new Date().getTime() / 1000);//消息时间戳
      let subType = webim.C2C_MSG_SUB_TYPE.COMMON;//消息子类型 //c2c普通消息

      let msg = new webim.Msg(this.selSess, isSend, seq, random, msgTime, this.loginInfo.identifier, subType, this.loginInfo.identifierNick);

      resolve(msg)
    })
  }
  //发送消息(普通消息)
  onSendMsg(_msg, callback) {
    const that = this
    let msgtosend = _msg;
    this.checkMsg(_msg).then(msg => {
      //解析文本和表情
      var expr = /\[[^[\]]{1,3}\]/mg;

      var emotions = msgtosend.match(expr);
      var text_obj, face_obj, tmsg, emotionIndex, emotion, restMsgIndex;
      if (!emotions || emotions.length < 1) {
        text_obj = new webim.Msg.Elem.Text(msgtosend);
        msg.addText(text_obj);
      } else {//有表情

        for (var i = 0; i < emotions.length; i++) {
          tmsg = msgtosend.substring(0, msgtosend.indexOf(emotions[i]));
          if (tmsg) {
            text_obj = new webim.Msg.Elem.Text(tmsg);
            msg.addText(text_obj);
          }
          emotionIndex = webim.EmotionDataIndexs[emotions[i]];
          emotion = webim.Emotions[emotionIndex];
          if (emotion) {
            face_obj = new webim.Msg.Elem.Face(emotionIndex, emotions[i]);
            msg.addFace(face_obj);
          } else {
            text_obj = new webim.Msg.Elem.Text(emotions[i]);
            msg.addText(text_obj);
          }
          restMsgIndex = msgtosend.indexOf(emotions[i]) + emotions[i].length;
          msgtosend = msgtosend.substring(restMsgIndex);
        }
        if (msgtosend) {
          text_obj = new webim.Msg.Elem.Text(msgtosend);
          msg.addText(text_obj);
        }
      }
      webim.sendMsg(msg, function (resp) {
        if (that.selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
          callback && callback(that.showMsg(msg));
          that.sendMsgCallback(msg, that.selToID)
        }
        webim.Log.info("发消息成功");
      }, function (err) {
        webim.Log.error("发消息失败:" + err.ErrorInfo);
        console.error("发消息失败:" + err.ErrorInfo);
      });

    })

  }

  getDialogPageAndIndex(user_id) {
    for (let page = 1; page <= this.page; page++) {
      for (let index = 0; index < this.data[page].length; index++) {
        if (this.data[page][index].user.id == user_id) {
          return { page, index }
        }
      }
    }
    return {page: -1, index: -1}
  }

  sendMsgCallback(msg, user_id) {
    const { page, index } = this.getDialogPageAndIndex(user_id)
    if (page > 0 && index >= 0) {
      if (page == 1 && index <= 1) {
        console.log('当前用户已经是最近的，不用更换顺序, 仅替换内容')
        const user = this.data[page][index].user
        const unread_message_count = user_id == _that.selToID ? 0 : this.data[page][index].unread_message_count + 1
        this.updateDialog(user, msg, unread_message_count, index)
      } else {
        // 将用户从列表更换到最上面（趣小妹后面）
        const dialog = (this.data[page] || []).splice(index, 1); // 将原对话截取删除（updateDialog会加到趣小妹后面）
        const user = dialog[0].user
        const unread_message_count =  user_id == _that.selToID ? 0 : dialog[0].unread_message_count + 1
        this.updateDialog(user, msg, unread_message_count)
      }
    } else {
      // console.log('找不到对应的用户', user_id)
      getUserSummary(user_id).then(({code, user}) => {
        if (code === 0) {
          this.updateDialog(user, msg, 1) // TODO 找不到的时候先暂时认为有一条新消息
        }
      })
    }
  }

  updateDialog(user, msg, unread_message_count, index){
    // const dispatch = dva.getDispatch();
    // dispatch({ type: 'b_job/calculateInviteMsg' })  // 消息计数
    if (user) {
      let elems = msg.elems.slice()
      let content = elems.map(c => {
        Object.keys(c.content).map(k => {
          c.content[k.substring(0, 1).toUpperCase() + k.substring(1)] = c.content[k];
        })
        return {
          MsgContent: c.content,
          MsgType: c.type,
        }
      })
      let sendMsg = {
        created: '刚刚',
        modified: '刚刚',
        _created: msg.time,
        content,
        user_id: msg.fromAccount,
      }
      const diolog = {
        user,
        unread_message_count,
        recent_message: sendMsg,
      }
      if (index !== undefined) { // 更新聊天
        this.data[1][index] = diolog
      } else {
        // 后端同时推三条消息过来会在消息列表添加多个对话，所以这里插入之前在判断列表是否存在
        const { page, index: _index } = this.getDialogPageAndIndex(user.id)
        if (page > 0 && _index >= 0) {
          this.data[page][_index] = diolog
        } else {
          (this.data[1] || []).splice(1, 0, diolog); // 插入到客服后面
        }
      }
      // const dispatch = dva.getDispatch();
      // dispatch({ type: 'b_message/refreshDialog' })
    }
  }

  sendCustomMsg(MsgContent, callback) {
    let { data, desc, ext } = MsgContent
    const that = this
    this.checkMsg(data).then(msg => {
      var custom_obj = new webim.Msg.Elem.Custom(data, desc, ext);
      msg.addCustom(custom_obj);
      //调用发送消息接口
      webim.sendMsg(msg, function (resp) {
        if (that.selType == webim.SESSION_TYPE.C2C) {//私聊时，在聊天窗口手动添加一条发的消息，群聊时，长轮询接口会返回自己发的消息
          callback && callback(that.showMsg(msg));
          that.sendMsgCallback(msg, that.selToID)
        }
      }, function (err) {
        console.error("发消息失败:" + err.ErrorInfo);
      });
    })

  }

  fetchData() {
    return super.fetchData().then(data => {
      const { res } = data;
      if (res && res.unread) {
        this.unread = res.unread
      }
      return data
    })
  }

  setUnreadMessageCount(user_id, unread_message_count) {
    const { page, index } = this.getDialogPageAndIndex(user_id)
    if (page > 0 && index > -1) {
      const item = this.data[page][index]
      if (item && item.recent_message) {
        // 有做标记已读操作的时候，将this.unread设置为0，
        // 这个时候依赖消息列表里面的unread_message_count累加来判断总的未读状态
        if (unread_message_count == 0) {
          this.unread = 0
        }
        item.unread_message_count = unread_message_count
        // const dispatch = dva.getDispatch();
        // dispatch({ type: 'b_message/refreshDialog' })
      }
    }
  }

  getUnread() {
    // 检查每一项的unread_message_count
    return this.unread > 0 ? this.unread: this.getData().reduce((s, a) => {
      return s + (a.unread_message_count || 0)
    }, 0)
  }

}

const getDialog = () => {
  return Promise((resolve) => {
    resolve({
      code: 0,
      dialogs: [],
      msg: 'success',
    })
  })
}

const WebimHandler = new WebimHandler_(getDialog, 'dialogs', 10)

export default WebimHandler;

