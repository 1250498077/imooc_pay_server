let express = require('express');
let request = require('request');
let cache = require('memory-cache');
let config = require('./config')
let common = require('./../common/index')
let util = require('./../../util/util')
let createHash = require('create-hash')
let router = express.Router();
let dao = require('./../common/db')
config = config.wx;
router.get('/test',function (req,res) {
  res.json({
    code:0,
    data:'test',
    message:''
  })
})
// 用户授权重定向
router.get('/redirect',function (req,res) {
  let redirectUrl = req.query.url, scope = req.query.scope, callback = 'http://m.51purse.com/api/wechat/getOpenId';
  cache.put('redirectUrl', redirectUrl);
  let authorizeUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${config.appId}&redirect_uri=${callback}&response_type=code&scope=${scope}&state=STATE#wechat_redirect`;
  res.redirect(authorizeUrl);
})

// 根据code获取用户的OpenId
router.get('/getOpenId',async function(req,res){
  let code = req.query.code;
  console.log("code:"+code);
  if(!code){
    res.json(util.handleFail('当前未获取到授权code码'));
  }else{
    let result = await common.getAccessToken(code);
    if(result.code == 0){
      let data = result.data;
      let expire_time = 1000 * 60 * 60 * 2;
      cache.put('access_token', data.access_token, expire_time);
      cache.put('openId', data.openid, expire_time);
      res.cookie('openId', data.openid, { maxAge: expire_time });
      let openId = data.openid;
      let userRes = await dao.query({ 'openid': openId },'users');
      if (userRes.code == 0){
        if (userRes.data.length>0){
          let redirectUrl = cache.get('redirectUrl');
          res.redirect(redirectUrl);
        }else{
          let userData = await common.getUserInfo(data.access_token, openId);
          let insertData = await dao.insert(userData.data,'users');
          if (insertData.code == 0){
            let redirectUrl = cache.get('redirectUrl');
            res.redirect(redirectUrl);
          }else{
            res.json(insertData);
          }
        }
      }else{
        res.json(userRes);
      }
    }else{
      res.json(result);
    }
  }
})
router.get('/getUserInfo',async function(req,res){
  let access_token = cache.get('access_token'), openId = cache.get('openId');
  let result = await common.getUserInfo(access_token, openId);
  res.json(result);
})
router.get('/jssdk',async function(req,res){
  let url = req.query.url;
  let result = await common.getToken();
  if (result.code == 0){
    let token = result.data.access_token;
    cache.put('token', token);
    let result2 = await common.getTicket(token);
    if (result2.code == 0){
      let data = result2.data;
      let params = {
        noncestr:util.createNonceStr(),
        jsapi_ticket: data.ticket,
        timestamp:util.createTimeStamp(),
        url
      }
      let str = util.raw(params);
      console.log('str:::' + JSON.stringify(params))
      let sign = createHash('sha1').update(str).digest('hex');
      res.json(util.handleSuc({
        appId: config.appId, // 必填，公众号的唯一标识
        timestamp: params.timestamp, // 必填，生成签名的时间戳
        nonceStr: params.noncestr, // 必填，生成签名的随机串
        signature: sign,// 必填，签名
        jsApiList: [
          'updateAppMessageShareData',
          'updateTimelineShareData',
          'onMenuShareTimeline',
          'onMenuShareAppMessage',
          'onMenuShareQQ',
          'onMenuShareQZone',
          'chooseWXPay'
        ] // 必填，需要使用的JS接口列表
      }))
    } else {
      res.json(result2);
    }
  }else{
    res.json(result);
  }
})
// 微信支付
router.get('/pay/payWallet', function (req, res) {
  let openId = req.cookies.openId;
  let appId = config.appId;
  // 商品简单描述
  let body = "欢迎学习慕课首门支付专项课程。";
  // 如果是post请求，则用req.body获取参数
  let total_fee = req.query.money;
  // 微信支付成功回调地址，用于保存用户支付订单信息
  let notify_url = "http://m.51purse.com/api/wechat/pay/callback";
  // 通过微信支付认证的商户ID
  let mch_id = config.mch_id;
  // 附加数据
  let attach = "微信支付课程体验";
  // 调用微信支付API的机器IP
  let ip = '123.57.2.144';
  // 封装好的微信下单接口
  wxpay.order(appId, attach, body, mch_id, openId, total_fee, notify_url, ip).then(function (result) {
    res.json(util.handleSuc(result));
  }).catch((result) => {
    res.json(util.handleFail(result));
  })
})
/**
 * 此接口主要用于支付成功后的回掉，用于统计数据
 * 此处需要再app.js中设置请求头的接收数据格式
 */
router.post('/pay/callback', function (req, res) {
  xml.parseString(req.rawBody.toString('utf-8'), async (error, xmlData) => {
    if (error) {
      logger.error(error);
      res.send('fail')
      return;
    }
    let data = xmlData.xml;
    let order = {
      openId: data.openid[0],
      totalFee: data.total_fee[0],
      isSubscribe: data.is_subscribe[0],
      orderId: data.out_trade_no[0],
      transactionId: data.transaction_id[0],
      tradeType: data.trade_type[0],
      timeEnd: data.time_end[0]
    }
    // 插入订单数据
    let result = await dao.insert(order, 'orders');
    if (result.code == 0) {
      // 向微信发送成功数据
      let data = '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>';
      res.send(data);
    } else {
      res.send('FAIl');
    }
  });
})
module.exports = router;
